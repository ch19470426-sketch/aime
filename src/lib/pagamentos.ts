// src/lib/pagamentos.ts
// AIMÊ — Liberação de créditos a partir de uma cobrança do Asaas. É o MESMO caminho para o
// webhook (o Asaas avisa) e para a conferência (/api/creditos/conferir-pagamento: o AIMÊ
// pergunta ao Asaas quando o usuário diz "já paguei"), então a liberação não depende de o aviso
// chegar a tempo. Em 06/10/2026 um pagamento PIX confirmado no Asaas deixou a tela esperando
// enquanto o aviso não chegava (Celso).
//
// SEGURANÇA (esta função concede créditos; cuidado redobrado):
//   1. Verificação em DOBRO: a cobrança é consultada DIRETO na API do Asaas, nunca se confia no
//      corpo do webhook nem no pedido do navegador.
//   2. Reserva ATÔMICA: o pedido só vira 'pago' para UM processamento (update condicional em
//      status='aguardando_pagamento'); webhook e conferência simultâneos não somam crédito duas
//      vezes. Se a concessão falhar, a reserva é desfeita para uma nova tentativa.
//   3. Idempotência: pedido já 'pago' não concede nada de novo.
//   4. Cobrança de assinatura (criada pelo próprio Asaas) ganha o pedido do mês na hora; o índice
//      único por asaas_payment_id protege contra eventos simultâneos.

import { createClient } from '@supabase/supabase-js'
import { consultarCobranca, consultarAssinatura, cancelarAssinaturaNoAsaas, ambienteAsaas, STATUS_PAGO } from '@/lib/asaas'
import { concederCreditos, revogarCreditos, PLANO_CR } from '@/lib/creditos'
import { bloquearConta, avisarSuporte, LIMITE_FALHAS_CARTAO } from '@/lib/bloqueio'
import { avisarInspetor, dataBR, somarUmMes } from '@/lib/assinaturas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ResultadoCobranca = { status: number; corpo: Record<string, unknown> }
const ok = (corpo: Record<string, unknown> = {}): ResultadoCobranca => ({ status: 200, corpo: { ok: true, ...corpo } })
const naoEncontrada = (e: unknown) => /n[ãa]o encontrad|not found|404/i.test(e instanceof Error ? e.message : String(e))

/** Status da cobrança no Asaas que significam estorno concluído / chargeback / estorno em andamento. */
const STATUS_ESTORNADO = new Set(['REFUNDED'])
const STATUS_CHARGEBACK = new Set(['CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL'])
const STATUS_ESTORNO_EM_ANDAMENTO = new Set(['REFUND_REQUESTED', 'REFUND_IN_PROGRESS'])

/**
 * Lê a lista de estornos (`refunds`) que o Asaas devolve na cobrança. No sandbox, um estorno TOTAL de PIX
 * aparece nos detalhes com a cobrança ainda no status RECEIVED; por isso o status sozinho não basta.
 *  - total: a soma dos estornos CONCLUÍDOS (DONE) cobre o valor da cobrança;
 *  - parcial: há estorno concluído, mas menor que o valor;
 *  - andamento: há estorno pedido, ainda não concluído;
 *  - nenhum: sem estorno válido (cancelados/recusados não contam).
 * `resumo` mostra o que o Asaas informou, para o gestor conferir.
 */
export function situacaoDeEstorno(cob: any): { tipo: 'total' | 'parcial' | 'andamento' | 'nenhum'; resumo: string } {
  const lista: any[] = Array.isArray(cob?.refunds) ? cob.refunds : []
  const status = (r: any) => String(r?.status ?? '').toUpperCase()
  const invalidos = ['CANCELLED', 'CANCELED', 'FAILED', 'DENIED', 'REFUSED']
  const validos = lista.filter(r => !invalidos.includes(status(r)))
  const concluidos = validos.filter(r => ['DONE', 'COMPLETED', 'REFUNDED'].includes(status(r)))
  const soma = concluidos.reduce((s, r) => s + Number(r?.value ?? 0), 0)
  const valor = Number(cob?.value ?? 0)
  // Se a lista `refunds` não existir, mostra qualquer outro campo de estorno que o Asaas tenha informado
  // (para o gestor ver o dado real e não depender de suposição sobre o formato).
  const outros = lista.length > 0 ? '' : Object.entries(cob ?? {})
    .filter(([k, v]) => /refund|estorn/i.test(k) && v != null && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 60)}`).join(', ')
  const resumo = lista.length === 0 ? (outros ? `campos de estorno informados pelo Asaas: ${outros}` : '') : `${lista.length} estorno(s) no Asaas: ${lista.map(r => `${status(r) || '?'} R$ ${Number(r?.value ?? 0).toFixed(2)}`).join(', ')}; cobrança de R$ ${valor.toFixed(2)}`
  if (valor > 0 && soma + 0.005 >= valor) return { tipo: 'total', resumo }
  if (soma > 0) return { tipo: 'parcial', resumo }
  if (validos.length > 0) return { tipo: 'andamento', resumo }
  return { tipo: 'nenhum', resumo }
}

/** Encerra a assinatura (Asaas e base) para parar novas cobranças. Melhor esforço no Asaas. */
async function encerrarAssinaturaPorBloqueio(assinaturaId: number): Promise<void> {
  const { data: ass } = await supabase.from('assinaturas')
    .select('id,status,asaas_subscription_id').eq('id', assinaturaId).maybeSingle()
  if (!ass || ass.status === 'cancelada') return
  if (ass.asaas_subscription_id) {
    try { await cancelarAssinaturaNoAsaas(ass.asaas_subscription_id) } catch (e) {
      if (!naoEncontrada(e)) console.error('[pagamentos] não consegui cancelar a assinatura no Asaas:', e)
    }
  }
  await supabase.from('assinaturas').update({ status: 'cancelada', cancelada_em: new Date().toISOString() }).eq('id', ass.id)
  await supabase.from('pedidos_credito').update({ status: 'cancelado' }).eq('assinatura_id', ass.id).eq('status', 'aguardando_pagamento')
}

/**
 * Cobrança de assinatura vencida/recusada. Conta as falhas SEGUIDAS (por id de cobrança: o mesmo
 * pagamento gera "recusado" e depois "vencido" e conta uma vez só; um pagamento confirmado zera a
 * contagem): 1ª e 2ª avisam; na 3ª a assinatura é encerrada e a conta é BLOQUEADA (decisão de Celso,
 * 07/10/2026).
 */
async function marcarInadimplente(pedido: any, invoiceUrl: string | undefined, paymentId: string): Promise<void> {
  const { data: ass, error: erroAss } = await supabase.from('assinaturas')
    .select('id,status,falhas_payment_ids').eq('id', pedido.assinatura_id).maybeSingle()
  // Erro de leitura (ex.: coluna falhas_payment_ids ainda não criada) não pode passar como "assinatura sem
  // problema": lança, o webhook responde 500 e o Asaas reentrega.
  if (erroAss) throw new Error(`não consegui ler a assinatura: ${erroAss.message}`)
  // Se for a PRIMEIRA cobrança que falhou, a assinatura ainda nem começou: o inspetor pode tentar de novo pelo link.
  if (!ass || !['ativa', 'inadimplente'].includes(ass.status)) return
  const falhas: string[] = Array.isArray(ass.falhas_payment_ids) ? ass.falhas_payment_ids : []
  if (falhas.includes(paymentId)) return   // a mesma cobrança já foi contada
  const novas = [...falhas, paymentId]
  const { error: erroFalha } = await supabase.from('assinaturas').update({ status: 'inadimplente', falhas_payment_ids: novas })
    .eq('id', ass.id).in('status', ['ativa', 'inadimplente'])
  if (erroFalha) throw new Error(`não consegui registrar a falha de pagamento: ${erroFalha.message}`)

  if (novas.length >= LIMITE_FALHAS_CARTAO) {
    await encerrarAssinaturaPorBloqueio(ass.id)
    await bloquearConta(pedido.cpf_inspetor, 'cartao_recusado',
      `${novas.length} cobranças seguidas não pagas na assinatura do ${pedido.tipo}. A assinatura foi cancelada.`)
    return
  }
  const proxima = novas.length === 1
    ? 'Se preferir, você pode cancelar a assinatura em Meu Plano e Créditos, no aplicativo.'
    : `Atenção: esta é a ${novas.length}ª cobrança seguida que não foi paga. Se a próxima também não for, sua conta será bloqueada e a assinatura cancelada.`
  await avisarInspetor(pedido.cpf_inspetor, 'AIMÊ — Não conseguimos renovar sua assinatura', [
    { tipo: 'p', texto: `O pagamento da sua assinatura do ${pedido.tipo} não foi concluído, e por isso os créditos do mês não foram liberados.` },
    ...(invoiceUrl ? [{ tipo: 'link' as const, rotulo: 'Regularizar o pagamento', url: invoiceUrl, mostrarUrl: true }] : []),
    { tipo: 'p', texto: proxima },
  ])
}

/**
 * Estorno ou chargeback de um pagamento JÁ CONCEDIDO (decisão de Celso, 07/10/2026): revoga o saldo
 * restante dessa compra, esquece o que já foi usado e bloqueia a conta. Se o pedido era de uma
 * assinatura, ela é encerrada. Idempotente por pedido (estornado_em). Se algo falhar, desfaz a reserva
 * e responde 500 para o Asaas reentregar (bloquear é idempotente).
 */
async function tratarEstorno(pedido: any, evento: string): Promise<ResultadoCobranca> {
  if (pedido.status !== 'pago') return ok({ ignorado: true, motivo: 'pedido_nao_pago' })   // nada foi concedido
  const { data: reservado, error: erroReserva } = await supabase.from('pedidos_credito')
    .update({ estornado_em: new Date().toISOString(), motivo_estorno: evento })
    .eq('id', pedido.id).is('estornado_em', null).select('id')
  if (erroReserva) {
    // Um ERRO de banco (ex.: coluna ainda não criada) NUNCA pode virar "já processado": o Asaas daria o
    // aviso por entregue e o estorno ficaria sem tratamento, em silêncio. Responder 500 faz o Asaas
    // reentregar e deixa o motivo no log.
    console.error('[pagamentos] estorno: não consegui registrar o pedido', pedido.id, erroReserva.message)
    return { status: 500, corpo: { erro: `não foi possível registrar o estorno: ${erroReserva.message}` } }
  }
  if (!reservado || reservado.length === 0) return ok({ jaProcessado: true })   // sem erro e sem linha: outro processamento já tratou
  try {
    const qde = pedido.tipo === 'AVULSO' ? pedido.qde_creditos : (PLANO_CR[pedido.tipo] ?? pedido.qde_creditos)
    const motivo = evento === 'PAYMENT_REFUNDED' ? 'estorno' : 'chargeback'
    const rev = await revogarCreditos(pedido.cpf_inspetor, qde, pedido.tipo === 'AVULSO' ? 'avulso' : 'plano')
    if (pedido.assinatura_id) await encerrarAssinaturaPorBloqueio(pedido.assinatura_id)
    await bloquearConta(pedido.cpf_inspetor, motivo,
      `Pedido #${pedido.id} (${pedido.tipo}). Créditos revogados: ${rev.revogados}; já usados e não recuperados: ${rev.naoRecuperados}.`)
    return ok({ estornado: true, revogados: rev.revogados, naoRecuperados: rev.naoRecuperados })
  } catch (e) {
    await supabase.from('pedidos_credito').update({ estornado_em: null, motivo_estorno: null }).eq('id', pedido.id)
    return { status: 500, corpo: { erro: e instanceof Error ? e.message : String(e) } }
  }
}

/**
 * Antes de conceder o crédito de uma cobrança de assinatura:
 *  - descobre o PRÓXIMO VENCIMENTO (do Asaas, que é exato; se indisponível, o mesmo dia do mês
 *    seguinte): o contrato vale até essa data, então não há um dia sem plano em mês de 31 dias;
 *  - se for RENOVAÇÃO (não o 1º pagamento), o saldo de PLANO que sobrou do ciclo anterior vence
 *    agora — créditos não usados não acumulam (decisão de Celso, 05/10/2026). Avulso comprado à
 *    parte continua. Na troca de plano (1º pagamento de outra assinatura) nada vence: a regra
 *    "nada se perde" de sempre migra o que sobrou para avulso.
 * Pagamento que chega depois do cancelamento vira um contrato comum de 30 dias.
 */
async function prepararContratoDeAssinatura(pedido: any, vencimento: string | undefined): Promise<{ proxima: string | null }> {
  const { data: ass } = await supabase.from('assinaturas')
    .select('id,status,tipo,asaas_subscription_id').eq('id', pedido.assinatura_id).maybeSingle()
  if (!ass || ass.status === 'cancelada') return { proxima: null }

  let proxima: string | null = null
  if (ass.asaas_subscription_id && vencimento) {
    try {
      const s = await consultarAssinatura(ass.asaas_subscription_id)
      if (s.nextDueDate && s.nextDueDate > vencimento) proxima = s.nextDueDate
    } catch { /* usa o cálculo de calendário */ }
  }
  if (!proxima && vencimento) proxima = somarUmMes(vencimento)

  if (ass.status !== 'aguardando_primeiro_pagamento') {
    const hoje = new Date().toISOString().slice(0, 10)   // mesma data (UTC) que concederCreditos usa
    const { error } = await supabase.from('contratos_inspetor')
      .update({ saldo_quantidade_plano: 0 })
      .eq('cpf_inspetor', pedido.cpf_inspetor).eq('tipo_assinatura', ass.tipo).gte('data_fim_contrato', hoje)
    if (error) console.error('[asaas-webhook] não consegui vencer o saldo de plano do ciclo anterior:', error.message)
  }
  return { proxima }
}

/** Pagamento de assinatura confirmado e crédito concedido: ativa a assinatura e avisa o inspetor. */
async function aposPagamentoDeAssinatura(pedido: any, proximaCalculada: string | null, qde: number): Promise<void> {
  const { data: ass } = await supabase.from('assinaturas').select('id,status').eq('id', pedido.assinatura_id).maybeSingle()
  if (!ass) return
  const primeira = ass.status === 'aguardando_primeiro_pagamento'
  const cancelada = ass.status === 'cancelada'   // o último pagamento chegou depois do cancelamento
  const proxima = cancelada ? null : proximaCalculada
  if (!cancelada) {
    await supabase.from('assinaturas')
      .update({ status: 'ativa', ...(proxima ? { proxima_cobranca: proxima } : {}) }).eq('id', ass.id)
    // Pagou: as falhas de cartão seguidas recomeçam do zero (comando separado: se a coluna ainda não
    // existir, a ativação acima não é afetada).
    await supabase.from('assinaturas').update({ falhas_payment_ids: [] }).eq('id', ass.id)
  }
  await avisarInspetor(pedido.cpf_inspetor, primeira ? 'AIMÊ — Assinatura ativada' : 'AIMÊ — Assinatura renovada', [
    { tipo: 'p', texto: `Recebemos o pagamento da sua assinatura do ${pedido.tipo}. Os ${qde.toLocaleString('pt-BR')} créditos do mês já estão disponíveis.` },
    cancelada
      ? { tipo: 'p', texto: 'A assinatura está cancelada, então não haverá novas cobranças.' }
      : { tipo: 'p', texto: `${proxima ? `Próxima cobrança: ${dataBR(proxima)}. ` : ''}Para cancelar quando quiser, use Meu Plano e Créditos, no aplicativo.` },
  ])
}

/**
 * Processa uma cobrança do Asaas. `evento` é o nome do evento do webhook, ou 'CONFERENCIA' quando
 * quem chama é a conferência do AIMÊ. Erros inesperados SOBEM (o webhook responde 500 para o
 * Asaas reentregar; a conferência conta como falha).
 */
export async function processarCobranca(paymentId: string, evento = '', statusNoAviso = '', pagamentoNoAviso: any = null): Promise<ResultadoCobranca> {
  let { data: pedido } = await supabase
    .from('pedidos_credito').select('*').eq('asaas_payment_id', paymentId).maybeSingle()
  let cobranca: Awaited<ReturnType<typeof consultarCobranca>> | null = null

  // Cobrança REMOVIDA no Asaas (trocamos a forma de pagamento do pedido, a assinatura foi
  // cancelada, ou alguém apagou no painel): não há mais o que cobrar. NÃO consulta o Asaas —
  // a cobrança já não existe lá, a consulta daria erro, o webhook responderia 500 e o Asaas
  // reentregaria o evento (e pode pausar a fila depois de falhas seguidas).
  if (evento === 'PAYMENT_DELETED') {
    if (pedido && pedido.status === 'aguardando_pagamento') {
      await supabase.from('pedidos_credito').update({ status: 'cancelado' })
        .eq('id', pedido.id).eq('status', 'aguardando_pagamento')
    }
    return ok({ ignorado: true, motivo: 'cobranca_removida' })
  }

  // Estorno ou chargeback: revoga o saldo restante dessa compra, esquece o que foi usado e bloqueia a conta.
  // Vale o NOME do evento OU o STATUS que o aviso traz na cobrança: o Asaas pode avisar o estorno por outro
  // evento (ex.: PAYMENT_UPDATED), e o status "REFUNDED" no corpo é o mesmo fato.
  const eventoEstorno =
    (evento === 'PAYMENT_REFUNDED' || STATUS_ESTORNADO.has(statusNoAviso) || situacaoDeEstorno(pagamentoNoAviso).tipo === 'total') ? 'PAYMENT_REFUNDED'
    : (evento === 'PAYMENT_CHARGEBACK_REQUESTED' || STATUS_CHARGEBACK.has(statusNoAviso)) ? 'PAYMENT_CHARGEBACK_REQUESTED'
    : ''
  if (eventoEstorno) {
    if (!pedido) return ok({ ignorado: true, motivo: 'pedido_nao_encontrado' })
    return await tratarEstorno(pedido, eventoEstorno)
  }
  // Estorno PARCIAL: a regra da conta não cobre (quanto revogar?), então só avisa a equipe para decidir.
  if (evento === 'PAYMENT_PARTIALLY_REFUNDED') {
    await avisarSuporte('AIMÊ — Estorno PARCIAL de um pagamento (decidir manualmente)', [
      { tipo: 'p', texto: `A cobrança ${paymentId} foi estornada em parte${pedido ? ` (pedido #${pedido.id}, CPF ${pedido.cpf_inspetor}, ${pedido.tipo})` : ''}. Nada foi revogado nem bloqueado.` },
    ])
    return ok({ ignorado: true, motivo: 'estorno_parcial_avisado' })
  }

  if (!pedido) {
    // Pode ser a cobrança mensal de uma assinatura nossa (o Asaas a cria sozinho,
    // então não há pedido ainda). Pergunta ao Asaas — não confia no corpo do webhook.
    try {
      cobranca = await consultarCobranca(paymentId)
    } catch (e) {
      // Só "não encontrada" é ignorável; qualquer outro erro sobe (webhook: 500 para reentregar).
      if (naoEncontrada(e)) return ok({ ignorado: true, motivo: 'cobranca_nao_encontrada' })
      throw e
    }
    const subId = cobranca.subscription
    if (!subId) {
      // Cobrança que não reconhecemos (de outro sistema, ou pedido não encontrado por qualquer
      // motivo) — responde 200 para o Asaas não ficar reentregando um evento que nunca vamos processar.
      return ok({ ignorado: true, motivo: 'pedido_nao_encontrado' })
    }
    const { data: ass } = await supabase.from('assinaturas').select('*').eq('asaas_subscription_id', subId).maybeSingle()
    if (!ass) return ok({ ignorado: true, motivo: 'assinatura_nao_encontrada' })

    const { data: criado, error: errCriar } = await supabase.from('pedidos_credito').insert({
      cpf_inspetor: ass.cpf_inspetor, tipo: ass.tipo, qde_creditos: PLANO_CR[ass.tipo],
      valor: cobranca.value ?? ass.valor, asaas_payment_id: paymentId, assinatura_id: ass.id,
    }).select('*').single()
    if (errCriar) {
      // Outro evento da mesma cobrança chegou junto e já criou o pedido: usa o dele.
      const { data: jaCriado } = await supabase.from('pedidos_credito').select('*').eq('asaas_payment_id', paymentId).maybeSingle()
      if (!jaCriado) return { status: 500, corpo: { erro: errCriar.message } }
      pedido = jaCriado
    } else {
      pedido = criado
    }
  }

  // Idempotência: já processado antes.
  if (pedido.status === 'pago') return ok({ jaProcessado: true })
  if (pedido.status === 'cancelado') {
    // Pedido tinha sido cancelado (ex.: pela higienização, 15 dias sem pagamento) e um pagamento
    // chegou depois — situação rara, mas não concede o crédito automaticamente: fica para
    // conferência manual.
    return ok({ ignorado: true, motivo: 'pedido_ja_cancelado' })
  }

  // Verificação em dobro: confia na API do Asaas, não só no corpo do webhook.
  try {
    cobranca = cobranca ?? await consultarCobranca(paymentId)
  } catch (e) {
    if (!naoEncontrada(e)) throw e
    // O pedido existe, mas o Asaas já não conhece a cobrança (removida): não há o que esperar.
    if (evento === 'CONFERENCIA') {
      await supabase.from('pedidos_credito').update({ status: 'cancelado' })
        .eq('id', pedido.id).eq('status', 'aguardando_pagamento')
    }
    return ok({ ignorado: true, motivo: 'cobranca_nao_encontrada' })
  }
  if (!STATUS_PAGO.has(cobranca.status)) {
    // Cobrança de assinatura vencida ou com cartão recusada: avisa o inspetor.
    if (pedido.assinatura_id && (evento === 'PAYMENT_OVERDUE' || evento === 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED')) {
      await marcarInadimplente(pedido, cobranca.invoiceUrl, paymentId)
    }
    // Evento que não é de pagamento confirmado (ex.: PAYMENT_CREATED) — nada a conceder ainda.
    return ok({ aguardando: true, statusAtual: cobranca.status })
  }

  // RESERVA ATÔMICA: só um processamento (webhook ou conferência) consegue virar o pedido para
  // 'pago'; o outro vê que já foi e não concede de novo.
  const { data: reservado } = await supabase.from('pedidos_credito')
    .update({ status: 'pago', pago_em: new Date().toISOString() })
    .eq('id', pedido.id).eq('status', 'aguardando_pagamento').select('id')
  if (!reservado || reservado.length === 0) return ok({ jaProcessado: true })

  const qde = pedido.tipo === 'AVULSO' ? pedido.qde_creditos : (PLANO_CR[pedido.tipo] ?? pedido.qde_creditos)
  let resultado: { ok: boolean; erro?: string } = { ok: false, erro: 'não executado' }
  let assinatura: { proxima: string | null } | null = null
  try {
    // Assinatura: o contrato vale até o próximo vencimento e, na renovação, o saldo de plano
    // não usado do ciclo anterior vence (ver prepararContratoDeAssinatura).
    assinatura = pedido.assinatura_id ? await prepararContratoDeAssinatura(pedido, cobranca.dueDate) : null
    resultado = await concederCreditos(
      pedido.cpf_inspetor, pedido.tipo, qde,
      assinatura?.proxima ? { fimAssinatura: assinatura.proxima } : undefined,
    )
  } catch (e) {
    resultado = { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
  if (!resultado.ok) {
    // Falha genuína (banco fora do ar, etc.): desfaz a reserva para o Asaas (500) ou a conferência
    // poderem tentar de novo.
    const { error: errDesfazer } = await supabase.from('pedidos_credito')
      .update({ status: 'aguardando_pagamento', pago_em: null }).eq('id', pedido.id).eq('status', 'pago')
    if (errDesfazer) console.error('[pagamentos] ATENÇÃO: pedido', pedido.id, 'ficou pago SEM créditos (falha ao desfazer a reserva):', errDesfazer.message)
    return { status: 500, corpo: { erro: resultado.erro } }
  }

  if (pedido.assinatura_id) await aposPagamentoDeAssinatura(pedido, assinatura?.proxima ?? null, qde)

  return ok({ creditosConcedidos: qde })
}


// ─────────────────────────────────────────────────────────────────────────────────────────────
// CONFERÊNCIA DE ESTORNOS (07/10/2026). Não depende de o aviso do Asaas chegar: consulta o status REAL de
// cada compra paga recente e trata as que estão estornadas ou em chargeback (mesma regra do aviso:
// revoga o saldo restante dessa compra, esquece o usado, bloqueia a conta). Botão no Painel do Gestor.
// ─────────────────────────────────────────────────────────────────────────────────────────────
export type ItemConferencia = {
  pedidoId: number; cpf: string; tipo: string; qde: number; paymentId: string
  statusAsaas: string
  acao: 'estornado' | 'ja_estornado' | 'nenhuma' | 'em_andamento' | 'parcial' | 'erro'
  detalhe?: string
  /** Os campos que o Asaas devolveu para a cobrança (sem links e dados pessoais), para o gestor ver o dado real. */
  dadosAsaas?: string
}

function dadosDaCobranca(cob: any): string {
  const ignora = /url|customer|description|externalReference|object|^id$|paymentLink|installment|creditCard/i
  const partes: string[] = []
  for (const [k, v] of Object.entries(cob ?? {})) {
    if (ignora.test(k)) continue
    const txt = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)
    partes.push(`${k}=${txt.slice(0, 80)}`)
  }
  return partes.join('; ').slice(0, 500)
}

export async function conferirEstornos(opcoes: { cpf?: string; dias?: number; limite?: number } = {}):
  Promise<{ conferidos: number; tratados: number; itens: ItemConferencia[] }> {
  const dias = opcoes.dias ?? 45
  const limite = Math.min(opcoes.limite ?? 40, 100)
  const corte = new Date(Date.now() - dias * 86400000).toISOString()
  let consulta = supabase.from('pedidos_credito')
    .select('id,cpf_inspetor,tipo,qde_creditos,status,asaas_payment_id,assinatura_id,estornado_em,criado_em')
    .eq('status', 'pago').gte('criado_em', corte).order('id', { ascending: false }).limit(limite)
  if (opcoes.cpf) consulta = consulta.eq('cpf_inspetor', opcoes.cpf)
  const { data: pedidos, error } = await consulta
  if (error) throw new Error(`não consegui listar os pedidos: ${error.message}`)
  const lista = (pedidos ?? []).filter((p: any) => !!p.asaas_payment_id)

  // 1) consulta o Asaas (só leitura), em lotes
  const respostas: Record<number, { status: string; estorno?: ReturnType<typeof situacaoDeEstorno>; dados?: string; erro?: string }> = {}
  const aConsultar = lista.filter((p: any) => !p.estornado_em)
  for (let i = 0; i < aConsultar.length; i += 8) {
    await Promise.all(aConsultar.slice(i, i + 8).map(async (p: any) => {
      try { const cob: any = await consultarCobranca(p.asaas_payment_id); respostas[p.id] = { status: String(cob.status ?? ''), estorno: situacaoDeEstorno(cob), dados: dadosDaCobranca(cob) } }
      catch (e) { respostas[p.id] = { status: 'INDISPONIVEL', erro: e instanceof Error ? e.message : String(e) } }
    }))
  }

  // 2) trata os estornos UM POR VEZ (duas compras da mesma conta mexem nos mesmos saldos)
  const itens: ItemConferencia[] = []
  for (const p of lista as any[]) {
    const base = { pedidoId: p.id, cpf: p.cpf_inspetor, tipo: p.tipo, qde: p.qde_creditos, paymentId: p.asaas_payment_id }
    if (p.estornado_em) { itens.push({ ...base, statusAsaas: '—', acao: 'ja_estornado', detalhe: 'já tratado pelo AIMÊ' }); continue }
    const r = respostas[p.id]
    if (r.erro) { itens.push({ ...base, statusAsaas: r.status, acao: 'erro', detalhe: r.erro }); continue }
    const resumoEstorno = r.estorno?.resumo ?? ''
    const eventoEstorno = (STATUS_ESTORNADO.has(r.status) || r.estorno?.tipo === 'total') ? 'PAYMENT_REFUNDED' : STATUS_CHARGEBACK.has(r.status) ? 'PAYMENT_CHARGEBACK_REQUESTED' : ''
    if (eventoEstorno) {
      const res = await tratarEstorno(p, eventoEstorno)
      if (res.status !== 200) itens.push({ ...base, statusAsaas: r.status, acao: 'erro', detalhe: String(res.corpo?.erro ?? 'falha ao tratar o estorno') })
      else if (res.corpo?.estornado) itens.push({ ...base, statusAsaas: r.status, acao: 'estornado', detalhe: `${res.corpo.revogados} CR revogados; ${res.corpo.naoRecuperados} já usados (esquecidos)${resumoEstorno ? ' — ' + resumoEstorno : ''}` })
      else itens.push({ ...base, statusAsaas: r.status, acao: 'ja_estornado', detalhe: 'já tratado pelo AIMÊ' })
    } else if (STATUS_ESTORNO_EM_ANDAMENTO.has(r.status) || r.estorno?.tipo === 'andamento') {
      itens.push({ ...base, statusAsaas: r.status, acao: 'em_andamento', detalhe: `o estorno ainda não foi concluído no Asaas${resumoEstorno ? ' — ' + resumoEstorno : ''}` })
    } else if (r.estorno?.tipo === 'parcial') {
      itens.push({ ...base, statusAsaas: r.status, acao: 'parcial', detalhe: `estorno PARCIAL: não tratado (a regra não define quanto revogar) — ${resumoEstorno}` })
    } else {
      itens.push({ ...base, statusAsaas: r.status, acao: 'nenhuma', ...(resumoEstorno ? { detalhe: resumoEstorno } : {}) })
    }
  }
  for (const it of itens) { const d = respostas[it.pedidoId]?.dados; if (d) it.dadosAsaas = d }
  return { conferidos: lista.length, tratados: itens.filter(i => i.acao === 'estornado').length, itens }
}

/**
 * SÓ NO SANDBOX do Asaas: simula o aviso de estorno de uma compra paga, para testar o AIMÊ (revogar o saldo,
 * esquecer o usado, bloquear a conta) quando o sandbox não completa o estorno. Na produção é recusado.
 */
export async function simularEstorno(pedidoId: number): Promise<ResultadoCobranca> {
  if (ambienteAsaas() !== 'sandbox') return { status: 403, corpo: { erro: 'A simulação só existe no ambiente de teste (sandbox) do Asaas.' } }
  const { data: pedido, error } = await supabase.from('pedidos_credito')
    .select('id,cpf_inspetor,tipo,qde_creditos,status,asaas_payment_id,assinatura_id,estornado_em').eq('id', pedidoId).maybeSingle()
  if (error) return { status: 500, corpo: { erro: error.message } }
  if (!pedido) return { status: 404, corpo: { erro: 'Pedido não encontrado.' } }
  return await tratarEstorno(pedido, 'PAYMENT_REFUNDED')
}

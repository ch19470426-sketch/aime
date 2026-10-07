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
import { consultarCobranca, consultarAssinatura, cancelarAssinaturaNoAsaas, STATUS_PAGO } from '@/lib/asaas'
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
export async function processarCobranca(paymentId: string, evento = ''): Promise<ResultadoCobranca> {
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
  if (evento === 'PAYMENT_REFUNDED' || evento === 'PAYMENT_CHARGEBACK_REQUESTED') {
    if (!pedido) return ok({ ignorado: true, motivo: 'pedido_nao_encontrado' })
    return await tratarEstorno(pedido, evento)
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

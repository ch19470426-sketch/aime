// src/app/api/asaas-webhook/route.ts
// AIMÊ — Recebe a confirmação de pagamento do Asaas e libera os créditos.
//
// SEGURANÇA (esta rota concede créditos de graça se for enganada — cuidado
// redobrado):
//   1. Token: o Asaas manda um cabeçalho "asaas-access-token" com o token
//      configurado no painel deles para este webhook. Comparado a
//      ASAAS_WEBHOOK_TOKEN — sem bater, a requisição é recusada (401), sem
//      olhar o corpo.
//   2. Verificação em DOBRO: além de confiar no status que veio no corpo do
//      webhook, consultamos a cobrança DIRETO na API do Asaas antes de
//      liberar qualquer crédito — se o corpo mentir (ou estiver
//      desatualizado), a consulta real manda.
//   3. Idempotência: se o pedido já estiver com status 'pago', a rota
//      responde 200 sem conceder nada de novo (o Asaas reenvia o mesmo
//      evento por tentativas de reentrega — nunca pode duplicar o crédito).
//   5. ASSINATURAS (05/10/2026): a cobrança mensal de uma assinatura é criada pelo próprio
//      Asaas, então ainda não existe pedido para ela. Quando o pagamento não tem pedido, a
//      cobrança é consultada DIRETO no Asaas (fonte de verdade, não o corpo do webhook): se
//      ela pertence a uma assinatura nossa, o pedido do mês é criado na hora (o índice único
//      por asaas_payment_id protege contra eventos simultâneos) e segue o MESMO caminho de
//      sempre — verificação em dobro, idempotência, concessão. Eventos da própria assinatura
//      (cancelada no painel do Asaas) e cobrança vencida/recusada só atualizam o status e
//      avisam o inspetor; nunca concedem nada.
//   4. Sempre responde 200 quando o evento foi genuinamente processado (ou
//      já tinha sido antes) — um erro 5xx faz o Asaas tentar de novo depois,
//      o que é o comportamento certo só para falha de infraestrutura
//      (banco fora do ar), não para "eu decidi que não vou conceder".

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { consultarCobranca, consultarAssinatura, STATUS_PAGO } from '@/lib/asaas'
import { concederCreditos, PLANO_CR } from '@/lib/creditos'
import { agoraBrasilia } from '@/lib/emailSuporte'
import { avisarInspetor, dataBR, somarUmMes } from '@/lib/assinaturas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function tokenValido(request: NextRequest): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN
  if (!esperado) return false
  return request.headers.get('asaas-access-token') === esperado
}

/** Cobrança de assinatura vencida/recusada: marca 'inadimplente' (só uma vez) e avisa. */
async function marcarInadimplente(pedido: any, invoiceUrl: string | undefined): Promise<void> {
  // Se for a PRIMEIRA cobrança que falhou, a assinatura ainda nem começou: o inspetor pode tentar de novo pelo link.
  const { data: mudou } = await supabase.from('assinaturas')
    .update({ status: 'inadimplente' }).eq('id', pedido.assinatura_id).eq('status', 'ativa').select('id')
  if (!mudou || mudou.length === 0) return
  await avisarInspetor(pedido.cpf_inspetor, 'AIMÊ — Não conseguimos renovar sua assinatura', [
    { tipo: 'p', texto: `O pagamento da sua assinatura do ${pedido.tipo} não foi concluído, e por isso os créditos do mês não foram liberados.` },
    ...(invoiceUrl ? [{ tipo: 'link' as const, rotulo: 'Regularizar o pagamento', url: invoiceUrl, mostrarUrl: true }] : []),
    { tipo: 'p', texto: 'Se preferir, você pode cancelar a assinatura em Meu Plano e Créditos, no aplicativo.' },
  ])
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
  }
  await avisarInspetor(pedido.cpf_inspetor, primeira ? 'AIMÊ — Assinatura ativada' : 'AIMÊ — Assinatura renovada', [
    { tipo: 'p', texto: `Recebemos o pagamento da sua assinatura do ${pedido.tipo}. Os ${qde.toLocaleString('pt-BR')} créditos do mês já estão disponíveis.` },
    cancelada
      ? { tipo: 'p', texto: 'A assinatura está cancelada, então não haverá novas cobranças.' }
      : { tipo: 'p', texto: `${proxima ? `Próxima cobrança: ${dataBR(proxima)}. ` : ''}Para cancelar quando quiser, use Meu Plano e Créditos, no aplicativo.` },
  ])
}

export async function POST(request: NextRequest) {
  try {
    if (!tokenValido(request)) {
      return NextResponse.json({ erro: 'Token inválido.' }, { status: 401 })
    }

    const corpo = await request.json().catch(() => null)
    const evento: string = corpo?.event ?? ''
    const paymentId: string | undefined = corpo?.payment?.id
    if (!paymentId) {
      // Assinatura cancelada/encerrada pelo painel do Asaas: reflete na nossa base.
      const subId: string | undefined = corpo?.subscription?.id
      if (subId && (evento === 'SUBSCRIPTION_DELETED' || evento === 'SUBSCRIPTION_INACTIVATED')) {
        await supabase.from('assinaturas')
          .update({ status: 'cancelada', cancelada_em: agoraBrasilia() })
          .eq('asaas_subscription_id', subId).neq('status', 'cancelada')
        return NextResponse.json({ ok: true, assinaturaEncerrada: true })
      }
      // Evento que não é sobre uma cobrança (ex.: teste de conexão do
      // Asaas) — nada a fazer, mas não é erro.
      return NextResponse.json({ ok: true, ignorado: true })
    }

    let { data: pedido } = await supabase
      .from('pedidos_credito').select('*').eq('asaas_payment_id', paymentId).maybeSingle()
    let cobranca: Awaited<ReturnType<typeof consultarCobranca>> | null = null

    if (!pedido) {
      // Pode ser a cobrança mensal de uma assinatura nossa (o Asaas a cria sozinho,
      // então não há pedido ainda). Pergunta ao Asaas — não confia no corpo do webhook.
      cobranca = await consultarCobranca(paymentId)
      const subId = cobranca.subscription
      if (!subId) {
        // Cobrança que não reconhecemos (de outro sistema, ou pedido não
        // encontrado por qualquer motivo) — responde 200 para o Asaas não
        // ficar reentregando um evento que nunca vamos processar.
        return NextResponse.json({ ok: true, ignorado: true, motivo: 'pedido_nao_encontrado' })
      }
      const { data: ass } = await supabase.from('assinaturas').select('*').eq('asaas_subscription_id', subId).maybeSingle()
      if (!ass) return NextResponse.json({ ok: true, ignorado: true, motivo: 'assinatura_nao_encontrada' })

      const { data: criado, error: errCriar } = await supabase.from('pedidos_credito').insert({
        cpf_inspetor: ass.cpf_inspetor, tipo: ass.tipo, qde_creditos: PLANO_CR[ass.tipo],
        valor: cobranca.value ?? ass.valor, asaas_payment_id: paymentId, assinatura_id: ass.id,
      }).select('*').single()
      if (errCriar) {
        // Outro evento da mesma cobrança chegou junto e já criou o pedido: usa o dele.
        const { data: jaCriado } = await supabase.from('pedidos_credito').select('*').eq('asaas_payment_id', paymentId).maybeSingle()
        if (!jaCriado) return NextResponse.json({ erro: errCriar.message }, { status: 500 })
        pedido = jaCriado
      } else {
        pedido = criado
      }
    }

    // Idempotência: já processado antes.
    if (pedido.status === 'pago') {
      return NextResponse.json({ ok: true, jaProcessado: true })
    }
    if (pedido.status === 'cancelado') {
      // Pedido tinha sido cancelado (ex.: pela higienização, 15 dias sem
      // pagamento) e um pagamento chegou depois — situação rara, mas não
      // concede o crédito automaticamente: fica para conferência manual.
      return NextResponse.json({ ok: true, ignorado: true, motivo: 'pedido_ja_cancelado' })
    }

    // Verificação em dobro: confia na API do Asaas, não só no corpo do webhook.
    cobranca = cobranca ?? await consultarCobranca(paymentId)
    if (!STATUS_PAGO.has(cobranca.status)) {
      // Cobrança de assinatura vencida ou com cartão recusado: avisa o inspetor.
      if (pedido.assinatura_id && (evento === 'PAYMENT_OVERDUE' || evento === 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED')) {
        await marcarInadimplente(pedido, cobranca.invoiceUrl)
      }
      // Webhook de um evento que não é de pagamento confirmado (ex.:
      // PAYMENT_CREATED, PAYMENT_OVERDUE) — nada a conceder ainda.
      return NextResponse.json({ ok: true, aguardando: true, statusAtual: cobranca.status })
    }

    const qde = pedido.tipo === 'AVULSO' ? pedido.qde_creditos : (PLANO_CR[pedido.tipo] ?? pedido.qde_creditos)
    // Assinatura: o contrato vale até o próximo vencimento e, na renovação, o saldo de plano
    // não usado do ciclo anterior vence (ver prepararContratoDeAssinatura).
    const assinatura = pedido.assinatura_id ? await prepararContratoDeAssinatura(pedido, cobranca.dueDate) : null
    const resultado = await concederCreditos(
      pedido.cpf_inspetor, pedido.tipo, qde,
      assinatura?.proxima ? { fimAssinatura: assinatura.proxima } : undefined,
    )
    if (!resultado.ok) {
      // Falha genuína (banco fora do ar, etc.) — 500 faz o Asaas tentar de
      // novo mais tarde, o que é o comportamento certo aqui.
      return NextResponse.json({ erro: resultado.erro }, { status: 500 })
    }

    await supabase.from('pedidos_credito')
      .update({ status: 'pago', pago_em: new Date().toISOString() })
      .eq('id', pedido.id)

    if (pedido.assinatura_id) await aposPagamentoDeAssinatura(pedido, assinatura?.proxima ?? null, qde)

    return NextResponse.json({ ok: true, creditosConcedidos: qde })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

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
//   4. Sempre responde 200 quando o evento foi genuinamente processado (ou
//      já tinha sido antes) — um erro 5xx faz o Asaas tentar de novo depois,
//      o que é o comportamento certo só para falha de infraestrutura
//      (banco fora do ar), não para "eu decidi que não vou conceder".

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { consultarCobranca, STATUS_PAGO } from '@/lib/asaas'
import { concederCreditos, PLANO_CR } from '@/lib/creditos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function diagnosticoToken(request: NextRequest) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN
  const recebido = request.headers.get('asaas-access-token')
  return {
    valido: !!esperado && recebido === esperado,
    // DIAGNOSTICO TEMPORARIO (30/09/2026) — Celso nao conseguiu localizar
    // os Logs da Vercel; devolvendo o diagnostico aqui, no proprio corpo da
    // resposta 401, que ele ja consegue ver na tela de tentativas do
    // webhook no painel do Asaas. Nao expoe os segredos em si, so
    // tamanhos/comparacao. Remover depois que o webhook estiver validado.
    cabecalhoRecebido: recebido !== null,
    todosOsCabecalhos: [...request.headers.keys()],
    tamanhoTokenRecebido: recebido?.length ?? 0,
    tamanhoTokenEsperado: esperado?.length ?? 0,
    variavelDeAmbienteConfigurada: !!esperado,
  }
}

export async function POST(request: NextRequest) {
  try {
    const diag = diagnosticoToken(request)
    if (!diag.valido) {
      return NextResponse.json({ erro: 'Token inválido.', diagnostico: diag }, { status: 401 })
    }

    const corpo = await request.json().catch(() => null)
    const paymentId: string | undefined = corpo?.payment?.id
    if (!paymentId) {
      // Evento que não é sobre uma cobrança (ex.: teste de conexão do
      // Asaas) — nada a fazer, mas não é erro.
      return NextResponse.json({ ok: true, ignorado: true })
    }

    const { data: pedido } = await supabase
      .from('pedidos_credito').select('*').eq('asaas_payment_id', paymentId).maybeSingle()
    if (!pedido) {
      // Cobrança que não reconhecemos (de outro sistema, ou pedido não
      // encontrado por qualquer motivo) — responde 200 para o Asaas não
      // ficar reentregando um evento que nunca vamos processar.
      return NextResponse.json({ ok: true, ignorado: true, motivo: 'pedido_nao_encontrado' })
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
    const cobranca = await consultarCobranca(paymentId)
    if (!STATUS_PAGO.has(cobranca.status)) {
      // Webhook de um evento que não é de pagamento confirmado (ex.:
      // PAYMENT_CREATED, PAYMENT_OVERDUE) — nada a conceder ainda.
      return NextResponse.json({ ok: true, aguardando: true, statusAtual: cobranca.status })
    }

    const qde = pedido.tipo === 'AVULSO' ? pedido.qde_creditos : (PLANO_CR[pedido.tipo] ?? pedido.qde_creditos)
    const resultado = await concederCreditos(pedido.cpf_inspetor, pedido.tipo, qde)
    if (!resultado.ok) {
      // Falha genuína (banco fora do ar, etc.) — 500 faz o Asaas tentar de
      // novo mais tarde, o que é o comportamento certo aqui.
      return NextResponse.json({ erro: resultado.erro }, { status: 500 })
    }

    await supabase.from('pedidos_credito')
      .update({ status: 'pago', pago_em: new Date().toISOString() })
      .eq('id', pedido.id)

    return NextResponse.json({ ok: true, creditosConcedidos: qde })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

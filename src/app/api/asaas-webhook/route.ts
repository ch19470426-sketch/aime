// src/app/api/asaas-webhook/route.ts
// AIMÊ — Recebe os avisos do Asaas (pagamento confirmado, cobrança removida, assinatura cancelada…).
//
// A liberação de créditos mora em src/lib/pagamentos.ts (processarCobranca) — o MESMO caminho
// usado pela conferência do AIMÊ (/api/creditos/conferir-pagamento). Aqui ficam só:
//   1. Token: o Asaas manda o cabeçalho "asaas-access-token" com o token configurado no painel
//      dele para este webhook. Comparado a ASAAS_WEBHOOK_TOKEN — sem bater, 401, sem olhar o corpo.
//   2. Eventos da própria assinatura (cancelada/encerrada no painel do Asaas).
//   3. Resposta: 200 quando o evento foi genuinamente processado (ou já tinha sido antes) — um 5xx
//      faz o Asaas reentregar, o que só é certo para falha de infraestrutura, não para "decidi não
//      conceder".

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processarCobranca } from '@/lib/pagamentos'
import { agoraBrasilia } from '@/lib/emailSuporte'

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

export async function POST(request: NextRequest) {
  try {
    if (!tokenValido(request)) {
      return NextResponse.json({ erro: 'Token inválido.' }, { status: 401 })
    }

    const corpo = await request.json().catch(() => null)
    const evento: string = corpo?.event ?? ''
    const paymentId: string | undefined = corpo?.payment?.id
    // Só ids e o nome do evento (nada pessoal): permite conferir no log da Vercel que o Asaas está entregando.
    console.log('[asaas-webhook] evento=%s pagamento=%s assinatura=%s', evento || '-', paymentId ?? '-', corpo?.subscription?.id ?? corpo?.payment?.subscription ?? '-')

    if (!paymentId) {
      // Assinatura cancelada/encerrada pelo painel do Asaas: reflete na nossa base.
      const subId: string | undefined = corpo?.subscription?.id
      if (subId && (evento === 'SUBSCRIPTION_DELETED' || evento === 'SUBSCRIPTION_INACTIVATED')) {
        await supabase.from('assinaturas')
          .update({ status: 'cancelada', cancelada_em: agoraBrasilia() })
          .eq('asaas_subscription_id', subId).neq('status', 'cancelada')
        return NextResponse.json({ ok: true, assinaturaEncerrada: true })
      }
      // Evento que não é sobre uma cobrança (ex.: teste de conexão do Asaas) — nada a fazer, mas não é erro.
      return NextResponse.json({ ok: true, ignorado: true })
    }

    const r = await processarCobranca(paymentId, evento)
    return NextResponse.json(r.corpo, { status: r.status })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

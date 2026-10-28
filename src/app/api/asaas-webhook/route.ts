// src/app/api/asaas-webhook/route.ts
// AIMÊ — Recebe os avisos do Asaas (pagamento confirmado, cobrança removida, assinatura cancelada…).
//
// A liberação de créditos mora em src/lib/pagamentos.ts (processarCobranca) — o MESMO caminho
// usado pela conferência do AIMÊ (/api/creditos/conferir-pagamento). Aqui ficam só:
//   1. Token: o Asaas manda o cabeçalho "asaas-access-token" com o token configurado no painel
//      dele para este webhook. Comparado a ASAAS_WEBHOOK_TOKEN — sem bater, 401, sem olhar o corpo.
//   2. Eventos da própria assinatura (cancelada/encerrada no painel do Asaas).
//   3. Resposta: 200 quando o evento foi genuinamente processado (ou já tinha sido antes).
//   4. (28/10/2026, marketing) O evento é GRAVADO antes de processar (tabela eventos_asaas, por id do evento): evento repetido
//      já processado volta 200 na hora; se o processamento falhar (banco fora do ar, demora > 8 s), a linha fica 'erro', o
//      Asaas recebe 200 (15 falhas seguidas pausam a fila dele) e o evento é reprocessado depois — no próximo webhook ou no
//      cron diário /api/webhook-reprocessar. Sem a tabela (SQL ainda não aplicado), vale o comportamento antigo: 5xx para o
//      Asaas reentregar. O envio ao GA4 e o reprocessamento rodam DEPOIS da resposta (depoisDaResposta).
//   O Asaas só considera sucesso o HTTP 200, espera no máximo 10 s e NÃO segue redirecionamento: esta rota responde direto ao
//   POST em /api/asaas-webhook (nenhum middleware de login a alcança: o proxy.ts só atua em /inspetor).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processarCobranca } from '@/lib/pagamentos'
import { agoraBrasilia } from '@/lib/emailSuporte'
import { registrarEvento, concluirEvento, reprocessarEventosComErro } from '@/lib/eventosAsaas'
import { processarFilaGa4 } from '@/lib/ga4'
import { depoisDaResposta } from '@/lib/depois'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const LIMITE_PROCESSAMENTO_MS = 8000   // abaixo dos 10 s que o Asaas espera

function comLimite<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const limite = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error('tempo esgotado')), ms) })
  return Promise.race([p, limite]).finally(() => clearTimeout(timer))
}

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

    const statusNoAviso: string = corpo?.payment?.status ?? ''
    const eventoId: string | undefined = typeof corpo?.id === 'string' ? corpo.id : undefined
    const reg = await registrarEvento({ eventoId, evento, paymentId, statusNoAviso })
    if (reg.jaProcessado) {
      depoisDaResposta(async () => { await processarFilaGa4(); await reprocessarEventosComErro(3) })
      return NextResponse.json({ ok: true, jaProcessado: true })
    }

    let resposta: NextResponse
    try {
      const r = await comLimite(processarCobranca(paymentId, evento, statusNoAviso, corpo?.payment ?? null), LIMITE_PROCESSAMENTO_MS)
      if (r.status >= 500) throw new Error(String(r.corpo?.erro ?? `erro ${r.status}`))
      await concluirEvento(eventoId, 'processado')
      resposta = NextResponse.json(r.corpo, { status: r.status })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[asaas-webhook] falha ao processar evento=%s pagamento=%s: %s', evento || '-', paymentId, msg)
      if (!reg.registrado) throw e   // sem registro do evento não há como reprocessar: 5xx para o Asaas reentregar
      await concluirEvento(eventoId, 'erro', msg)
      resposta = NextResponse.json({ ok: true, reprocessar: true })
    }
    depoisDaResposta(async () => { await processarFilaGa4(); await reprocessarEventosComErro(3) })
    return resposta
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

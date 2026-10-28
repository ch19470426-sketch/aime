// src/app/api/webhook-reprocessar/route.ts
// AIMÊ — Reprocessa o que ficou pendente do webhook do Asaas (marketing, 28/10/2026):
//   1. eventos do Asaas que falharam (eventos_asaas.situacao = 'erro') — a liberação de créditos é idempotente;
//   2. envios ao Google Analytics 4 pendentes (ga4_envios.status = 'pendente').
// Roda 1x por dia pelo cron da Vercel (vercel.json) e também depois de cada aviso do Asaas. Também pode ser chamada por um
// gestor logado (para conferir). SEGURANÇA: mesma regra da higienização — Bearer CRON_SECRET (cron) ou gestor logado.
import { NextRequest, NextResponse } from 'next/server'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { ehGestor } from '@/lib/creditos'
import { reprocessarEventosComErro } from '@/lib/eventosAsaas'
import { processarFilaGa4 } from '@/lib/ga4'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function ehCronVercel(request: NextRequest): boolean {
  const segredo = process.env.CRON_SECRET
  if (!segredo) return false
  return request.headers.get('authorization') === `Bearer ${segredo}`
}

export async function GET(request: NextRequest) {
  try {
    if (!ehCronVercel(request)) {
      const sessao = await sessaoDaRequisicao(request)
      if (!sessao) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
      if ((await ehGestor(sessao.cpf)) !== true) return NextResponse.json({ erro: 'Acesso negado.' }, { status: 403 })
    }
    const eventos = await reprocessarEventosComErro(20)
    const ga4 = await processarFilaGa4(50)
    return NextResponse.json({ eventos, ga4 })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

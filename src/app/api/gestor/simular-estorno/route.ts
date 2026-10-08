// src/app/api/gestor/simular-estorno/route.ts
// AIMÊ — SÓ NO SANDBOX do Asaas: o gestor simula o aviso de estorno de uma compra paga (POST { pedidoId }),
// para testar o AIMÊ quando o sandbox não completa o estorno. Na produção responde 403.
// SEGURANÇA: só gestor, com checagem PRÓPRIA e sempre ativa.

import { NextRequest, NextResponse } from 'next/server'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { ehGestor } from '@/lib/creditos'
import { simularEstorno } from '@/lib/pagamentos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const sessao = await sessaoDaRequisicao(request)
    if (!sessao) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
    if ((await ehGestor(sessao.cpf)) !== true) return NextResponse.json({ erro: 'Acesso restrito a gestores.' }, { status: 403 })
    const corpo = await request.json().catch(() => ({} as { pedidoId?: number }))
    const pedidoId = Number(corpo?.pedidoId)
    if (!Number.isInteger(pedidoId) || pedidoId <= 0) return NextResponse.json({ erro: 'pedidoId inválido.' }, { status: 400 })
    const r = await simularEstorno(pedidoId)
    return NextResponse.json(r.corpo, { status: r.status })
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

// src/app/api/gestor/confirmar-estorno/route.ts
// AIMÊ — O gestor confirma o estorno de uma compra cujo estorno está pendente no Asaas (dinheiro já devolvido ao cliente, conferido no
// extrato). Roda o mesmo fluxo do estorno concluído. POST { pedidoId }.
// SEGURANÇA: só gestor, com checagem PRÓPRIA e sempre ativa.

import { NextRequest, NextResponse } from 'next/server'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { ehGestor } from '@/lib/creditos'
import { confirmarEstornoManual } from '@/lib/pagamentos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const sessao = await sessaoDaRequisicao(request)
    if (!sessao) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
    if ((await ehGestor(sessao.cpf)) !== true) return NextResponse.json({ erro: 'Acesso restrito a gestores.' }, { status: 403 })

    const corpo = await request.json().catch(() => ({} as { pedidoId?: unknown }))
    const pedidoId = Number(corpo?.pedidoId)
    if (!Number.isInteger(pedidoId) || pedidoId <= 0) return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 })
    const r = await confirmarEstornoManual(pedidoId, sessao.cpf)
    return NextResponse.json(r.corpo, { status: r.status })
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

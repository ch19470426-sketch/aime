// src/app/api/gestor/desbloquear-conta/route.ts
// AIMÊ — O gestor libera uma conta bloqueada. POST { cpf }. Zera as falhas de cartão das assinaturas e avisa
// o inspetor por e-mail. SEGURANÇA: só gestor, com checagem PRÓPRIA e sempre ativa.

import { NextRequest, NextResponse } from 'next/server'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { ehGestor } from '@/lib/creditos'
import { desbloquearConta } from '@/lib/bloqueio'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const sessao = await sessaoDaRequisicao(request)
    if (!sessao) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
    if ((await ehGestor(sessao.cpf)) !== true) return NextResponse.json({ erro: 'Acesso restrito a gestores.' }, { status: 403 })

    const { cpf } = await request.json().catch(() => ({} as { cpf?: string }))
    const alvo = String(cpf ?? '').replace(/\D/g, '')
    if (alvo.length !== 11) return NextResponse.json({ erro: 'CPF inválido.' }, { status: 400 })
    const desbloqueada = await desbloquearConta(alvo)
    return NextResponse.json({ ok: true, desbloqueada })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

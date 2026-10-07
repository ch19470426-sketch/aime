// src/app/api/gestor/conferir-estornos/route.ts
// AIMÊ — O gestor confere no Asaas o status REAL das compras pagas recentes e trata as que foram estornadas ou
// estão em chargeback (revoga o saldo restante da compra, esquece o usado, bloqueia a conta). Não depende de o
// aviso do Asaas ter chegado. POST { cpf? } — com CPF, confere só aquela conta.
// SEGURANÇA: só gestor, com checagem PRÓPRIA e sempre ativa.

import { NextRequest, NextResponse } from 'next/server'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { ehGestor } from '@/lib/creditos'
import { conferirEstornos } from '@/lib/pagamentos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const sessao = await sessaoDaRequisicao(request)
    if (!sessao) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
    if ((await ehGestor(sessao.cpf)) !== true) return NextResponse.json({ erro: 'Acesso restrito a gestores.' }, { status: 403 })

    const corpo = await request.json().catch(() => ({} as { cpf?: string }))
    const bruto = String(corpo?.cpf ?? '').replace(/\D/g, '')
    if (corpo?.cpf && bruto.length !== 11) return NextResponse.json({ erro: 'CPF inválido.' }, { status: 400 })
    const resultado = await conferirEstornos(bruto ? { cpf: bruto } : {})
    return NextResponse.json(resultado)
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

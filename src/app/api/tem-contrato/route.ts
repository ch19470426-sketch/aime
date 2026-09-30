// src/app/api/tem-contrato/route.ts
// AIMÊ — Usado pelo dashboard para decidir se o inspetor precisa ser
// redirecionado para /escolher-plano (nunca escolheu nenhum plano ainda,
// nem mesmo Cortesia). Gestor está sempre isento dessa obrigação.

import { NextRequest, NextResponse } from 'next/server'
import { ehGestor, temAlgumContrato } from '@/lib/creditos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cpf = new URL(request.url).searchParams.get('cpf_inspetor')
  if (!cpf) return NextResponse.json({ erro: 'cpf_inspetor é obrigatório' }, { status: 400 })

  const gestor = await ehGestor(cpf)
  const tem = gestor === true ? true : await temAlgumContrato(cpf)
  return NextResponse.json({ temContrato: tem, gestor: gestor === true })
}

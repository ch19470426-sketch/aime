// src/app/api/creditos/verificar-servico/route.ts
// AIMÊ — Usado pelo dashboard para checar, ANTES de navegar para a tela de
// um serviço, se há saldo suficiente para iniciá-lo (ex.: mínimo de 100 CR
// para começar uma vistoria). Não debita nada — só verifica.

import { NextRequest, NextResponse } from 'next/server'
import { verificarDisponibilidade } from '@/lib/creditos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const cpf = url.searchParams.get('cpf_inspetor')
  const codigo = url.searchParams.get('codigo_servico')
  if (!cpf || !codigo) {
    return NextResponse.json({ erro: 'cpf_inspetor e codigo_servico são obrigatórios' }, { status: 400 })
  }
  const verificacao = await verificarDisponibilidade(cpf, Number(codigo))
  return NextResponse.json(verificacao)
}

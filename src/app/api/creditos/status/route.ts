// src/app/api/creditos/status/route.ts
// AIMÊ — Situação de créditos do usuário LOGADO: se é isento (gestor),
// se a cobrança está ligada e o saldo. O CPF vem da sessão validada no
// servidor, nunca de parâmetro da requisição.

import { NextRequest, NextResponse } from 'next/server'
import { cpfDaSessao } from '@/lib/sessaoServidor'
import { cobrancaAtiva, ehGestor, lerSaldo } from '@/lib/creditos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cpf = await cpfDaSessao(request)
  if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })

  // is_gestor vem direto da tabela (independe da migração dos créditos);
  // o saldo vem da função SQL e fica null se a migração ainda não foi aplicada.
  const gestor = await ehGestor(cpf)
  const saldo = await lerSaldo(cpf)

  return NextResponse.json({
    isento: gestor === true,
    cobrancaAtiva: cobrancaAtiva(),
    saldoPlano: saldo?.saldo_plano ?? null,
    saldoAvulso: saldo?.saldo_avulso ?? null,
    saldoTotal: saldo?.saldo_total ?? null,
  })
}

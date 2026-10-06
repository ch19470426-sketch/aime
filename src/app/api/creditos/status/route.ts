// src/app/api/creditos/status/route.ts
// AIMÊ — Situação de créditos do usuário LOGADO: se é isento (gestor),
// se a cobrança está ligada e o saldo. O CPF vem da sessão validada no
// servidor, nunca de parâmetro da requisição.

import { NextRequest, NextResponse } from 'next/server'
import { cpfDaSessao } from '@/lib/sessaoServidor'
import { createClient } from '@supabase/supabase-js'
import { cobrancaAtiva, ehGestor, lerSaldo, podeComprarAvulso } from '@/lib/creditos'
import { STATUS_EM_ANDAMENTO, dataBR } from '@/lib/assinaturas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cpf = await cpfDaSessao(request)
  if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })

  // is_gestor vem direto da tabela (independe da migração dos créditos);
  // o saldo vem da função SQL e fica null se a migração ainda não foi aplicada.
  const gestor = await ehGestor(cpf)
  const saldo = await lerSaldo(cpf)
  const avulsoLiberado = gestor === true ? false : await podeComprarAvulso(cpf)

  // Assinatura mensal em andamento (se houver). A tabela pode ainda não existir: segue sem ela.
  let assinatura: { tipo: string; status: string; valor: number; proximaCobranca: string | null } | null = null
  try {
    const { data } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      .from('assinaturas').select('tipo,status,valor,proxima_cobranca')
      .eq('cpf_inspetor', cpf).in('status', STATUS_EM_ANDAMENTO).maybeSingle()
    if (data) assinatura = { tipo: data.tipo, status: data.status, valor: Number(data.valor), proximaCobranca: data.proxima_cobranca ? dataBR(data.proxima_cobranca) : null }
  } catch { /* sem assinatura */ }

  return NextResponse.json({
    assinatura,
    isento: gestor === true,
    cobrancaAtiva: cobrancaAtiva(),
    saldoPlano: saldo?.saldo_plano ?? null,
    saldoAvulso: saldo?.saldo_avulso ?? null,
    saldoTotal: saldo?.saldo_total ?? null,
    avulsoLiberado,
  })
}

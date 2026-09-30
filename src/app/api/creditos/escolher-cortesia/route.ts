// src/app/api/creditos/escolher-cortesia/route.ts
// AIMÊ — Concede o PLANO CORTESIA (gratuito) na etapa obrigatória de
// escolha de plano do primeiro acesso. Não passa pelo Asaas — crédito
// imediato. Reaproveita a mesma regra de bloqueio já usada em
// trocar-plano/atribuir-plano (quem já tem plano pago não pode "voltar"
// para Cortesia), embora, no fluxo normal de primeiro acesso, o inspetor
// nunca tenha tido contrato nenhum ainda.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cpfDaSessao } from '@/lib/sessaoServidor'
import { concederCreditos } from '@/lib/creditos'
import { bloqueioMigracaoParaCortesia } from '@/lib/regrasPlano'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const cpf = await cpfDaSessao(request)
    if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })

    const bloqueio = await bloqueioMigracaoParaCortesia(supabase, cpf)
    if (bloqueio) return NextResponse.json({ erro: bloqueio }, { status: 403 })

    const resultado = await concederCreditos(cpf, 'PLANO CORTESIA', 600)
    if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

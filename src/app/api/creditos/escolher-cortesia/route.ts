// src/app/api/creditos/escolher-cortesia/route.ts
// AIMÊ — Concede o PLANO CORTESIA (gratuito) na etapa obrigatória de
// escolha de plano do primeiro acesso. Não passa pelo Asaas — crédito
// imediato.
//
// REGRA (Celso): o Cortesia é a porta de entrada e é concedido UMA ÚNICA VEZ
// por inspetor. Imposta aqui, no servidor, porque o cartão do Cortesia só some
// da tela para quem já tem contrato — qualquer usuário logado consegue chamar
// esta rota direto. Antes de 06/10/2026 só o bloqueio "já tem plano pago"
// existia: quem tinha o Cortesia como contrato mais recente podia pedi-lo de
// novo (e, no mesmo dia, o excedente entrava como crédito avulso).
//
//   1. quem tem plano pago como contrato mais recente: bloqueado (regra antiga);
//   2. quem JÁ TEVE Cortesia (vigente ou vencido): bloqueado;
//   3. falha ao ler o histórico BLOQUEIA (liberar por engano = crédito de graça);
//   4. o contrato é inserido direto (não via concederCreditos): a chave primária
//      (cpf, tipo, data) faz o 2º pedido SIMULTÂNEO falhar, em vez de somar o
//      excedente como avulso.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cpfDaSessao } from '@/lib/sessaoServidor'
import { bloqueioMigracaoParaCortesia } from '@/lib/regrasPlano'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JA_UTILIZADO = 'O Plano Cortesia já foi utilizado e não pode ser concedido novamente.'

export async function POST(request: NextRequest) {
  try {
    const cpf = await cpfDaSessao(request)
    if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })

    const bloqueio = await bloqueioMigracaoParaCortesia(supabase, cpf)
    if (bloqueio) return NextResponse.json({ erro: bloqueio }, { status: 403 })

    const { data: jaTeve, error: erroHistorico } = await supabase
      .from('contratos_inspetor').select('cpf_inspetor')
      .eq('cpf_inspetor', cpf).eq('tipo_assinatura', 'PLANO CORTESIA').limit(1)
    if (erroHistorico) {
      return NextResponse.json({ erro: 'Não foi possível verificar o histórico de planos. Tente novamente.' }, { status: 500 })
    }
    if (jaTeve && jaTeve.length > 0) return NextResponse.json({ erro: JA_UTILIZADO }, { status: 403 })

    const { error } = await supabase.from('contratos_inspetor').insert({
      cpf_inspetor: cpf, tipo_assinatura: 'PLANO CORTESIA',
      data_inicio_contrato: new Date().toISOString().slice(0, 10),
      qde_contratada_plano: 600, saldo_quantidade_plano: 600,
      qde_contratada_avulso: 0, saldo_quantidade_avulso: 0,
    })
    if (error) {
      if (error.code === '23505') return NextResponse.json({ erro: JA_UTILIZADO }, { status: 403 })
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

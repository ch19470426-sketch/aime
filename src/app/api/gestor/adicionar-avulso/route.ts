import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { cpf, qde } = await request.json()
    if (!cpf || !qde || qde % 600 !== 0) {
      return NextResponse.json({ erro: 'Quantidade deve ser múltiplo de 600.' }, { status: 400 })
    }

    // Buscar contrato ativo mais recente para atualizar avulso
    const { data: contrato } = await supabase
      .from('contratos_inspetor')
      .select('*')
      .eq('cpf_inspetor', cpf)
      .gte('data_fim_contrato', new Date().toISOString().slice(0,10))
      .order('data_inicio_contrato', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (contrato) {
      // Acumular avulso no contrato ativo
      const { error } = await supabase
        .from('contratos_inspetor')
        .update({
          qde_contratada_avulso: contrato.qde_contratada_avulso + qde,
          saldo_quantidade_avulso: contrato.saldo_quantidade_avulso + qde,
        })
        .eq('cpf_inspetor', cpf)
        .eq('tipo_assinatura', contrato.tipo_assinatura)
        .eq('data_inicio_contrato', contrato.data_inicio_contrato)
      if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    } else {
      // Sem contrato ativo — criar registro só de avulso (sem validade)
      const { error } = await supabase
        .from('contratos_inspetor')
        .insert({
          cpf_inspetor: cpf,
          tipo_assinatura: 'PLANO SERVIÇO', // placeholder para satisfazer o check
          data_inicio_contrato: new Date().toISOString().slice(0,10),
          qde_contratada_plano: 0,
          saldo_quantidade_plano: 0,
          qde_contratada_avulso: qde,
          saldo_quantidade_avulso: qde,
        })
      if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

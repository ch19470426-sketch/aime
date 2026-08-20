import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLANO_CR: Record<string,number> = {
  'PLANO CORTESIA': 600, 'PLANO SERVIÇO': 600,
  'PLANO MENSAL': 1200, 'PLANO ESCRITÓRIO': 3600
}

export async function POST(request: NextRequest) {
  try {
    const { cpf, tipo } = await request.json()
    if (!cpf || !tipo) return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    const qde = PLANO_CR[tipo]
    if (!qde) return NextResponse.json({ erro: 'Tipo de plano inválido.' }, { status: 400 })

    // Impedir migração para Cortesia (regra de negócio)
    if (tipo === 'PLANO CORTESIA') {
      const { data: jaTemCortesia } = await supabase
        .from('contratos_inspetor')
        .select('cpf_inspetor')
        .eq('cpf_inspetor', cpf)
        .eq('tipo_assinatura', 'PLANO CORTESIA')
        .maybeSingle()
      if (jaTemCortesia) {
        return NextResponse.json({ erro: 'O Plano Cortesia já foi concedido a este inspetor.' }, { status: 422 })
      }
    }

    const { error } = await supabase
      .from('contratos_inspetor')
      .insert({
        cpf_inspetor: cpf,
        tipo_assinatura: tipo,
        data_inicio_contrato: new Date().toISOString().slice(0,10),
        qde_contratada_plano: qde,
        saldo_quantidade_plano: qde,
        qde_contratada_avulso: 0,
        saldo_quantidade_avulso: 0,
      })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

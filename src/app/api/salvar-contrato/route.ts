// src/app/api/salvar-contrato/route.ts
// AIMÊ — Salva ou atualiza o contrato do inspetor

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      cpf_inspetor, tipo_assinatura, data_inicio_contrato,
      data_fim_contrato, nr_laudos_contratados, valor_mensal,
      valor_por_laudo, desconto_aplicado, em_promocao,
    } = body

    if (!cpf_inspetor || !tipo_assinatura) {
      return NextResponse.json({ erro: 'CPF e tipo de assinatura são obrigatórios' }, { status: 400 })
    }

    // Regra: não pode migrar de MENSAL, SERVIÇO ou ESCRITÓRIO para CORTESIA
    const { data: atual } = await supabase
      .from('contratos_inspetor')
      .select('tipo_assinatura')
      .eq('cpf_inspetor', cpf_inspetor)
      .order('data_inicio_contrato', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (atual && tipo_assinatura === 'PLANO CORTESIA') {
      const planoAtual = atual.tipo_assinatura ?? ''
      if (['PLANO MENSAL', 'PLANO SERVIÇO', 'PLANO ESCRITÓRIO'].includes(planoAtual)) {
        return NextResponse.json({
          erro: `Não é permitido migrar de ${planoAtual} para PLANO CORTESIA.`
        }, { status: 400 })
      }
    }

    const { error } = await supabase.from('contratos_inspetor').insert({
      cpf_inspetor,
      tipo_assinatura,
      data_inicio_contrato,
      data_fim_contrato:        data_fim_contrato || null,
      nr_laudos_contratados:    nr_laudos_contratados || null,
      valor_mensal:             valor_mensal || null,
      valor_por_laudo:          valor_por_laudo || null,
      desconto_aplicado:        desconto_aplicado || 0,
      em_promocao:              em_promocao || false,
      situacao:                 'Ativo',
    })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

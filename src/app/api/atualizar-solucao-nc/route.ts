export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// src/app/api/atualizar-solucao-nc/route.ts
// AIMÊ — Atualiza descricao_solucao_nc em dados_vistoria após prompt SNC

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { cpf_inspetor, cnpjoucpf, tipo_servico, foto_nr, descricao_solucao_nc } = await request.json()

    if (!cpf_inspetor || !cnpjoucpf || !tipo_servico || !foto_nr || !descricao_solucao_nc) {
      return NextResponse.json({ erro: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('dados_vistoria')
      .update({ descricao_solucao_nc })
      .eq('cpf_inspetor', cpf_inspetor)
      .eq('cnpjoucpf', cnpjoucpf)
      .eq('tipo_servico', tipo_servico)
      .eq('numero_foto', Number(foto_nr))

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}

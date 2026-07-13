// src/app/api/excluir-ativo/route.ts
// Exclui um registro de ativos_a_vistoriar usando Service Role (evita bloqueio silencioso por RLS)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: NextRequest) {
  const { cpf_inspetor, cnpjoucpf, tipo_servico, data_cadastro } = await request.json()

  if (!cpf_inspetor || !cnpjoucpf || !tipo_servico || !data_cadastro) {
    return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  const { error, count } = await supabase
    .from('ativos_a_vistoriar')
    .delete({ count: 'exact' })
    .eq('cpf_inspetor', cpf_inspetor)
    .eq('cnpjoucpf', cnpjoucpf)
    .eq('tipo_servico', tipo_servico)
    .eq('data_cadastro', data_cadastro)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ erro: 'Nenhum ativo encontrado para excluir' }, { status: 404 })

  return NextResponse.json({ ok: true, excluidos: count })
}

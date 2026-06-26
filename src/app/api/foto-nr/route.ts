// src/app/api/foto-nr/route.ts
// AIMÊ — Numeração sequencial de fotos
//
// Chave: cpf_inspetor + cnpjoucpf + tipo_servico
// Sequência contínua para a mesma combinação, mesmo após encerrar a vistoria.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── GET — consulta o próximo número sem incrementar ─────────────────────────
// Uso: /api/foto-nr?cpf_inspetor=X&cnpjoucpf=Y&tipo_servico=31

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const cpf_inspetor = p.get('cpf_inspetor')
  const cnpjoucpf    = p.get('cnpjoucpf')
  const tipo_servico = p.get('tipo_servico')

  if (!cpf_inspetor || !cnpjoucpf || !tipo_servico) {
    return NextResponse.json(
      { erro: 'Parâmetros obrigatórios: cpf_inspetor, cnpjoucpf, tipo_servico' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('foto_contador')
    .select('ultimo_nr')
    .eq('cpf_inspetor', cpf_inspetor)
    .eq('cnpjoucpf',    cnpjoucpf)
    .eq('tipo_servico', tipo_servico)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  const proximo = (data?.ultimo_nr ?? 0) + 1
  return NextResponse.json({
    proximo,
    formatado: String(proximo).padStart(3, '0'),
  })
}

// ─── POST — incrementa e retorna o número a ser usado ────────────────────────
// Body: { cpf_inspetor, cnpjoucpf, tipo_servico }

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { cpf_inspetor, cnpjoucpf, tipo_servico } = body

  if (!cpf_inspetor || !cnpjoucpf || !tipo_servico) {
    return NextResponse.json(
      { erro: 'Campos obrigatórios: cpf_inspetor, cnpjoucpf, tipo_servico' },
      { status: 400 }
    )
  }

  // Lê o valor atual (pode não existir ainda)
  const { data: atual } = await supabase
    .from('foto_contador')
    .select('ultimo_nr')
    .eq('cpf_inspetor', cpf_inspetor)
    .eq('cnpjoucpf',    cnpjoucpf)
    .eq('tipo_servico', tipo_servico)
    .single()

  const novoNr = (atual?.ultimo_nr ?? 0) + 1

  // Upsert: cria se não existir, atualiza se já existir
  const { error } = await supabase
    .from('foto_contador')
    .upsert(
      { cpf_inspetor, cnpjoucpf, tipo_servico, ultimo_nr: novoNr },
      { onConflict: 'cpf_inspetor,cnpjoucpf,tipo_servico' }
    )

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({
    nr:        novoNr,
    formatado: String(novoNr).padStart(3, '0'),
  })
}

// src/app/api/vistorias/route.ts
// AIMÊ — API para listar e ler formulários de vistoria do Storage

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — listar e filtrar formulários por cnpjoucpf
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const chaveInspetor = searchParams.get('chave_inspetor')
  const cnpjoucpf     = searchParams.get('cnpjoucpf')
  const tipoServico   = searchParams.get('tipo_servico') // opcional

  if (!chaveInspetor || !cnpjoucpf) {
    return NextResponse.json({ erro: 'chave_inspetor e cnpjoucpf são obrigatórios' }, { status: 400 })
  }

  try {
    // Listar todos os arquivos do inspetor
    const { data: files, error } = await supabase.storage
      .from('aime')
      .list('vistorias', {
        search: chaveInspetor,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    if (!files || files.length === 0) return NextResponse.json({ formularios: [] })

    // Ler cada arquivo e filtrar por cnpjoucpf
    const formularios = []
    for (const file of files) {
      const { data, error: readError } = await supabase.storage
        .from('aime')
        .download(`vistorias/${file.name}`)

      if (readError || !data) continue

      const text = await data.text()
      const json = JSON.parse(text)

      // Filtrar por cnpjoucpf e tipo_servico (se informado)
      if (json.cnpjoucpf !== cnpjoucpf) continue
      if (tipoServico && json.tipoServico !== tipoServico) continue

      formularios.push({ nome: file.name, ...json, fotoBase64: undefined })
    }

    return NextResponse.json({ formularios })
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}

// DELETE — excluir formulário
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const nome = searchParams.get('nome')

  if (!nome) return NextResponse.json({ erro: 'nome é obrigatório' }, { status: 400 })

  const { error } = await supabase.storage
    .from('aime')
    .remove([`vistorias/${nome}`])

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ sucesso: true })
}

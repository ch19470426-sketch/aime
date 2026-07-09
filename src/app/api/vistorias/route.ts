// src/app/api/vistorias/route.ts
// AIMÊ — API para listar, ler e deletar formulários de vistoria do Storage

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — listar formulários por cnpjoucpf OU ler formulário específico por nome
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const nome          = searchParams.get('nome')
  const chaveInspetor = searchParams.get('chave_inspetor')
  const cnpjoucpf     = searchParams.get('cnpjoucpf')

  // Ler formulário específico (com fotoBase64)
  if (nome) {
    try {
      const { data, error } = await supabase.storage
        .from('aime')
        .download(`vistorias/${nome}`)

      if (error || !data) return NextResponse.json({ erro: error?.message ?? 'Não encontrado' }, { status: 404 })

      const text = await data.text()
      const json = JSON.parse(text)
      return NextResponse.json(json)
    } catch (e) {
      return NextResponse.json({ erro: String(e) }, { status: 500 })
    }
  }

  // Listar e filtrar formulários por cnpjoucpf
  if (!chaveInspetor || !cnpjoucpf) {
    return NextResponse.json({ erro: 'chave_inspetor e cnpjoucpf são obrigatórios' }, { status: 400 })
  }

  try {
    const { data: files, error } = await supabase.storage
      .from('aime')
      .list('vistorias', {
        search: chaveInspetor,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    if (!files || files.length === 0) return NextResponse.json({ formularios: [] })

    const formularios = []
    for (const file of files) {
      const { data, error: readError } = await supabase.storage
        .from('aime')
        .download(`vistorias/${file.name}`)

      if (readError || !data) continue

      const text = await data.text()
      const json = JSON.parse(text)

      if (json.cnpjoucpf !== cnpjoucpf) continue

      // Excluir fotoBase64 da listagem para economizar banda
      const { fotoBase64, ...semFoto } = json
      formularios.push({ nome: file.name, ...semFoto })
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

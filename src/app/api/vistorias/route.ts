export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60  // Vercel Pro: até 60s para download de muitos arquivos

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
  const pasta         = searchParams.get('pasta') ?? 'vistorias'
  const chaveInspetor = searchParams.get('chave_inspetor')
  const cnpjoucpf     = searchParams.get('cnpjoucpf')

  // Ler formulário específico
  if (nome) {
    try {
      const { data, error } = await supabase.storage
        .from('aime')
        .download(`${pasta}/${nome}`)

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
        limit: 1000,
        search: chaveInspetor,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    if (!files || files.length === 0) return NextResponse.json({ formularios: [] })

    // Filtrar por nome antes de baixar — nome: {chave}_{cnpj}_{tipo}_{nr}.json
    // Evita baixar arquivos de outros CNPJs sem precisar abrir cada um
    const filtradosPorNome = files.filter(f => f.name.includes(`_${cnpjoucpf}_`))
    if (filtradosPorNome.length === 0) return NextResponse.json({ formularios: [] })

    // Download em paralelo apenas dos arquivos relevantes
    const resultados = await Promise.all(
      filtradosPorNome.map(async (file) => {
        try {
          const { data, error: readError } = await supabase.storage
            .from('aime')
            .download(`vistorias/${file.name}`)
          if (readError || !data) return null
          const text = await data.text()
          const json = JSON.parse(text)
          const { fotoBase64, ...semFoto } = json
          return { nome: file.name, ...semFoto }
        } catch {
          return null
        }
      })
    )
    const formularios = resultados.filter(Boolean)

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

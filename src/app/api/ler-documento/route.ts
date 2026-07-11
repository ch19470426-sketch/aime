// src/app/api/ler-documento/route.ts
// Lê documento do Storage usando Service Role

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const nome  = searchParams.get('nome')
  const pasta = searchParams.get('pasta') ?? 'documentos_inspetor'

  if (!nome) return NextResponse.json({ erro: 'Nome obrigatório' }, { status: 400 })

  try {
    const { data, error } = await supabase.storage
      .from('aime')
      .download(`${pasta}/${nome}`)

    if (error || !data) return NextResponse.json({ existe: false }, { status: 404 })

    const html = await data.text()
    return NextResponse.json({ existe: true, html })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

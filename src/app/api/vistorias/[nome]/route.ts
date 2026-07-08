// src/app/api/vistorias/[nome]/route.ts
// AIMÊ — API para ler formulário específico com foto

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { nome: string } }
) {
  const { nome } = params

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

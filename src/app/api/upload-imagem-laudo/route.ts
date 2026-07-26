// src/app/api/upload-imagem-laudo/route.ts
// Recebe base64 e salva no storage com service role

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { base64, nomeArquivo } = await request.json()
    if (!base64 || !nomeArquivo)
      return NextResponse.json({ erro: 'base64 e nomeArquivo são obrigatórios' }, { status: 400 })

    // Extrair mime e dados
    const match = base64.match(/^data:([^;]+);base64,(.+)$/)
    if (!match)
      return NextResponse.json({ erro: 'base64 inválido' }, { status: 400 })

    const [, mime, dados] = match
    const buffer = Buffer.from(dados, 'base64')

    const { error } = await supabase.storage
      .from('aime')
      .upload(`laudos_imagens/${nomeArquivo}`, buffer, {
        contentType: mime,
        upsert: true,
      })

    if (error)
      return NextResponse.json({ erro: error.message }, { status: 500 })

    return NextResponse.json({ path: `laudos_imagens/${nomeArquivo}` })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

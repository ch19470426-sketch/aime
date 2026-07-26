// src/app/api/upload-imagem-laudo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { base64, nomeArquivo } = await request.json()
    if (!base64 || !nomeArquivo)
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes' }, { status: 400 })

    const match = base64.match(/^data:([^;]+);base64,(.+)$/)
    if (!match)
      return NextResponse.json({ erro: 'formato base64 inválido' }, { status: 400 })

    const [, mime, dados] = match
    const buffer = Buffer.from(dados, 'base64')

    // Salvar em documentos_inspetor/ (pasta que sabemos que funciona)
    const pasta = 'laudos_imagens'
    const { error } = await supabase.storage
      .from('aime')
      .upload(`${pasta}/${nomeArquivo}`, buffer, {
        contentType: mime,
        upsert: true,
      })

    if (error) {
      // Se pasta não existe, tentar em documentos_inspetor/ que certamente existe
      const { error: err2 } = await supabase.storage
        .from('aime')
        .upload(`documentos_inspetor/${nomeArquivo}`, buffer, {
          contentType: mime,
          upsert: true,
        })
      if (err2) return NextResponse.json({ erro: err2.message }, { status: 500 })
      return NextResponse.json({ path: `documentos_inspetor/${nomeArquivo}` })
    }

    return NextResponse.json({ path: `${pasta}/${nomeArquivo}` })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

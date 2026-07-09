// src/app/api/salvar-vistoria/route.ts
// AIMÊ — Salva formulário no Supabase Storage
// Suporta JSON (vistorias/) e HTML (vistorias_homologadas/)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nomeArquivo, payload, pasta, contentType } = body

    if (!nomeArquivo || !payload) {
      return NextResponse.json({ erro: 'nomeArquivo e payload são obrigatórios' }, { status: 400 })
    }

    const folder      = pasta ?? 'vistorias'
    const mimeType    = contentType ?? 'application/json'
    const isHtml      = mimeType === 'text/html'
    const conteudo    = isHtml ? payload : JSON.stringify(payload, null, 2)
    const blob        = new Blob([conteudo], { type: mimeType })

    const { error } = await supabase.storage
      .from('aime')
      .upload(`${folder}/${nomeArquivo}`, blob, {
        contentType: mimeType,
        upsert: true,
      })

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({ sucesso: true, arquivo: `${folder}/${nomeArquivo}` })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

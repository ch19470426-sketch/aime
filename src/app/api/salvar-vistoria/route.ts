// src/app/api/salvar-vistoria/route.ts
// AIMÊ — Salva formulário de vistoria no Supabase Storage
// Usa service_role key para ter permissão de upload

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nomeArquivo, payload } = body

    if (!nomeArquivo || !payload) {
      return NextResponse.json({ erro: 'nomeArquivo e payload são obrigatórios' }, { status: 400 })
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })

    const { error } = await supabase.storage
      .from('aime')
      .upload(`vistorias/${nomeArquivo}`, blob, {
        contentType: 'application/json',
        upsert: true,
      })

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({ sucesso: true, arquivo: nomeArquivo })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

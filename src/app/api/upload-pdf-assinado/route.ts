// src/app/api/upload-pdf-assinado/route.ts
// AIMÊ — Recebe o PDF assinado (Gov.br) enviado pelo inspetor e guarda em documentos_inspetor/

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { nomeArquivo, base64 } = await request.json()
    if (!nomeArquivo || !base64) {
      return NextResponse.json({ erro: 'nomeArquivo e base64 são obrigatórios' }, { status: 400 })
    }
    const buffer = Buffer.from(base64, 'base64')
    const { error } = await supabase.storage
      .from('aime')
      .upload(`documentos_inspetor/${nomeArquivo}`, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

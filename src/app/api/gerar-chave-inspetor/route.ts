// src/app/api/gerar-chave-inspetor/route.ts
// AIMÊ — Gera a próxima chave sequencial de inspetor (ex: INS-001, INS-002...)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const { data, error } = await supabase
      .from('inspetor')
      .select('chave_inspetor')
      .not('chave_inspetor', 'is', null)
      .order('chave_inspetor', { ascending: false })
      .limit(1)

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    let proximoNumero = 1
    if (data && data.length > 0 && data[0].chave_inspetor) {
      const match = String(data[0].chave_inspetor).match(/(\d+)$/)
      if (match) proximoNumero = parseInt(match[1], 10) + 1
    }

    const chave = 'INS-' + String(proximoNumero).padStart(3, '0')
    return NextResponse.json({ chave })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

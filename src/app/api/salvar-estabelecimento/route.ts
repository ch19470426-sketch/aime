import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cnpjoucpf, razao_social_nome, uso_estabelecimento } = body
    if (!cnpjoucpf) return NextResponse.json({ erro: 'CNPJ/CPF obrigatório.' }, { status: 400 })

    const { error } = await supabase
      .from('estabelecimento')
      .update({ razao_social_nome, uso_estabelecimento })
      .eq('cnpjoucpf', cnpjoucpf.replace(/\D/g,''))

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

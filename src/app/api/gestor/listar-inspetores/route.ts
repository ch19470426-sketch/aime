import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('inspetor')
      .select('cpf_inspetor,nome_inspetor,titulo_profissional,inspetor_email,inspetor_whatsapp,is_gestor')
      .order('nome_inspetor')
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

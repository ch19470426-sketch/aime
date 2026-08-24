import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const cpf = new URL(request.url).searchParams.get('cpf')
  if (!cpf) return NextResponse.json({ erro: 'CPF obrigatório' }, { status: 400 })
  try {
    const { data, error } = await supabase
      .from('inspetor')
      .select('cpf_inspetor,chave_inspetor,titulo_profissional,is_gestor')
      .eq('cpf_inspetor', cpf)
      .limit(1)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

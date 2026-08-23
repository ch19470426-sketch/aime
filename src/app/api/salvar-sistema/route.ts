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
    const { id, tipo_servico, sistema, descricao_sistema, subsistema, anomalias, ativo } = await request.json()

    if (id) {
      const { error } = await supabase
        .from('sistemas_construtivos')
        .update({ anomalias, descricao_sistema, ativo: ativo !== false })
        .eq('id', id)
      if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    } else {
      const { error } = await supabase
        .from('sistemas_construtivos')
        .insert({ tipo_servico, sistema, descricao_sistema, subsistema, anomalias, ativo: true })
      if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

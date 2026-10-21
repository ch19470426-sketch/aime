import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST, com o CPF no CORPO: a tela de login precisa desta consulta antes do login, e o CPF não pode ir na URL (histórico do navegador, registros do servidor e
// ferramentas de análise guardam a URL inteira). A rota GET foi removida.
export async function POST(request: NextRequest) {
  let cpf = ''
  try { cpf = String((await request.json())?.cpf ?? '').replace(/\D/g, '') } catch { /* corpo inválido */ }
  if (!cpf) return NextResponse.json({ existe: false })
  try {
    const { data } = await supabase
      .from('inspetor')
      .select('cpf_inspetor')
      .eq('cpf_inspetor', cpf)
      .limit(1)
    return NextResponse.json({ existe: Array.isArray(data) && data.length > 0 })
  } catch {
    return NextResponse.json({ existe: false })
  }
}

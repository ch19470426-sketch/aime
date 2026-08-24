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

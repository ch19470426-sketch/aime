import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const cpf   = new URL(request.url).searchParams.get('cpf')
  const token = new URL(request.url).searchParams.get('token')
  if (token !== 'aime2024admin') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!cpf) return NextResponse.json({ erro: 'CPF obrigatório' }, { status: 400 })
  try {
    await supabase.from('inspetor').delete().eq('cpf_inspetor', cpf)
    const email = `${cpf}@aime-app.com.br`
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users?.users?.find((u: any) => u.email === email)
    if (user) await supabase.auth.admin.deleteUser(user.id)
    return NextResponse.json({ ok: true, cpf, authRemovido: !!user })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

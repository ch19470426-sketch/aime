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
    const { cpf } = await request.json()
    if (!cpf) return NextResponse.json({ erro: 'CPF obrigatório' }, { status: 400 })

    const cpfLimpo = cpf.replace(/\D/g, '')

    // 1. Buscar e-mail real na tabela inspetor
    const { data: insp } = await supabase
      .from('inspetor')
      .select('inspetor_email')
      .eq('cpf_inspetor', cpfLimpo)
      .single()

    // Mensagem genérica independente de encontrar ou não — evita enumeração de CPFs
    if (!insp?.inspetor_email) return NextResponse.json({ ok: true })

    const emailReal = insp.inspetor_email as string
    const emailTecnico = `${cpfLimpo}@aime-app.com.br`

    // 2. Temporariamente atualizar o email do usuário Auth para o real
    //    para que o Supabase envie o link de recuperação para o endereço correto
    const { data: listData } = await supabase.auth.admin.listUsers()
    const usuario = listData?.users?.find((u: any) => u.email === emailTecnico)

    if (!usuario) return NextResponse.json({ ok: true })

    // 3. Atualizar email Auth para o real, enviar o link, restaurar o email técnico
    const origem = request.headers.get('origin')
      || process.env.NEXT_PUBLIC_SITE_URL
      || 'https://aime-7h4a.vercel.app'

    await supabase.auth.admin.updateUserById(usuario.id, { email: emailReal })

    const { error: errReset } = await supabase.auth.resetPasswordForEmail(emailReal, {
      redirectTo: `${origem}/nova-senha`,
    })

    // Restaurar o email técnico imediatamente
    await supabase.auth.admin.updateUserById(usuario.id, { email: emailTecnico })

    if (errReset) {
      console.error('[AIMÊ] erro ao enviar e-mail de recuperação:', errReset.message)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

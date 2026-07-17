// src/app/api/auth-criar-conta/route.ts
// AIMÊ — Cria a conta de autenticação (Supabase Auth) já confirmada, via API
// administrativa (service role). Evita depender do toggle "Confirm email" do
// painel e não dispara nenhum e-mail — resolve o rate limit de e-mails também.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ erro: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // já nasce confirmada, sem precisar de link por e-mail
    })

    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        const { data: listData } = await supabase.auth.admin.listUsers()
        const existente = listData?.users?.find((u: { email?: string }) => u.email === email)
        if (existente) {
          const { error: errUpdate } = await supabase.auth.admin.updateUserById(existente.id, { password })
          if (errUpdate) return NextResponse.json({ erro: errUpdate.message }, { status: 400 })
          return NextResponse.json({ ok: true, id: existente.id })
        }
      }
      return NextResponse.json({ erro: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, id: data.user?.id })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

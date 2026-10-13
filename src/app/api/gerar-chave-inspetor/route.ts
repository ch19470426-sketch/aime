export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// src/app/api/gerar-chave-inspetor/route.ts
// AIMÊ — Chave do inspetor (o CPF), decidida no servidor

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao } from '@/lib/autorizacao'
import { garantirChaveDoInspetor } from '@/lib/chaveInspetor'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Devolve a chave do usuário logado: a que o cadastro já tem ou, se for um cadastro antigo sem chave, grava o CPF como chave.
// Idempotente: chamar de novo devolve a mesma chave. A chave nunca vem do navegador (src/lib/chaveInspetor.ts).
export async function POST(request: NextRequest) {
  try {
    const acesso = await exigirSessao(request)
    if (acesso.ok === false) return acesso.resposta
    if (!acesso.cpf) return NextResponse.json({ erro: 'Sessão não identificada.' }, { status: 401 })

    const chave = await garantirChaveDoInspetor(supabase, acesso.cpf)
    if (!chave) return NextResponse.json({ erro: 'Cadastro de inspetor não encontrado.' }, { status: 404 })
    return NextResponse.json({ chave })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

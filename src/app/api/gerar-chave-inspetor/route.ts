export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// src/app/api/gerar-chave-inspetor/route.ts
// AIMÊ — Chave sequencial de inspetor (ex: INS-001, INS-002...), decidida no servidor

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao } from '@/lib/autorizacao'
import { garantirChaveDoInspetor, proximaChaveInspetor } from '@/lib/chaveInspetor'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Devolve a chave do usuário logado: a que ele já tem ou, se o cadastro for antigo e estiver sem chave, atribui e grava uma
// nova (sequência do banco, em src/lib/chaveInspetor.ts). Idempotente por usuário: chamar de novo devolve a mesma chave, em
// vez de gastar um número a cada chamada. Sem sessão identificada (AUTH_API_ATIVA desligada), só mostra a próxima chave.
export async function POST(request: NextRequest) {
  try {
    const acesso = await exigirSessao(request)
    if (acesso.ok === false) return acesso.resposta

    if (acesso.cpf) {
      const chave = await garantirChaveDoInspetor(supabase, acesso.cpf)
      if (!chave) return NextResponse.json({ erro: 'Cadastro de inspetor não encontrado.' }, { status: 404 })
      return NextResponse.json({ chave })
    }
    return NextResponse.json({ chave: await proximaChaveInspetor(supabase) })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

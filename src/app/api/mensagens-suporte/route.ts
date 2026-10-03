// src/app/api/mensagens-suporte/route.ts
// AIMÊ — Painel do Gestor: lista e atualiza status das mensagens de
// "Fale Conosco". Pedido de Celso, 03/10/2026.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirGestor } from '@/lib/autorizacao'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const acesso = await exigirGestor(request)
  if (acesso.ok === false) return acesso.resposta

  const { data, error } = await supabase
    .from('mensagens_suporte')
    .select('id, cpf_inspetor, nome_inspetor, assunto, mensagem, status, criado_em, respondido_em')
    .order('criado_em', { ascending: false })
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ mensagens: data })
}

export async function PATCH(request: NextRequest) {
  const acesso = await exigirGestor(request)
  if (acesso.ok === false) return acesso.resposta

  const { id, status } = await request.json()
  if (!id || !['pendente', 'respondido'].includes(status)) {
    return NextResponse.json({ erro: 'id e status (pendente/respondido) são obrigatórios.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('mensagens_suporte')
    .update({ status, respondido_em: status === 'respondido' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

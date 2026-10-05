// src/app/api/mensagens-suporte/route.ts
// AIMÊ — Painel do Gestor: lista e atualiza status das mensagens de
// "Fale Conosco". Pedido de Celso, 03/10/2026.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirGestor } from '@/lib/autorizacao'
import { agoraBrasilia } from '@/lib/emailSuporte'

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
    .select('*') // inclui 'resposta' (texto da resposta enviada, quando houver)
    .order('criado_em', { ascending: false })
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  // Traz o WhatsApp/e-mail de cada inspetor que escreveu, para o gestor
  // poder responder direto — a mensagem em si nao guarda isso, so o cpf.
  const cpfs = [...new Set((data ?? []).map(m => m.cpf_inspetor))]
  const { data: insps } = cpfs.length
    ? await supabase.from('inspetor').select('cpf_inspetor, inspetor_whatsapp, inspetor_email').in('cpf_inspetor', cpfs)
    : { data: [] }
  const porCpf = new Map((insps ?? []).map(i => [i.cpf_inspetor, i]))
  const mensagens = (data ?? []).map(m => ({
    ...m,
    inspetor_whatsapp: porCpf.get(m.cpf_inspetor)?.inspetor_whatsapp ?? '',
    inspetor_email: porCpf.get(m.cpf_inspetor)?.inspetor_email ?? '',
  }))

  return NextResponse.json({ mensagens })
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
    .update({ status, respondido_em: status === 'respondido' ? agoraBrasilia() : null })
    .eq('id', id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

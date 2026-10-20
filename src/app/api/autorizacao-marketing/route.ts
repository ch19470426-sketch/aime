// src/app/api/autorizacao-marketing/route.ts
// AIMÊ — Dar ou RETIRAR a autorização de uso dos dados para publicidade e promoções (Meu Cadastro, item 6.2). Rota própria, e não o "Salvar
// Cadastro": retirar a autorização não pode depender de o resto do formulário estar válido. Só o próprio inspetor (nem o gestor) altera a dele.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao, exigirProprio } from '@/lib/autorizacao'
import { camposDaAutorizacao } from '@/lib/autorizacaoMarketing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const acessoApi = await exigirSessao(request)
    if (acessoApi.ok === false) return acessoApi.resposta
    const body = await request.json()
    const cpf = String(body?.cpf ?? '').replace(/\D/g, '')
    if (!cpf) return NextResponse.json({ erro: 'cpf obrigatório' }, { status: 400 })
    if (typeof body?.autoriza !== 'boolean') return NextResponse.json({ erro: 'autoriza deve ser verdadeiro ou falso' }, { status: 400 })
    const acessoDono = await exigirProprio(request, cpf)
    if (acessoDono.ok === false) return acessoDono.resposta

    const campos = camposDaAutorizacao(body.autoriza)
    const { data, error } = await supabase.from('inspetor').update(campos).eq('cpf_inspetor', cpf).select('cpf_inspetor')
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    if (!data || data.length === 0) return NextResponse.json({ erro: 'Cadastro de inspetor não encontrado.' }, { status: 404 })
    return NextResponse.json({ ok: true, autoriza: campos.autoriza_marketing, em: campos.autoriza_marketing_em })
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}

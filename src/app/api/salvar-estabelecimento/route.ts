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
    const body = await request.json()
    const { cnpjoucpf, razao_social_nome, uso_estabelecimento, numero_imovel, complemento, cep_estabelecimento, tipo_id, data_cadastro } = body
    if (!cnpjoucpf) return NextResponse.json({ erro: 'CNPJ/CPF obrigatório.' }, { status: 400 })
    const cnpjLimpo = cnpjoucpf.replace(/\D/g,'')

    // upsert (service_role) funciona tanto para criar quanto atualizar,
    // sem depender de RLS na anon key — evita "não foi possível salvar"
    const payload: Record<string, unknown> = {
      cnpjoucpf: cnpjLimpo, razao_social_nome, uso_estabelecimento,
      numero_imovel, complemento, cep_estabelecimento,
    }
    if (tipo_id !== undefined) payload.tipo_id = tipo_id
    if (data_cadastro) payload.data_cadastro = data_cadastro

    const { error } = await supabase
      .from('estabelecimento')
      .upsert(payload, { onConflict: 'cnpjoucpf' })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

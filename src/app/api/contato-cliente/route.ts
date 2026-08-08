export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf_inspetor, cnpjoucpf, tipo_servico, nome_responsavel,
            funcao_responsavel, cpf_responsavel, whatsapp_responsavel,
            email_responsavel, finalidade_vistoria } = body

    if (!cpf_inspetor || !cnpjoucpf || !tipo_servico || !nome_responsavel)
      return NextResponse.json({ erro: 'Campos obrigatórios ausentes.' }, { status: 400 })

    const { error } = await supabase.from('contato_cliente').insert({
      cpf_inspetor, cnpjoucpf, tipo_servico,
      nome_responsavel, funcao_responsavel: funcao_responsavel || null,
      cpf_responsavel: cpf_responsavel || null,
      whatsapp_responsavel: whatsapp_responsavel || null,
      email_responsavel: email_responsavel || null,
      finalidade_vistoria: finalidade_vistoria || null
    })

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cpf_inspetor = searchParams.get('cpf_inspetor')
    const cnpjoucpf    = searchParams.get('cnpjoucpf')
    const tipo_servico = searchParams.get('tipo_servico')

    if (!cpf_inspetor || !cnpjoucpf)
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    let q = supabase.from('contato_cliente').select('*')
      .eq('cpf_inspetor', cpf_inspetor)
      .eq('cnpjoucpf', cnpjoucpf)
      .order('data_cadastro', { ascending: false })
      .limit(1)

    if (tipo_servico) q = q.eq('tipo_servico', tipo_servico)

    const { data, error } = await q
    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json({ data: data ?? [] })
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}

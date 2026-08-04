import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data_hora, tipo_servico, cnpjoucpf, valor_servico, prazo_execucao, uf_estabelecimento } = body

    if (!tipo_servico || !cnpjoucpf) {
      return NextResponse.json({ erro: 'tipo_servico e cnpjoucpf obrigatórios' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('historico_valores')
      .insert({
        data_hora: data_hora || new Date().toISOString(),
        tipo_servico: String(tipo_servico).slice(0, 32),
        cnpjoucpf: String(cnpjoucpf).replace(/\D/g, '').slice(0, 14),
        valor_servico: Number(valor_servico) || 0,
        prazo_execucao: parseInt(String(prazo_execucao)) || 0,
        uf_estabelecimento: String(uf_estabelecimento || '').slice(0, 2),
      })

    if (error) {
      console.error('historico_valores insert error:', error)
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({ sucesso: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

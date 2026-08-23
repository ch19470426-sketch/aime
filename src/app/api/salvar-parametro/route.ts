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
    const { tipo_servico, tipo_parametro, valores, modoEdicao } = await request.json()

    if (!tipo_servico || !valores?.length) {
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })
    }

    // Deletar registros anteriores se for edição
    if (modoEdicao) {
      const { error: delError } = await supabase
        .from('tabela_parametros')
        .delete()
        .eq('tipo_servico', tipo_servico)
        .eq('tipo_parametro', tipo_parametro)
      if (delError) return NextResponse.json({ erro: delError.message }, { status: 500 })
    }

    // Inserir novos registros
    const registros = valores.map((v: string) => ({
      tipo_servico,
      tipo_parametro,
      descricao_parametros: v,
    }))

    const { error } = await supabase.from('tabela_parametros').insert(registros)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

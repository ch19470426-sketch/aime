import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const tipoServico = new URL(request.url).searchParams.get('tipo_servico')

  try {
    let query = supabase
      .from('criticidade_gut')
      .select('tipo_servico,tipo_parametro,descricao,peso,percentual_calculo')
      .eq('ativo', true)
      .order('tipo_parametro').order('peso')

    if (tipoServico) query = query.eq('tipo_servico', tipoServico)

    const { data, error } = await query
    if (error || !data?.length) return NextResponse.json({ erro: error?.message ?? 'vazio' }, { status: 500 })

    const valorGut: Record<string, number> = {}
    const percentuais: Record<string, number> = {}

    for (const row of data) {
      const tipo = row.tipo_parametro.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
        .replace('abrangencia','abrangencia').replace('urgencia','urgencia').replace('exposicao','exposicao')
      valorGut[`${tipo}:${row.descricao}`] = Number(row.peso)
      if (row.percentual_calculo != null) {
        percentuais[row.tipo_parametro] = Number(row.percentual_calculo)
      }
    }

    return NextResponse.json({ valorGut, percentuais })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('criticidade_gut')
      .select('tipo_parametro, descricao, peso, percentual_calculo')
      .eq('ativo', true)
      .order('tipo_parametro').order('peso')

    if (error || !data?.length) return NextResponse.json({ erro: error?.message ?? 'vazio' }, { status: 500 })

    // Montar o mapa VALOR_GUT e os percentuais
    const valorGut: Record<string, number> = {}
    const percentuais: Record<string, number> = {}

    for (const row of data) {
      const chave = `${row.tipo_parametro.toLowerCase().replace('â', 'a').replace('ê', 'e').replace('ô', 'o')}:${row.descricao}`
      // Normalizar chave (remover acentos para compatibilidade)
      const chaveNorm = chave
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace('abrangencia', 'abrangencia')
        .replace('urgencia', 'urgencia')
        .replace('exposicao', 'exposicao')
      valorGut[chaveNorm] = Number(row.peso)
      if (row.percentual_calculo != null) {
        percentuais[row.tipo_parametro] = Number(row.percentual_calculo)
      }
    }

    return NextResponse.json({ valorGut, percentuais })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

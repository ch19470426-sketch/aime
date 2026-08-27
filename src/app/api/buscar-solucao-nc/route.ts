export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const cpf_inspetor       = p.get('cpf_inspetor')  ?? ''
  const cnpjoucpf          = p.get('cnpjoucpf')      ?? ''
  const tipo_servico       = p.get('tipo_servico')   ?? ''
  const foto_nr            = Number(p.get('foto_nr') ?? 0)

  if (!cpf_inspetor || !cnpjoucpf || !tipo_servico || !foto_nr)
    return NextResponse.json({ descricao_solucao_nc: '' })

  // Buscar por tipo_servico exato ou por prefixo numérico (ex: '31' encontra '31 Autovistoria')
  const { data } = await supabase
    .from('dados_vistoria')
    .select('descricao_solucao_nc')
    .eq('cpf_inspetor', cpf_inspetor)
    .eq('cnpjoucpf', cnpjoucpf)
    .like('tipo_servico', `${tipo_servico.split(' ')[0]}%`)
    .eq('numero_foto', foto_nr)
    .maybeSingle()

  return NextResponse.json({ descricao_solucao_nc: data?.descricao_solucao_nc ?? '' })
}

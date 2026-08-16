export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const cpf = p.get('cpf') ?? '05491239704'
  const cnpj = p.get('cnpj') ?? '12345678000190'
  const ts = p.get('ts') ?? '37 Vistoria nr-12'

  const { data: dv } = await supabase.from('dados_vistoria')
    .select('numero_foto,tag_ativo_nr_serie,tipo_ativo,descricao_solucao_nc,tipo_servico')
    .eq('cpf_inspetor', cpf).eq('cnpjoucpf', cnpj).eq('tipo_servico', ts)
    .limit(5)

  return NextResponse.json({ dv, ts, total: dv?.length ?? 0 })
}

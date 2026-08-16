export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const cpf  = p.get('cpf')  ?? '05491239704'
  const cnpj = p.get('cnpj') ?? '12345678000190'

  // Todos os tipos de serviço distintos para este inspetor/cnpj
  const { data: tipos } = await supabase.from('dados_vistoria')
    .select('tipo_servico, numero_foto, tag_ativo_nr_serie, tipo_ativo, descricao_solucao_nc')
    .eq('cpf_inspetor', cpf).eq('cnpjoucpf', cnpj)
    .limit(20)

  return NextResponse.json({ tipos, total: tipos?.length ?? 0 })
}

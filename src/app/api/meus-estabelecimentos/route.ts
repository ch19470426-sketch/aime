import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const cpf = new URL(request.url).searchParams.get('cpf')
  if (!cpf) return NextResponse.json({ erro: 'CPF obrigatório' }, { status: 400 })

  try {
    // Buscar CNPJs/CPFs únicos vinculados ao inspetor via dados_vistoria
    const { data: vistorias, error } = await supabase
      .from('dados_vistoria')
      .select('cnpjoucpf')
      .eq('cpf_inspetor', cpf)

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    const cnpjs = [...new Set((vistorias ?? []).map((v: any) => v.cnpjoucpf))].filter(Boolean)
    if (cnpjs.length === 0) return NextResponse.json([])

    // Buscar dados dos estabelecimentos
    const { data: estabs, error: e2 } = await supabase
      .from('estabelecimento')
      .select('cnpjoucpf,razao_social_nome,cep_estabelecimento,numero_imovel,complemento,uso_estabelecimento,tipo_id')
      .in('cnpjoucpf', cnpjs)
      .order('razao_social_nome')

    if (e2) return NextResponse.json({ erro: e2.message }, { status: 500 })
    return NextResponse.json(estabs ?? [])
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

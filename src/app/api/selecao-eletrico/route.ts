export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const cpfEletrico = request.nextUrl.searchParams.get('cpf_eletrico') ?? ''
  if (!cpfEletrico) return NextResponse.json({ erro: 'cpf_eletrico obrigatório' }, { status: 400 })

  // Buscar ARTs do eng. elétrico
  const { data: arts, error } = await supabase
    .from('art_profissional')
    .select('id,cnpjoucpf,cpf_inspetor,data_cadastro')
    .eq('cpf_eletrico', cpfEletrico)
    .order('data_cadastro', { ascending: false })

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  if (!arts || arts.length === 0) return NextResponse.json({ arts: [] })

  // Buscar razão social e nome do inspetor em paralelo
  const cnpjs = [...new Set(arts.map((a: any) => a.cnpjoucpf))]
  const cpfs  = [...new Set(arts.map((a: any) => a.cpf_inspetor))]

  const [estabRows, inspRows] = await Promise.all([
    supabase.from('estabelecimento')
      .select('cnpjoucpf,razao_social_nome')
      .in('cnpjoucpf', cnpjs),
    supabase.from('inspetor')
      .select('cpf_inspetor,nome_inspetor')
      .in('cpf_inspetor', cpfs),
  ])

  const estabs: Record<string,string> = {}
  const nomes:  Record<string,string> = {}
  for (const e of estabRows.data ?? []) estabs[e.cnpjoucpf] = e.razao_social_nome
  for (const i of inspRows.data  ?? []) nomes[i.cpf_inspetor] = i.nome_inspetor

  const resultado = arts.map((a: any) => ({
    ...a,
    razao_social:  estabs[a.cnpjoucpf] ?? '',
    nome_inspetor: nomes[a.cpf_inspetor] ?? '',
  }))

  return NextResponse.json({ arts: resultado })
}

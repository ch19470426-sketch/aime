export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao } from '@/lib/autorizacao'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // PORTEIRO (AUTH_API_ATIVA): exige sessão válida. Inerte enquanto a variável não for exatamente "true".
  const acessoApi = await exigirSessao(request)
  if (acessoApi.ok === false) return acessoApi.resposta
  const cpfEletrico = request.nextUrl.searchParams.get('cpf_eletrico') ?? ''
  if (!cpfEletrico) return NextResponse.json({ erro: 'cpf_eletrico obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('art_profissional')
    .select('id,cnpjoucpf,cpf_inspetor,data_cadastro')
    .eq('cpf_eletrico', cpfEletrico)
    .order('data_cadastro', { ascending: false })

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ arts: data ?? [] })
}

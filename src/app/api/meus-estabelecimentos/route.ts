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
    // 1. Buscar chave_inspetor
    const { data: inspData } = await supabase
      .from('inspetor')
      .select('chave_inspetor')
      .eq('cpf_inspetor', cpf)
      .single()

    const chave = inspData?.chave_inspetor
    if (!chave) return NextResponse.json([])

    // 2. Listar arquivos do Storage e extrair CNPJs/CPFs únicos
    const { data: arquivos, error } = await supabase.storage
      .from('aime')
      .list('documentos_inspetor', { limit: 1000 })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    // Arquivos têm formato: chave_cnpjoucpf_tipo...
    const cnpjsSet = new Set<string>()
    for (const arq of arquivos ?? []) {
      if (!arq.name.startsWith(chave)) continue
      // Extrair CNPJ/CPF do nome — segundo segmento separado por '_'
      const partes = arq.name.split('_')
      if (partes.length >= 2) {
        const cnpjCpf = partes[1]
        if (/^\d{11,14}$/.test(cnpjCpf)) cnpjsSet.add(cnpjCpf)
      }
    }

    // 3. Fallback: buscar via dados_vistoria
    const { data: vistorias } = await supabase
      .from('dados_vistoria')
      .select('cnpjoucpf')
      .eq('cpf_inspetor', cpf)

    for (const v of vistorias ?? []) {
      if (v.cnpjoucpf) cnpjsSet.add(v.cnpjoucpf.replace(/\D/g,''))
    }

    const cnpjs = [...cnpjsSet].filter(Boolean)
    if (cnpjs.length === 0) return NextResponse.json([])

    // 4. Buscar dados dos estabelecimentos
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

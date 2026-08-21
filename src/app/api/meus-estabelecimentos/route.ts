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
    const cnpjsSet = new Set<string>()

    // 1. ativos_a_vistoriar — criado ao gerar Plano de Trabalho
    const { data: ativos } = await supabase
      .from('ativos_a_vistoriar')
      .select('cnpjoucpf')
      .eq('cpf_inspetor', cpf)
    for (const a of ativos ?? []) {
      if (a.cnpjoucpf) cnpjsSet.add(a.cnpjoucpf.replace(/\D/g, ''))
    }

    // 2. dados_vistoria — criado ao registrar vistoria
    const { data: vistorias } = await supabase
      .from('dados_vistoria')
      .select('cnpjoucpf')
      .eq('cpf_inspetor', cpf)
    for (const v of vistorias ?? []) {
      if (v.cnpjoucpf) cnpjsSet.add(v.cnpjoucpf.replace(/\D/g, ''))
    }

    // 3. Storage — arquivos gerados (proposta, plano, laudo)
    const { data: inspData } = await supabase
      .from('inspetor')
      .select('chave_inspetor')
      .eq('cpf_inspetor', cpf)
      .single()

    if (inspData?.chave_inspetor) {
      const chave = inspData.chave_inspetor
      const { data: arquivos } = await supabase.storage
        .from('aime')
        .list('documentos_inspetor', { limit: 1000 })
      for (const arq of arquivos ?? []) {
        if (!arq.name.startsWith(chave + '_')) continue
        const partes = arq.name.split('_')
        if (partes.length >= 2 && /^\d{11,14}$/.test(partes[1])) {
          cnpjsSet.add(partes[1])
        }
      }
    }

    const cnpjs = [...cnpjsSet].filter(Boolean)
    if (cnpjs.length === 0) return NextResponse.json([])

    // Buscar dados completos
    const { data: estabs, error } = await supabase
      .from('estabelecimento')
      .select('cnpjoucpf,razao_social_nome,cep_estabelecimento,numero_imovel,complemento,uso_estabelecimento,tipo_id')
      .in('cnpjoucpf', cnpjs)
      .order('razao_social_nome')

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json(estabs ?? [])
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

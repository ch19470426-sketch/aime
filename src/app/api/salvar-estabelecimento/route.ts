import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao } from '@/lib/autorizacao'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  // PORTEIRO (AUTH_API_ATIVA): exige sessão válida. Inerte enquanto a variável não for exatamente "true".
  const acessoApi = await exigirSessao(request)
  if (acessoApi.ok === false) return acessoApi.resposta
  try {
    const body = await request.json()
    const { cnpjoucpf, razao_social_nome, uso_estabelecimento, numero_imovel, complemento, cep_estabelecimento, tipo_id, data_cadastro } = body
    if (!cnpjoucpf) return NextResponse.json({ erro: 'CNPJ/CPF obrigatório.' }, { status: 400 })
    const cnpjLimpo = cnpjoucpf.replace(/\D/g,'')

    // upsert (service_role) funciona tanto para criar quanto atualizar,
    // sem depender de RLS na anon key — evita "não foi possível salvar"
    const payload: Record<string, unknown> = {
      cnpjoucpf: cnpjLimpo, razao_social_nome, uso_estabelecimento,
      numero_imovel, complemento, cep_estabelecimento,
    }
    if (tipo_id !== undefined) payload.tipo_id = tipo_id
    // data_cadastro: o CLIENTE so manda esse campo quando e um cadastro novo
    // (nao numa atualizacao) — mantemos essa decisao, mas o VALOR em si e
    // sempre calculado aqui no servidor, ignorando o que veio no corpo da
    // requisicao. Antes usava new Date() do navegador do usuario, o que
    // corrompia a data se o relogio do aparelho estivesse errado (mesmo
    // achado de 29/09/2026 que motivou esta correcao em varios campos).
    if (data_cadastro) {
      const hojeBR = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) // 'AAAA-MM-DD'
      payload.data_cadastro = hojeBR
    }

    const { error } = await supabase
      .from('estabelecimento')
      .upsert(payload, { onConflict: 'cnpjoucpf' })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

// src/app/api/dados-vistoria/route.ts
// AIMÊ — Leitura e gravação da tabela dados_vistoria PELO SERVIDOR. Antes a tela de homologação gravava e lia esta tabela direto do navegador, com a
// chave pública (Bearer SUPA_KEY), e por isso a tabela tinha de ficar aberta: era o alerta crítico rls_disabled_in_public do Supabase (qualquer pessoa
// com o endereço do projeto lia, alterava e apagava as não conformidades). Agora só o servidor mexe nela, depois de conferir de quem é o dado.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao, exigirProprioOuVinculado } from '@/lib/autorizacao'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Colunas que a homologação grava. Qualquer outra (id, data_homologacao, que o banco preenche com o relógio do servidor, etc.) é descartada.
const COLUNAS = [
  'cpf_inspetor', 'cnpjoucpf', 'tipo_servico', 'numero_foto', 'data_vistoria', 'tipo_ativo', 'tag_ativo_nr_serie', 'sistema_vistoria',
  'subsistema_vistoria', 'anomalia_requisito_vistoria', 'origem_resultado', 'local_ocorrencia', 'complemento_local', 'grau_risco', 'prioridade',
  'descricao_nao_conformidade', 'descricao_causa_provavel', 'finalidade_vistoria', 'descricao_solucao_nc',
] as const

const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '')

/** Grava (ou atualiza) UMA linha da homologação. O CPF da linha é o do inspetor civil; o profissional de apoio vinculado (vistoria 39) também pode gravar. */
export async function POST(request: NextRequest) {
  try {
    const acessoApi = await exigirSessao(request)
    if (acessoApi.ok === false) return acessoApi.resposta
    const corpo = await request.json()
    const cpf = soDigitos(corpo?.cpf_inspetor)
    if (!cpf || !corpo?.cnpjoucpf || corpo?.numero_foto === undefined || corpo?.numero_foto === null) {
      return NextResponse.json({ erro: 'cpf_inspetor, cnpjoucpf e numero_foto são obrigatórios.' }, { status: 400 })
    }
    const acessoDono = await exigirProprioOuVinculado(request, cpf)
    if (acessoDono.ok === false) return acessoDono.resposta

    const linha: Record<string, unknown> = {}
    for (const coluna of COLUNAS) if (corpo[coluna] !== undefined) linha[coluna] = corpo[coluna]
    linha.cpf_inspetor = cpf

    const { error } = await supabase.from('dados_vistoria').upsert(linha)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}

/** A homologação mais recente do inspetor neste estabelecimento (a tela usa para dizer "a vistoria já foi homologada"). */
export async function GET(request: NextRequest) {
  try {
    const acessoApi = await exigirSessao(request)
    if (acessoApi.ok === false) return acessoApi.resposta
    const cpf = soDigitos(request.nextUrl.searchParams.get('cpf_inspetor'))
    const cnpj = soDigitos(request.nextUrl.searchParams.get('cnpjoucpf'))
    if (!cpf || !cnpj) return NextResponse.json({ erro: 'cpf_inspetor e cnpjoucpf são obrigatórios.' }, { status: 400 })
    const acessoDono = await exigirProprioOuVinculado(request, cpf)
    if (acessoDono.ok === false) return acessoDono.resposta

    const { data, error } = await supabase.from('dados_vistoria').select('data_homologacao')
      .eq('cpf_inspetor', cpf).eq('cnpjoucpf', cnpj).order('data_homologacao', { ascending: false }).limit(1)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ultima: data && data.length > 0 ? { data_homologacao: data[0].data_homologacao ?? null } : null })
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}

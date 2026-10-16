export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao, exigirProprio, exigirProprioOuVinculado } from '@/lib/autorizacao'

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
    const { cpf_inspetor, cnpjoucpf, tipo_servico, nome_responsavel,
            funcao_responsavel, cpf_responsavel, whatsapp_responsavel,
            email_responsavel, finalidade_vistoria } = body

    if (!cpf_inspetor || !cnpjoucpf || !tipo_servico || !nome_responsavel)
      return NextResponse.json({ erro: 'Campos obrigatórios ausentes.' }, { status: 400 })
    // DONO (AUTH_API_ATIVA): só o titular do CPF grava o contato do cliente dele.
    const acessoDono = await exigirProprio(request, cpf_inspetor)
    if (acessoDono.ok === false) return acessoDono.resposta

    const { error } = await supabase.from('contato_cliente').insert({
      cpf_inspetor, cnpjoucpf, tipo_servico,
      nome_responsavel, funcao_responsavel: funcao_responsavel || null,
      cpf_responsavel: cpf_responsavel || null,
      whatsapp_responsavel: whatsapp_responsavel || null,
      email_responsavel: email_responsavel || null,
      finalidade_vistoria: finalidade_vistoria || null
    })

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // PORTEIRO (AUTH_API_ATIVA): exige sessão válida. Inerte enquanto a variável não for exatamente "true".
  const acessoApi = await exigirSessao(request)
  if (acessoApi.ok === false) return acessoApi.resposta
  try {
    const { searchParams } = new URL(request.url)
    const cpf_inspetor = searchParams.get('cpf_inspetor')
    const cnpjoucpf    = searchParams.get('cnpjoucpf')
    const tipo_servico = searchParams.get('tipo_servico')
    // DONO (AUTH_API_ATIVA): o titular do CPF lê o contato do cliente dele; o profissional de apoio VINCULADO a ele (vistoria 39: Eng Elétrico ou
    // Eng Mecânico, pela ART registrada) lê só a FINALIDADE da vistoria, que a tela 32 dele mostra. Antes só o titular passava, e o profissional
    // levava 403 e ficava sem a finalidade. Nome, CPF, telefone e e-mail do responsável do cliente seguem só com o titular.
    const acessoDono = await exigirProprioOuVinculado(request, cpf_inspetor)
    if (acessoDono.ok === false) return acessoDono.resposta
    const soFinalidade = acessoDono.ativa && acessoDono.cpf !== String(cpf_inspetor ?? '').replace(/\D/g, '')
    const entregar = (linhas: any[]) => NextResponse.json({
      data: soFinalidade ? linhas.map(({ finalidade_vistoria, tipo_servico, data_cadastro }) => ({ finalidade_vistoria, tipo_servico, data_cadastro })) : linhas,
    })

    if (!cpf_inspetor || !cnpjoucpf)
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    // Tentar com tipo_servico primeiro
    if (tipo_servico) {
      const { data, error } = await supabase.from('contato_cliente').select('*')
        .eq('cpf_inspetor', cpf_inspetor)
        .eq('cnpjoucpf', cnpjoucpf)
        .eq('tipo_servico', tipo_servico)
        .order('data_cadastro', { ascending: false })
        .limit(1)
      if (!error && data && data.length > 0)
        return entregar(data)
    }

    // Fallback: buscar sem filtro de tipo (mais recente do CPF+CNPJ)
    const { data, error } = await supabase.from('contato_cliente').select('*')
      .eq('cpf_inspetor', cpf_inspetor)
      .eq('cnpjoucpf', cnpjoucpf)
      .order('data_cadastro', { ascending: false })
      .limit(1)

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return entregar(data ?? [])
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}

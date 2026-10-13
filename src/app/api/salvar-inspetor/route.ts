export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// src/app/api/salvar-inspetor/route.ts
// AIMÊ — Cria ou atualiza o cadastro do inspetor (chamada pela tela /inspetor)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirProprio } from '@/lib/autorizacao'
import { garantirChaveDoInspetor, chaveDoCpf } from '@/lib/chaveInspetor'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const acesso = await exigirProprio(request, body.cpf)
    if (acesso.ok === false) return acesso.resposta

    // Caso especial: cadastro antigo sem chave (chamado pelo dashboard). A chave NUNCA vem do navegador: antes este caminho
    // gravava body.chave, e quem tivesse a chave vazia podia gravar a de outro inspetor e passar a ser dono dos arquivos dele.
    // Agora o servidor grava o CPF como chave (ou devolve a que o cadastro já tem), e body.chave é ignorada.
    if (body.soAtualizarChave && body.cpf) {
      const chave = await garantirChaveDoInspetor(supabase, body.cpf)
      if (!chave) return NextResponse.json({ erro: 'Cadastro de inspetor não encontrado.' }, { status: 404 })
      return NextResponse.json({ ok: true, chave })
    }

    const {
      cpf, nome, titulo, especializacao, inscricao_crea_cau,
      whatsapp, email, cep, nr_imovel, complemento,
      cabecalho, rodape,
    } = body

    if (!cpf) return NextResponse.json({ erro: 'CPF é obrigatório' }, { status: 400 })

    const { data: existente } = await supabase
      .from('inspetor')
      .select('cpf_inspetor, chave_inspetor')
      .eq('cpf_inspetor', cpf)
      .maybeSingle()

    const dadosComuns = {
      nome_inspetor: nome,
      titulo_profissional: titulo,
      especializacao: especializacao || null,
      inscricao_crea_cau: inscricao_crea_cau,
      inspetor_whatsapp: (whatsapp ?? '').replace(/\D/g, ''),
      inspetor_email: email,
      cep_inspetor: (cep ?? '').replace(/\D/g, ''),
      nr_imovel: nr_imovel,
      nr_ap_sala: complemento || '',  // coluna tem NOT NULL, sem valor default — string vazia, nao null
      cabecalho_documentos: cabecalho || null,
      rodape_documentos: rodape || null,
    }

    if (existente) {
      const { error } = await supabase
        .from('inspetor')
        .update(dadosComuns)
        .eq('cpf_inspetor', cpf)
      if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, chave: existente.chave_inspetor })
    }

    // Novo cadastro: a chave é o CPF (src/lib/chaveInspetor.ts), nunca um valor vindo do navegador.
    const chave = chaveDoCpf(cpf)

    const { error: errInsert } = await supabase.from('inspetor').insert({
      cpf_inspetor: cpf,
      chave_inspetor: chave,
      situacao_aplicativo: 'Ativo',
      qtd_servicos_exec: 0,
      data_cadastro: new Date().toISOString().slice(0, 10),
      ...dadosComuns,
    })
    if (errInsert) return NextResponse.json({ erro: errInsert.message }, { status: 500 })

    return NextResponse.json({ ok: true, chave })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

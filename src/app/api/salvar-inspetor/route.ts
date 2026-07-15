// src/app/api/salvar-inspetor/route.ts
// AIMÊ — Cria ou atualiza o cadastro do inspetor (chamada pela tela /inspetor)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
      nr_ap_sala: complemento || null,
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

    // Novo cadastro: gera a chave sequencial
    const chaveRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : ''}${request.nextUrl.origin}/api/gerar-chave-inspetor`, { method: 'POST' })
    const chaveData = await chaveRes.json()
    if (!chaveRes.ok || !chaveData.chave) {
      return NextResponse.json({ erro: 'Não foi possível gerar a chave do inspetor' }, { status: 500 })
    }

    const { error: errInsert } = await supabase.from('inspetor').insert({
      cpf_inspetor: cpf,
      chave_inspetor: chaveData.chave,
      situacao_aplicativo: 'Ativo',
      qtd_servicos_exec: 0,
      data_cadastro: new Date().toISOString().slice(0, 10),
      ...dadosComuns,
    })
    if (errInsert) return NextResponse.json({ erro: errInsert.message }, { status: 500 })

    return NextResponse.json({ ok: true, chave: chaveData.chave })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

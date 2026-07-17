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

    // Caso especial: só atualizar a chave_inspetor (chamado pelo dashboard
    // quando detecta um registro antigo sem chave)
    if (body.soAtualizarChave && body.cpf && body.chave) {
      const { error } = await supabase
        .from('inspetor')
        .update({ chave_inspetor: body.chave })
        .eq('cpf_inspetor', body.cpf)
        .is('chave_inspetor', null)
      if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
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

    // Novo cadastro: gera a chave sequencial (direto, sem chamar outra rota via HTTP —
    // fazer uma rota chamar a outra por fetch pode travar/pendurar na Vercel)
    const { data: ultimo } = await supabase
      .from('inspetor')
      .select('chave_inspetor')
      .not('chave_inspetor', 'is', null)
      .order('chave_inspetor', { ascending: false })
      .limit(1)

    let proximoNumero = 1
    if (ultimo && ultimo.length > 0 && ultimo[0].chave_inspetor) {
      const match = String(ultimo[0].chave_inspetor).match(/(\d+)$/)
      if (match) proximoNumero = parseInt(match[1], 10) + 1
    }
    const chave = 'INS-' + String(proximoNumero).padStart(3, '0')

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

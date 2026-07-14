// src/app/api/atualizar-contador-servico/route.ts
// AIMÊ — Item (h) da especificação 2.10: ao homologar um documento do grupo 4x (Laudos),
// soma 1 em qtd_servicos_exec do inspetor e ajusta o saldo do contrato conforme o tipo de assinatura.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { cpfInspetor } = await request.json()
    if (!cpfInspetor) return NextResponse.json({ erro: 'cpfInspetor é obrigatório' }, { status: 400 })

    // 1. Ler e incrementar qtd_servicos_exec do inspetor
    const { data: insp, error: errInsp } = await supabase
      .from('inspetor')
      .select('qtd_servicos_exec')
      .eq('cpf_inspetor', cpfInspetor)
      .single()
    if (errInsp || !insp) return NextResponse.json({ erro: 'Inspetor não encontrado' }, { status: 404 })

    const novaQtd = (insp.qtd_servicos_exec ?? 0) + 1
    const { error: errUpdInsp } = await supabase
      .from('inspetor')
      .update({ qtd_servicos_exec: novaQtd })
      .eq('cpf_inspetor', cpfInspetor)
    if (errUpdInsp) return NextResponse.json({ erro: errUpdInsp.message }, { status: 500 })

    // 2. Ler contrato (chave = cpf_inspetor) e ajustar saldo_quantidade
    const { data: contrato } = await supabase
      .from('contratos_inspetor')
      .select('tipo_assinatura, saldo_quantidade, data_inicio_contrato')
      .eq('cpf_inspetor', cpfInspetor)
      .single()

    let novoSaldo: number | null = null
    if (contrato) {
      const tipo = contrato.tipo_assinatura
      novoSaldo = contrato.saldo_quantidade

      if (tipo === 'Serviço' || tipo === 'Cortesia') {
        novoSaldo = Math.max(0, novoSaldo - 1)
      }
      if (tipo === 'Cortesia') {
        const inicio = new Date(contrato.data_inicio_contrato)
        const hoje = new Date()
        const dias = Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
        if (dias > 15) novoSaldo = 0
      }

      await supabase
        .from('contratos_inspetor')
        .update({ saldo_quantidade: novoSaldo })
        .eq('cpf_inspetor', cpfInspetor)
    }

    return NextResponse.json({ ok: true, qtdServicosExec: novaQtd, saldoQuantidade: novoSaldo })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

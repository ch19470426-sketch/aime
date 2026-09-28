// src/app/api/creditos/pedido/route.ts
// AIMÊ — Pedidos de contratação de plano/créditos avulsos.
//
// Preparação para o Asaas: este endpoint só REGISTRA a intenção de compra
// (tabela pedidos_credito, status 'aguardando_pagamento'). Nenhum crédito é
// concedido aqui — a concessão virá do webhook de pagamento confirmado, na
// etapa de instalação do Asaas.
//
// O CPF vem da sessão validada no servidor (nunca do corpo). Gestor é
// isento: não contrata, não recebe pedido.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cpfDaSessao } from '@/lib/sessaoServidor'
import { AVULSO_MAXIMO, AVULSO_MULTIPLO, PLANO_CR, ehGestor } from '@/lib/creditos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const MIGRACAO_PENDENTE = 'Recurso de contratação ainda não habilitado neste ambiente.'

/** Lista os últimos pedidos do usuário logado. */
export async function GET(request: NextRequest) {
  const cpf = await cpfDaSessao(request)
  if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })

  const { data, error } = await admin()
    .from('pedidos_credito')
    .select('id,tipo,qde_creditos,status,criado_em,pago_em')
    .eq('cpf_inspetor', cpf)
    .order('criado_em', { ascending: false })
    .limit(20)

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ pedidos: [] })   // tabela ainda não existe
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
  return NextResponse.json({ pedidos: data ?? [] })
}

/** Cria (ou reaproveita) um pedido de contratação. */
export async function POST(request: NextRequest) {
  try {
    const cpf = await cpfDaSessao(request)
    if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })

    // Gestor não contrata créditos
    if ((await ehGestor(cpf)) === true) {
      return NextResponse.json(
        { isento: true, erro: 'Perfil de gestor: isento de contratação de créditos.' },
        { status: 409 }
      )
    }

    const { tipo, qdeAvulso } = await request.json()

    let qde: number
    if (tipo === 'AVULSO') {
      qde = Number(qdeAvulso)
      if (!Number.isInteger(qde) || qde <= 0 || qde % AVULSO_MULTIPLO !== 0 || qde > AVULSO_MAXIMO) {
        return NextResponse.json(
          { erro: `Quantidade avulsa deve ser múltiplo de ${AVULSO_MULTIPLO}, até ${AVULSO_MAXIMO}.` },
          { status: 400 }
        )
      }
    } else if (typeof tipo === 'string' && PLANO_CR[tipo]) {
      qde = PLANO_CR[tipo]     // PLANO CORTESIA não é vendável: só concedido pela gestão
    } else {
      return NextResponse.json({ erro: 'Tipo de contratação inválido.' }, { status: 400 })
    }

    const supabase = admin()

    // Evita empilhar pedidos idênticos: reaproveita o que já está aguardando
    const { data: existente, error: errBusca } = await supabase
      .from('pedidos_credito')
      .select('id,tipo,qde_creditos,status,criado_em')
      .eq('cpf_inspetor', cpf).eq('tipo', tipo).eq('qde_creditos', qde)
      .eq('status', 'aguardando_pagamento')
      .maybeSingle()
    if (errBusca) {
      if (errBusca.code === '42P01') return NextResponse.json({ erro: MIGRACAO_PENDENTE }, { status: 503 })
      return NextResponse.json({ erro: errBusca.message }, { status: 500 })
    }
    if (existente) {
      return NextResponse.json({ ok: true, reaproveitado: true, pedido: existente, pagamento: 'indisponivel' })
    }

    const { data: novo, error } = await supabase
      .from('pedidos_credito')
      .insert({ cpf_inspetor: cpf, tipo, qde_creditos: qde })
      .select('id,tipo,qde_creditos,status,criado_em')
      .single()
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    // 'indisponivel' = pagamento online ainda não instalado (Asaas).
    // Quando o Asaas for instalado, é AQUI que a cobrança é criada e o
    // link/PIX devolvido ao usuário.
    return NextResponse.json({ ok: true, pedido: novo, pagamento: 'indisponivel' })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

// src/app/api/creditos/assinatura/route.ts
// AIMÊ — Assinatura mensal (PLANO MENSAL / PLANO ESCRITÓRIO) pelo Asaas.
//
//   POST   { tipo }  cria a assinatura e devolve o link da 1ª cobrança (o cartão é digitado na
//                    página do próprio Asaas — o AIMÊ nunca toca em dados de cartão).
//   DELETE           cancela a assinatura em andamento do usuário logado.
//
// Nenhum crédito é concedido aqui: a concessão (inclusive das renovações) acontece em
// /api/asaas-webhook, quando o Asaas confirma cada pagamento. O CPF vem da sessão validada
// no servidor, nunca do corpo. Gestor é isento. Serviço e Avulso não são assináveis.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cpfDaSessao } from '@/lib/sessaoServidor'
import { PLANO_CR, ehGestor, precoCentavos } from '@/lib/creditos'
import {
  acharOuCriarCliente, criarAssinatura, listarCobrancasDaAssinatura, cancelarAssinaturaNoAsaas,
} from '@/lib/asaas'
import { TIPOS_ASSINAVEIS, STATUS_EM_ANDAMENTO, hojeBrasilia, avisarInspetor } from '@/lib/assinaturas'
import { agoraBrasilia } from '@/lib/emailSuporte'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MIGRACAO_PENDENTE = 'Recurso de assinatura ainda não habilitado neste ambiente.'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function publica(a: any) {
  return { id: a.id, tipo: a.tipo, status: a.status, valor: Number(a.valor), proximaCobranca: a.proxima_cobranca ?? null }
}

/** Cancela no Asaas e na nossa base (e os pedidos ainda não pagos dessa assinatura). */
async function encerrarAssinatura(supabase: ReturnType<typeof admin>, a: any): Promise<void> {
  if (a.asaas_subscription_id) {
    try {
      await cancelarAssinaturaNoAsaas(a.asaas_subscription_id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // Já inexistente no Asaas (cancelada pelo painel deles): segue só com a nossa base.
      if (!/n[ãa]o encontrad|not found|404/i.test(msg)) throw e
    }
  }
  await supabase.from('assinaturas').update({ status: 'cancelada', cancelada_em: agoraBrasilia() }).eq('id', a.id)
  await supabase.from('pedidos_credito').update({ status: 'cancelado' })
    .eq('assinatura_id', a.id).eq('status', 'aguardando_pagamento')
}

export async function POST(request: NextRequest) {
  try {
    const cpf = await cpfDaSessao(request)
    if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })

    if ((await ehGestor(cpf)) === true) {
      return NextResponse.json({ isento: true, erro: 'Perfil de gestor: isento de contratação de créditos.' }, { status: 409 })
    }

    const { tipo } = await request.json().catch(() => ({}))
    if (!TIPOS_ASSINAVEIS.includes(tipo)) {
      return NextResponse.json({ erro: 'Só o Plano Mensal e o Plano Escritório podem ser assinados.' }, { status: 400 })
    }
    const qde = PLANO_CR[tipo]
    const valorCentavos = precoCentavos(tipo, qde)
    if (valorCentavos === null) return NextResponse.json({ erro: 'Preço não definido para este plano.' }, { status: 400 })

    const supabase = admin()

    // Já existe assinatura em andamento?
    const { data: atual, error: errAtual } = await supabase
      .from('assinaturas').select('*').eq('cpf_inspetor', cpf).in('status', STATUS_EM_ANDAMENTO).maybeSingle()
    if (errAtual) {
      if (errAtual.code === '42P01') return NextResponse.json({ erro: MIGRACAO_PENDENTE }, { status: 503 })
      return NextResponse.json({ erro: errAtual.message }, { status: 500 })
    }
    if (atual) {
      if (atual.tipo === tipo && atual.status === 'ativa') {
        return NextResponse.json({ erro: 'Você já assina este plano.' }, { status: 409 })
      }
      if (atual.tipo === tipo && atual.status === 'aguardando_primeiro_pagamento' && atual.asaas_subscription_id) {
        // Retoma: devolve o link ATUAL da 1ª cobrança, sem criar outra assinatura.
        let invoiceUrl: string | null = null
        try { invoiceUrl = (await listarCobrancasDaAssinatura(atual.asaas_subscription_id))[0]?.invoiceUrl ?? null } catch { /* segue */ }
        return NextResponse.json({
          ok: true, reaproveitada: true, assinatura: publica(atual),
          pagamento: invoiceUrl ? { invoiceUrl } : 'indisponivel',
        })
      }
      // Outro plano (troca), ou cobrança recusada (inadimplente): encerra a anterior e começa a nova.
      try { await encerrarAssinatura(supabase, atual) } catch (e) {
        return NextResponse.json({ erro: `Não foi possível encerrar a assinatura anterior: ${e instanceof Error ? e.message : e}` }, { status: 502 })
      }
    }

    const { data: insp } = await supabase
      .from('inspetor').select('nome_inspetor,inspetor_email,inspetor_whatsapp').eq('cpf_inspetor', cpf).maybeSingle()

    const { data: nova, error: errIns } = await supabase
      .from('assinaturas').insert({ cpf_inspetor: cpf, tipo, valor: valorCentavos / 100 }).select('*').single()
    if (errIns) return NextResponse.json({ erro: errIns.message }, { status: 500 })

    // 1) Cria no Asaas. Se falhar aqui, nada ficou lá: marca a nossa linha como cancelada para liberar nova tentativa.
    let sub
    try {
      const cliente = await acharOuCriarCliente(cpf, insp?.nome_inspetor ?? cpf, {
        email: insp?.inspetor_email, telefone: insp?.inspetor_whatsapp,
      })
      sub = await criarAssinatura({
        clienteId: cliente.id, valorCentavos,
        descricao: `AIMÊ — ${tipo} (assinatura mensal)`,
        referenciaExterna: String(nova.id), primeiroVencimento: hojeBrasilia(),
      })
    } catch (e) {
      await supabase.from('assinaturas').update({ status: 'cancelada', cancelada_em: agoraBrasilia() }).eq('id', nova.id)
      return NextResponse.json({ erro: `Não foi possível iniciar a assinatura: ${e instanceof Error ? e.message : e}` }, { status: 502 })
    }

    // 2) Liga a assinatura do Asaas à nossa linha — sem esse vínculo o webhook não reconhece as cobranças.
    const { error: errVinculo } = await supabase
      .from('assinaturas').update({ asaas_subscription_id: sub.id, proxima_cobranca: sub.nextDueDate ?? hojeBrasilia() }).eq('id', nova.id)
    if (errVinculo) {
      try { await cancelarAssinaturaNoAsaas(sub.id) } catch { /* melhor esforço */ }
      await supabase.from('assinaturas').update({ status: 'cancelada', cancelada_em: agoraBrasilia() }).eq('id', nova.id)
      return NextResponse.json({ erro: 'Não foi possível registrar a assinatura. Nada foi cobrado; tente novamente.' }, { status: 500 })
    }

    // 3) Link da 1ª cobrança + o 1º pedido (para o inspetor poder retomar o pagamento). Melhor esforço.
    let primeira: { id: string; invoiceUrl: string } | null = null
    try { primeira = (await listarCobrancasDaAssinatura(sub.id))[0] ?? null } catch { /* segue */ }
    if (primeira) {
      await supabase.from('pedidos_credito').insert({
        cpf_inspetor: cpf, tipo, qde_creditos: qde, valor: valorCentavos / 100,
        asaas_payment_id: primeira.id, assinatura_id: nova.id,
      })
    }

    return NextResponse.json({
      ok: true,
      assinatura: publica({ ...nova, proxima_cobranca: sub.nextDueDate ?? hojeBrasilia() }),
      pagamento: primeira ? { invoiceUrl: primeira.invoiceUrl } : 'indisponivel',
    })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cpf = await cpfDaSessao(request)
    if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })

    const supabase = admin()
    const { data: atual, error } = await supabase
      .from('assinaturas').select('*').eq('cpf_inspetor', cpf).in('status', STATUS_EM_ANDAMENTO).maybeSingle()
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ erro: MIGRACAO_PENDENTE }, { status: 503 })
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }
    if (!atual) return NextResponse.json({ erro: 'Você não tem assinatura em andamento.' }, { status: 404 })

    try { await encerrarAssinatura(supabase, atual) } catch (e) {
      return NextResponse.json({ erro: `Não foi possível cancelar agora: ${e instanceof Error ? e.message : e}` }, { status: 502 })
    }

    await avisarInspetor(cpf, 'AIMÊ — Assinatura cancelada', [
      { tipo: 'p', texto: `Sua assinatura do ${atual.tipo} foi cancelada e não haverá novas cobranças.` },
      { tipo: 'p', texto: 'Os créditos do período que você já pagou continuam valendo até o fim dele.' },
    ])
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

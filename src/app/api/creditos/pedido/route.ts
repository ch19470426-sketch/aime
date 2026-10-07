// src/app/api/creditos/pedido/route.ts
// AIMÊ — Pedidos de contratação de plano/créditos avulsos.
//
// Cria o pedido (tabela pedidos_credito, status 'aguardando_pagamento') e a
// cobrança correspondente no Asaas (PIX ou cartão). Nenhum crédito é
// concedido aqui — a concessão acontece em /api/asaas-webhook, quando o
// Asaas confirma que o pagamento foi recebido de verdade.
//
// O CPF vem da sessão validada no servidor (nunca do corpo). Gestor é
// isento: não contrata, não recebe pedido.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cpfDaSessao } from '@/lib/sessaoServidor'
import { AVULSO_MAXIMO, AVULSO_MULTIPLO, PLANO_CR, ehGestor, precoCentavos, podeComprarAvulso } from '@/lib/creditos'
import { contaBloqueada } from '@/lib/bloqueio'
import { acharOuCriarCliente, criarCobranca, consultarCobranca, buscarPixQrCode, type FormaPagamento, cancelarCobranca } from '@/lib/asaas'

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
/** O que a tela precisa para pagar: link, forma e, no PIX, o QR Code (também ao reaproveitar). */
async function montarPagamento(cobranca: { id: string; invoiceUrl: string }, forma: string) {
  const base: Record<string, unknown> = { invoiceUrl: cobranca.invoiceUrl, forma }
  if (forma === 'PIX') {
    const pix = await buscarPixQrCode(cobranca.id)
    if (pix) Object.assign(base, pix)
  }
  return base
}

export async function POST(request: NextRequest) {
  try {
    const cpf = await cpfDaSessao(request)
    if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })

    // Conta bloqueada (estorno, chargeback ou cartão recusado 3 vezes) não contrata créditos nem assina.
    if ((await contaBloqueada(cpf)).bloqueada) return NextResponse.json({ erro: 'Conta bloqueada. Entre em contato com o suporte: suporte@aime.eng.br.', bloqueada: true }, { status: 403 })

    // Gestor não contrata créditos
    if ((await ehGestor(cpf)) === true) {
      return NextResponse.json(
        { isento: true, erro: 'Perfil de gestor: isento de contratação de créditos.' },
        { status: 409 }
      )
    }

    const { tipo, qdeAvulso, forma } = await request.json()

    const formasValidas: FormaPagamento[] = ['PIX', 'CREDIT_CARD']
    if (!formasValidas.includes(forma)) {
      return NextResponse.json({ erro: 'Forma de pagamento deve ser PIX ou CREDIT_CARD.' }, { status: 400 })
    }

    let qde: number
    if (tipo === 'AVULSO') {
      qde = Number(qdeAvulso)
      if (!Number.isInteger(qde) || qde <= 0 || qde % AVULSO_MULTIPLO !== 0 || qde > AVULSO_MAXIMO) {
        return NextResponse.json(
          { erro: `Quantidade avulsa deve ser múltiplo de ${AVULSO_MULTIPLO}, até ${AVULSO_MAXIMO}.` },
          { status: 400 }
        )
      }
      // Regra de Celso (29/09/2026): avulso só para quem já tem PLANO MENSAL
      // ou PLANO ESCRITÓRIO vigente — não é uma opção "de entrada".
      if (!(await podeComprarAvulso(cpf))) {
        return NextResponse.json(
          { erro: 'Créditos avulsos só podem ser contratados por quem já tem o PLANO MENSAL ou PLANO ESCRITÓRIO ativo.' },
          { status: 403 }
        )
      }
    } else if (typeof tipo === 'string' && PLANO_CR[tipo]) {
      qde = PLANO_CR[tipo]     // PLANO CORTESIA não é vendável: só concedido pela gestão
    } else {
      return NextResponse.json({ erro: 'Tipo de contratação inválido.' }, { status: 400 })
    }

    const valorCentavos = precoCentavos(tipo, qde)
    if (valorCentavos === null) {
      return NextResponse.json({ erro: 'Preço não definido para este item.' }, { status: 400 })
    }

    const supabase = admin()

    // Pedidos de COMPRA ÚNICA ainda pendentes deste item (assinatura_id nulo: o pedido de uma
    // assinatura é cobrado por ela e nunca é reaproveitado aqui). Podem ser VÁRIOS (tentativas
    // antigas, formas de pagamento diferentes), então nada aqui exige "exatamente um" nem
    // assume que o mais recente é o da forma pedida (achados de Celso, 06/10/2026).
    const { data: pendentes, error: errBusca } = await supabase
      .from('pedidos_credito')
      .select('id,tipo,qde_creditos,status,criado_em,asaas_payment_id')
      .eq('cpf_inspetor', cpf).eq('tipo', tipo).eq('qde_creditos', qde)
      .eq('status', 'aguardando_pagamento')
      .is('assinatura_id', null)
      .order('criado_em', { ascending: false })
      .limit(5)
    if (errBusca) {
      if (errBusca.code === '42P01') return NextResponse.json({ erro: MIGRACAO_PENDENTE }, { status: 503 })
      return NextResponse.json({ erro: errBusca.message }, { status: 500 })
    }

    if (pendentes && pendentes.length > 0) {
      // Forma e link ATUAIS de cada cobrança pendente, direto do Asaas.
      const cobrancas: Array<Awaited<ReturnType<typeof consultarCobranca>> | null> = []
      for (const p of pendentes) {
        try { cobrancas.push(p.asaas_payment_id ? await consultarCobranca(p.asaas_payment_id) : null) } catch { cobrancas.push(null) }
      }
      // Sem conseguir consultar alguma (Asaas fora do ar?): não arrisca duplicar nem cancelar nada.
      if (cobrancas.some(cb => cb === null)) {
        return NextResponse.json({ ok: true, reaproveitado: true, pedido: pendentes[0], pagamento: 'indisponivel' })
      }

      // Remove as cobranças que não vamos usar. O Asaas RECUSA remover uma já paga: nesse caso o
      // pedido continua pendente e o webhook cuida dele — nunca cancelamos algo que foi pago.
      const removerOutros = async (manter: number | null): Promise<boolean> => {
        let todos = true
        for (let k = 0; k < pendentes.length; k++) {
          if (k === manter) continue
          try {
            await cancelarCobranca(pendentes[k].asaas_payment_id!)
            await supabase.from('pedidos_credito').update({ status: 'cancelado' })
              .eq('id', pendentes[k].id).eq('status', 'aguardando_pagamento')
          } catch { todos = false }
        }
        return todos
      }

      // Já existe uma na forma pedida? Reaproveita ESSA (e limpa as redundantes). Forma que o
      // Asaas não informa conta como a mesma, para não trocar à toa.
      const k = cobrancas.findIndex(cb => (cb!.billingType ?? forma) === forma)
      if (k >= 0) {
        await removerOutros(k)
        return NextResponse.json({
          ok: true, reaproveitado: true, pedido: pendentes[k],
          pagamento: await montarPagamento(cobrancas[k]!, forma),
        })
      }

      // Nenhuma na forma pedida (ex.: só há cartão e agora é PIX): remove as antigas e cria a nova.
      // Se alguma não puder ser removida, devolve a mais recente como está, com um aviso.
      if (!(await removerOutros(null))) {
        return NextResponse.json({
          ok: true, reaproveitado: true, pedido: pendentes[0],
          pagamento: await montarPagamento(cobrancas[0]!, cobrancas[0]!.billingType ?? forma),
          aviso: 'Não foi possível trocar a forma de pagamento deste pedido agora. Use o link abaixo ou tente de novo em instantes.',
        })
      }
    }

    // Busca o nome do inspetor — o Asaas exige um nome para o cliente
    const { data: insp } = await supabase.from('inspetor').select('nome_inspetor,inspetor_email,inspetor_whatsapp').eq('cpf_inspetor', cpf).maybeSingle()
    const nomeInspetor = insp?.nome_inspetor ?? cpf

    const { data: novo, error } = await supabase
      .from('pedidos_credito')
      .insert({ cpf_inspetor: cpf, tipo, qde_creditos: qde, valor: valorCentavos / 100 })
      .select('id,tipo,qde_creditos,status,criado_em')
      .single()
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    try {
      const cliente = await acharOuCriarCliente(cpf, nomeInspetor, { email: insp?.inspetor_email, telefone: insp?.inspetor_whatsapp })
      const cobranca = await criarCobranca({
        clienteId: cliente.id,
        forma: forma as FormaPagamento,
        valorCentavos,
        descricao: `AIMÊ — ${tipo}${tipo === 'AVULSO' ? ` (${qde} CR)` : ''}`,
        referenciaExterna: String(novo.id),
      })
      await supabase.from('pedidos_credito').update({ asaas_payment_id: cobranca.id }).eq('id', novo.id)

      return NextResponse.json({
        ok: true, pedido: novo,
        pagamento: {
          invoiceUrl: cobranca.invoiceUrl,
          forma,
          ...(cobranca.pixQrCode ? { pixQrCode: cobranca.pixQrCode, pixCopiaECola: cobranca.pixCopiaECola } : {}),
        },
      })
    } catch (erroAsaas) {
      // O pedido já foi registrado (nada perdido) — mas a cobrança em si
      // falhou. Devolve o pedido mesmo assim, sinalizando o problema, para
      // o usuário poder tentar de novo sem duplicar o registro (o "existe
      // pedido pendente" acima vai reaproveitar na próxima tentativa).
      return NextResponse.json({
        ok: true, pedido: novo, pagamento: 'erro',
        avisoAsaas: String(erroAsaas instanceof Error ? erroAsaas.message : erroAsaas),
      })
    }
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

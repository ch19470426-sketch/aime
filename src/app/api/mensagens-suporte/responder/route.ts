// src/app/api/mensagens-suporte/responder/route.ts
// AIMÊ — Painel do Gestor: envia a resposta a uma mensagem do Fale Conosco
// por e-mail (de suporte@aime.eng.br, com logo e assinatura da Equipe AIMÊ),
// guarda o texto no histórico e marca a mensagem como respondida.
// Pedido de Celso, 05/10/2026.
//
// Só marca como respondida se o e-mail foi de fato aceito pelo Resend — se o
// envio falhar (ex.: domínio ainda não verificado), devolve o erro real.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { exigirGestor } from '@/lib/autorizacao'
import { REMETENTE_SUPORTE, EMAIL_SUPORTE, montarEmailResposta, agoraBrasilia } from '@/lib/emailSuporte'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const acesso = await exigirGestor(request)
  if (acesso.ok === false) return acesso.resposta

  try {
    const { id, resposta } = await request.json()
    const texto = String(resposta ?? '').trim()
    if (!id || !texto) {
      return NextResponse.json({ erro: 'Escreva a resposta antes de enviar.' }, { status: 400 })
    }
    if (texto.length > 5000) {
      return NextResponse.json({ erro: 'A resposta está longa demais (máximo de 5.000 caracteres).' }, { status: 400 })
    }

    const { data: msg } = await supabase
      .from('mensagens_suporte')
      .select('id, cpf_inspetor, nome_inspetor, assunto, mensagem')
      .eq('id', id).maybeSingle()
    if (!msg) return NextResponse.json({ erro: 'Mensagem não encontrada.' }, { status: 404 })

    const { data: insp } = await supabase
      .from('inspetor').select('inspetor_email').eq('cpf_inspetor', msg.cpf_inspetor).maybeSingle()
    const destino = (insp?.inspetor_email ?? '').trim()
    if (!destino) {
      return NextResponse.json(
        { erro: 'Este inspetor não tem e-mail cadastrado. Responda pelo WhatsApp.' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    // O SDK do Resend NÃO lança exceção em erro da API — devolve { error }.
    const { error: erroEnvio } = await resend.emails.send({
      from: REMETENTE_SUPORTE,
      to: destino,
      reply_to: EMAIL_SUPORTE,
      subject: `Re: ${msg.assunto}`,
      html: montarEmailResposta({
        nome: msg.nome_inspetor, resposta: texto,
        assuntoOriginal: msg.assunto, mensagemOriginal: msg.mensagem,
      }),
    })
    if (erroEnvio) {
      console.error('[mensagens-suporte/responder] Resend recusou o envio:', erroEnvio)
      return NextResponse.json(
        { erro: `Não foi possível enviar o e-mail: ${erroEnvio.message}` }, { status: 502 })
    }

    const { error: erroGravar } = await supabase
      .from('mensagens_suporte')
      .update({ resposta: texto, status: 'respondido', respondido_em: agoraBrasilia() })
      .eq('id', id)
    if (erroGravar) {
      return NextResponse.json(
        { erro: `O e-mail foi enviado, mas não foi possível registrar no histórico: ${erroGravar.message}`, enviado: true },
        { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

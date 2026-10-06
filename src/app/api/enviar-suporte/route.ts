// src/app/api/enviar-suporte/route.ts
// AIMÊ — Recebe uma mensagem de "Fale Conosco" do inspetor: grava em
// mensagens_suporte (histórico, visível no Painel do Gestor) e envia
// e-mail para a equipe de suporte. Pedido de Celso, 03/10/2026.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { cpfDaSessao } from '@/lib/sessaoServidor'
import { EMAIL_SUPORTE, REMETENTE_SUPORTE, montarEmailSimples } from '@/lib/emailSuporte'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const cpf = await cpfDaSessao(request)
    if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })

    const { assunto, mensagem } = await request.json()
    if (!assunto?.trim() || !mensagem?.trim()) {
      return NextResponse.json({ erro: 'Assunto e mensagem são obrigatórios.' }, { status: 400 })
    }

    const { data: insp } = await supabase
      .from('inspetor').select('nome_inspetor').eq('cpf_inspetor', cpf).maybeSingle()
    const nome = insp?.nome_inspetor ?? cpf

    const { data: registro, error: erroInsert } = await supabase
      .from('mensagens_suporte')
      .insert({ cpf_inspetor: cpf, nome_inspetor: nome, assunto: assunto.trim(), mensagem: mensagem.trim() })
      .select('id').single()
    if (erroInsert) return NextResponse.json({ erro: erroInsert.message }, { status: 500 })

    // E-mail e best-effort: a mensagem ja esta gravada (historico garantido)
    // mesmo que o envio falhe.
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const email = montarEmailSimples({
        blocos: [
          { tipo: 'campos', itens: [['Nome', nome], ['CPF', cpf], ['Assunto', assunto.trim()]] },
          { tipo: 'citacao', titulo: 'Mensagem', texto: mensagem.trim() },
          { tipo: 'p', texto: 'Acesse o Painel Gestor → Fale Conosco para responder e marcar como respondido.' },
        ],
      })
      // O SDK do Resend NAO lanca excecao em erro da API - devolve { error }.
      // Antes isso era ignorado, entao uma falha de envio passava em silencio.
      const { error: erroEnvio } = await resend.emails.send({
        from: REMETENTE_SUPORTE,
        to: EMAIL_SUPORTE,
        subject: `AIMÊ — Fale Conosco — ${assunto.trim().replace(/[\r\n]+/g, ' ')}`,
        html: email.html,
        text: email.text,
      })
      if (erroEnvio) console.error('[enviar-suporte] Resend recusou o aviso para a equipe:', erroEnvio)
    } catch (e) { console.error('[enviar-suporte] falha ao enviar aviso:', e) /* ja esta gravada no banco, nao falha a requisicao por causa do e-mail */ }

    return NextResponse.json({ ok: true, id: registro.id })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { REMETENTE_SUPORTE, montarEmailSimples } from '@/lib/emailSuporte'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { cpf, nome, planoDesejado } = await request.json()

    // Buscar e-mail do gestor
    const { data: gestores } = await supabase
      .from('inspetor')
      .select('inspetor_email, nome_inspetor')
      .eq('is_gestor', true)
      .limit(1)

    const emailGestor = gestores?.[0]?.inspetor_email
    if (!emailGestor) return NextResponse.json({ erro: 'Gestor não encontrado.' }, { status: 500 })

    const resend = new Resend(process.env.RESEND_API_KEY)
    const email = montarEmailSimples({
      blocos: [
        { tipo: 'p', texto: 'O inspetor abaixo solicitou a troca de plano:' },
        { tipo: 'campos', itens: [['Nome', String(nome ?? '')], ['CPF', String(cpf ?? '')], ['Plano desejado', String(planoDesejado ?? '')]] },
        { tipo: 'p', texto: 'Acesse o Painel Gestor para atribuir o novo plano ao inspetor.' },
      ],
    })
    const { error } = await resend.emails.send({
      from: REMETENTE_SUPORTE,
      to: emailGestor,
      subject: `AIMÊ — Solicitação de troca de plano — ${String(nome ?? '').replace(/[\r\n]+/g, ' ')}`,
      html: email.html,
        text: email.text,
    })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

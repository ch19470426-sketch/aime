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
    const { cpf } = await request.json()
    if (!cpf) return NextResponse.json({ erro: 'CPF obrigatório' }, { status: 400 })

    const cpfLimpo = cpf.replace(/\D/g, '')

    // 1. Buscar e-mail real na tabela inspetor
    const { data: insp } = await supabase
      .from('inspetor')
      .select('inspetor_email')
      .eq('cpf_inspetor', cpfLimpo)
      .single()

    // Mensagem genérica — nunca revela se o CPF existe
    if (!insp?.inspetor_email) return NextResponse.json({ ok: true })

    const emailReal = insp.inspetor_email as string
    const emailTecnico = `${cpfLimpo}@aime-app.com.br`
    const origem = 'https://aime-7h4a.vercel.app'

    // 2. Gerar link de recuperação via Supabase Admin
    const { data: linkData, error: errLink } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: emailTecnico,
      options: { redirectTo: `${origem}/nova-senha` }
    })

    if (errLink || !linkData?.properties?.action_link) {
      console.error('[AIMÊ] erro ao gerar link:', errLink?.message)
      return NextResponse.json({ erro: 'Erro ao gerar link. Tente novamente.' }, { status: 500 })
    }

    const linkRecuperacao = linkData.properties.action_link
      .replace('http://localhost:3000', origem)
      .replace('https://localhost:3000', origem)

    // 3. Enviar e-mail real via Resend
    const resend = new Resend(process.env.RESEND_API_KEY)
    const email = montarEmailSimples({
      blocos: [
        { tipo: 'p', texto: 'Recebemos uma solicitação de redefinição de senha para a sua conta no AIMÊ. Use o link abaixo para criar uma nova senha. O link é válido por 1 hora.' },
        { tipo: 'link', rotulo: 'Redefinir minha senha', url: linkRecuperacao, mostrarUrl: true },
        { tipo: 'p', texto: 'Se você não solicitou a redefinição, ignore este e-mail. Sua senha permanece a mesma.' },
      ],
      assinatura: true,
    })
    const { error: errEmail } = await resend.emails.send({
      from: REMETENTE_SUPORTE, // dominio aime.eng.br verificado no Resend (o remetente de teste so entrega no e-mail do dono da conta)
      to: emailReal,
      subject: 'AIMÊ — Redefinição de senha',
      html: email.html,
        text: email.text,
    })

    if (errEmail) {
      console.error('[AIMÊ] erro ao enviar e-mail:', errEmail)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[AIMÊ] erro recuperar-senha:', err)
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

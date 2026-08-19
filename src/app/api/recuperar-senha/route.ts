import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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
    const { error: errEmail } = await resend.emails.send({
      from: 'AIMÊ <onboarding@resend.dev>',
      to: emailReal,
      subject: 'AIMÊ — Redefinição de senha',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <div style="background:#1E3A8A;padding:24px;text-align:center">
            <div style="color:white;font-size:28px;font-weight:900;letter-spacing:2px">AIMÊ</div>
            <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px">Mapeamento Inteligente de Edificações e Equipamentos</div>
          </div>
          <div style="padding:32px;background:#f8fafc">
            <h2 style="color:#1E3A8A;margin:0 0 16px">Redefinição de senha</h2>
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px">
              Recebemos uma solicitação de redefinição de senha para sua conta no AIMÊ.<br>
              Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
            </p>
            <div style="text-align:center;margin:32px 0">
              <a href="${linkRecuperacao}"
                style="background:#1E3A8A;color:white;padding:14px 36px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
                Redefinir minha senha
              </a>
            </div>
            <p style="color:#6b7280;font-size:12px;margin:0 0 8px">
              Se você não solicitou a redefinição, ignore este e-mail. Sua senha permanece a mesma.
            </p>
            <p style="color:#6b7280;font-size:12px;margin:0">
              Caso o botão não funcione, copie e cole este link:<br>
              <a href="${linkRecuperacao}" style="color:#1E3A8A;word-break:break-all">${linkRecuperacao}</a>
            </p>
          </div>
        </div>
      `
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

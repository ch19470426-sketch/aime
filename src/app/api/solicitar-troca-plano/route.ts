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
    const { error } = await resend.emails.send({
      from: 'AIMÊ <onboarding@resend.dev>',
      to: emailGestor,
      subject: `AIMÊ — Solicitação de troca de plano — ${nome}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <div style="background:#1E3A8A;padding:20px;text-align:center">
            <div style="color:white;font-size:24px;font-weight:900">AIMÊ</div>
          </div>
          <div style="padding:24px;background:#f8fafc">
            <h2 style="color:#1E3A8A;margin:0 0 16px">Solicitação de Troca de Plano</h2>
            <p style="color:#374151;font-size:14px;margin:0 0 12px">O inspetor abaixo solicitou a troca de plano:</p>
            <table style="width:100%;font-size:13px;border-collapse:collapse">
              <tr><td style="padding:6px;color:#6B7280;font-weight:bold">Nome:</td><td style="padding:6px">${nome}</td></tr>
              <tr><td style="padding:6px;color:#6B7280;font-weight:bold">CPF:</td><td style="padding:6px">${cpf}</td></tr>
              <tr><td style="padding:6px;color:#6B7280;font-weight:bold">Plano desejado:</td><td style="padding:6px;font-weight:bold;color:#1E3A8A">${planoDesejado}</td></tr>
            </table>
            <div style="margin-top:20px;padding:12px;background:#EBF1FF;border-radius:8px;font-size:12px;color:#1E3A8A">
              Acesse o Painel Gestor para atribuir o novo plano ao inspetor.
            </div>
          </div>
        </div>
      `
    })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

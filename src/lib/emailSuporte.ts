// src/lib/emailSuporte.ts
// AIMÊ — Remetente e modelo dos e-mails do suporte (Fale Conosco).
// Pedido de Celso, 05/10/2026: respostas saem de suporte@aime.eng.br, com o
// logo do AIMÊ e a assinatura "Equipe AIMÊ à disposição".
//
// ATENÇÃO: o Resend só envia de um endereço cujo DOMÍNIO esteja verificado
// no painel dele (registros DNS: SPF/DKIM). Até aime.eng.br ser verificado,
// o envio falha — e as rotas devolvem o erro em vez de fingir que enviaram.

export const EMAIL_SUPORTE = 'suporte@aime.eng.br'
export const REMETENTE_SUPORTE = `Equipe AIMÊ <${EMAIL_SUPORTE}>`

// O logo precisa estar numa URL pública (e-mail não carrega arquivo local).
// public/logo-email.png é o logo recortado para e-mail. Quando aime.eng.br
// apontar para a Vercel, basta definir SITE_URL.
const SITE_URL = process.env.SITE_URL ?? 'https://aime-7h4a.vercel.app'
export const LOGO_EMAIL_URL = `${SITE_URL}/logo-email.png`

/** Escapa HTML — texto digitado por usuário nunca entra cru no e-mail. */
export function escaparHtml(texto: unknown): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Escapa e preserva as quebras de linha digitadas. */
function paragrafos(texto: unknown): string {
  return escaparHtml(texto).replace(/\r?\n/g, '<br>')
}

export function montarEmailResposta(p: {
  nome: string
  resposta: string
  assuntoOriginal: string
  mensagemOriginal: string
}): string {
  const primeiroNome = escaparHtml((p.nome || '').trim().split(' ')[0] || 'profissional')
  return `
<div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="padding:20px 24px 14px;text-align:center;border-bottom:3px solid #1E3A8A">
      <img src="${LOGO_EMAIL_URL}" alt="AIMÊ" width="180" style="display:inline-block;height:auto;border:0" />
    </div>
    <div style="padding:24px;font-size:14px;color:#1f2937;line-height:1.6">
      <p style="margin:0 0 14px">Olá, <b>${primeiroNome}</b>!</p>
      <div>${paragrafos(p.resposta)}</div>
      <div style="margin:22px 0 0;padding:12px 14px;background:#f8fafc;border-left:3px solid #94a3b8;border-radius:4px;font-size:12px;color:#475569">
        <div style="font-weight:bold;margin-bottom:4px">Sua mensagem — ${escaparHtml(p.assuntoOriginal)}</div>
        <div>${paragrafos(p.mensagemOriginal)}</div>
      </div>
      <p style="margin:26px 0 0;font-weight:bold;color:#1E3A8A">Equipe AIMÊ à disposição.</p>
    </div>
    <div style="padding:12px 24px;background:#f8fafc;text-align:center;font-size:11px;color:#94a3b8">
      AIMÊ — Mapeamento Inteligente de Edificações e Equipamentos<br>
      Para novas dúvidas, use a opção <b>Fale Conosco</b> no aplicativo.
    </div>
  </div>
</div>`
}

/** Data/hora de Brasília no formato 'AAAA-MM-DD HH:MM:SS' (mesmo relógio de criado_em). */
export function agoraBrasilia(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

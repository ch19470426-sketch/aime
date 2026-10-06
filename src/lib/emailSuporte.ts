// src/lib/emailSuporte.ts
// AIMÊ — Remetente e modelo dos e-mails do sistema (suporte, recuperar senha, troca de plano).
//
// Decisão de Celso, 05/10/2026: TODOS os e-mails em texto simples, com o logo bem
// pequeno no topo e a assinatura "Equipe AIMÊ à disposição". Por isso há um modelo
// único e enxuto (montarEmailSimples) que devolve as duas versões: HTML mínimo (parece
// texto, sem cartões nem faixas coloridas) e texto puro (para quem lê só texto e para
// melhorar a entrega). Resend: sempre enviar { html, text } juntos.
//
// ATENÇÃO: o Resend só envia de endereço cujo DOMÍNIO esteja verificado no painel dele
// (aime.eng.br, verificado em 05/10/2026).

export const EMAIL_SUPORTE = 'suporte@aime.eng.br'
export const REMETENTE_SUPORTE = `Equipe AIMÊ <${EMAIL_SUPORTE}>`

// O logo precisa estar numa URL pública (e-mail não carrega arquivo local).
// public/logo-email.png é o logo recortado para e-mail. Quando aime.eng.br
// apontar para a Vercel, basta definir SITE_URL.
const SITE_URL = process.env.SITE_URL ?? 'https://aime-7h4a.vercel.app'
export const LOGO_EMAIL_URL = `${SITE_URL}/logo-email.png`
const LARGURA_LOGO = 90 // bem pequeno, a pedido

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

export type BlocoEmail =
  | { tipo: 'p'; texto: string }                                   // parágrafo (quebras de linha preservadas)
  | { tipo: 'campos'; itens: Array<[string, string]> }              // linhas "Rótulo: valor"
  | { tipo: 'citacao'; titulo: string; texto: string }              // mensagem citada
  | { tipo: 'link'; rotulo: string; url: string; mostrarUrl?: boolean }

/**
 * Monta o e-mail simples. `assinatura` acrescenta "Equipe AIMÊ à disposição." (usar nos
 * e-mails ao usuário; os avisos internos para a equipe vão sem). `rodape` é uma linha
 * pequena e cinza no fim.
 */
export function montarEmailSimples(p: {
  blocos: BlocoEmail[]
  assinatura?: boolean
  rodape?: string
}): { html: string; text: string } {
  const html: string[] = []
  const texto: string[] = ['AIMÊ']

  for (const b of p.blocos) {
    if (b.tipo === 'p') {
      html.push(`<p style="margin:0 0 12px">${paragrafos(b.texto)}</p>`)
      texto.push(b.texto)
    } else if (b.tipo === 'campos') {
      html.push(`<p style="margin:0 0 12px">${b.itens.map(([r, v]) => `<b>${escaparHtml(r)}:</b> ${escaparHtml(v)}`).join('<br>')}</p>`)
      texto.push(b.itens.map(([r, v]) => `${r}: ${v}`).join('\n'))
    } else if (b.tipo === 'citacao') {
      html.push(`<blockquote style="margin:14px 0;padding:0 0 0 12px;border-left:2px solid #bbb;color:#555;font-size:13px"><div style="font-weight:bold;margin-bottom:4px">${escaparHtml(b.titulo)}</div><div>${paragrafos(b.texto)}</div></blockquote>`)
      texto.push([b.titulo, ...b.texto.split(/\r?\n/)].map(l => `> ${l}`).join('\n'))
    } else {
      const url = escaparHtml(b.url)
      html.push(`<p style="margin:0 0 12px"><a href="${url}">${escaparHtml(b.rotulo)}</a>${b.mostrarUrl ? `<br><span style="font-size:12px;color:#666;word-break:break-all">${url}</span>` : ''}</p>`)
      texto.push(`${b.rotulo}: ${b.url}`)
    }
  }
  if (p.assinatura) {
    html.push(`<p style="margin:18px 0 0;font-weight:bold">Equipe AIMÊ à disposição.</p>`)
    texto.push('Equipe AIMÊ à disposição.')
  }
  if (p.rodape) {
    html.push(`<p style="margin:14px 0 0;font-size:12px;color:#666">${paragrafos(p.rodape)}</p>`)
    texto.push(p.rodape)
  }

  return {
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#222;max-width:560px"><img src="${LOGO_EMAIL_URL}" alt="AIMÊ" width="${LARGURA_LOGO}" style="display:block;height:auto;border:0;margin:0 0 18px">${html.join('')}</div>`,
    text: texto.join('\n\n'),
  }
}

/** Resposta do gestor a uma mensagem do Fale Conosco (e-mail ao inspetor). */
export function montarEmailResposta(p: {
  nome: string
  resposta: string
  assuntoOriginal: string
  mensagemOriginal: string
}): { html: string; text: string } {
  const primeiroNome = (p.nome || '').trim().split(' ')[0] || 'profissional'
  return montarEmailSimples({
    blocos: [
      { tipo: 'p', texto: `Olá, ${primeiroNome}!` },
      { tipo: 'p', texto: p.resposta },
      { tipo: 'citacao', titulo: `Sua mensagem — ${p.assuntoOriginal}`, texto: p.mensagemOriginal },
    ],
    assinatura: true,
    rodape: 'Para novas dúvidas, use a opção Fale Conosco no aplicativo.',
  })
}

/** Data/hora de Brasília no formato 'AAAA-MM-DD HH:MM:SS' (mesmo relógio de criado_em). */
export function agoraBrasilia(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

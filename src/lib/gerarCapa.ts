// src/lib/gerarCapa.ts
// Componente gerador de capa — usado por laudos 41-44, 45-48 e planos 51-58

export interface CapaParams {
  titulo: string          // "Laudo de Inspeção Predial", "Plano de Manutenção" etc.
  subtitulo?: string      // "LAUDO TÉCNICO", "PLANO DE MANUTENÇÃO" etc.
  razaoSocial: string
  logradouro?: string
  cidade?: string
  uf?: string
  logo?: string           // base64 da imagem ou ''
  cabecalhoTexto?: string // texto do cabeçalho do inspetor (campo cadastro)
  nomeInspetor: string
  tituloInspetor?: string
  registroInspetor?: string
  especializacao?: string
  data: string
}

export function gerarCapa(p: CapaParams): string {
  const xe = (s?: string) => (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  // Logo: imagem base64 se disponível, senão cabeçalho texto em fonte grande
  const cabeçalhoHtml = p.logo
    ? `<img src="${p.logo}" style="max-height:28mm;max-width:95mm">`
    : p.cabecalhoTexto
      ? `<div style="font-size:22pt;font-weight:900;color:#1E3A8A;line-height:1.3;text-align:center;padding:0 20mm">${xe(p.cabecalhoTexto)}</div>`
      : ''

  const endereco = [
    p.logradouro,
    p.cidade && p.uf ? `${p.cidade}/${p.uf}` : (p.cidade || p.uf)
  ].filter(Boolean).join(' — ')

  const subtitulo = p.subtitulo ?? 'LAUDO TÉCNICO'

  // Bloco profissional: título + especialização na mesma linha se ambos presentes
  const linhaTitulo = p.tituloInspetor
    ? `<b style="color:#1E3A8A">T&iacute;tulo Profissional:</b> ${xe(p.tituloInspetor)}${p.especializacao ? ' — Especialista ' + xe(p.especializacao) : ''}${p.registroInspetor ? ' &mdash; ' + xe(p.registroInspetor) : ''}<br>`
    : ''

  return [
    `<div class="pg-capa" style="counter-reset:page 0;display:flex;flex-direction:column;height:297mm">`,

    // ── 1cm buffer + faixa azul topo ─────────────────────────────────────────
    `<div style="height:1cm;background:#fff;flex-shrink:0"></div>`,
    `<div style="background:#1E3A8A;height:8mm;flex-shrink:0"></div>`,

    // ── Cabeçalho: logo ou texto do inspetor, logo abaixo da faixa ───────────
    cabeçalhoHtml
      ? `<div style="text-align:center;padding:8mm 0 0;flex-shrink:0">${cabeçalhoHtml}</div>`
      : '',

    // ── Espaçador superior ────────────────────────────────────────────────────
    `<div style="flex:1 1 0"></div>`,

    // ── Bloco central: subtítulo + título + estabelecimento ───────────────────
    `<div style="text-align:center;padding:0 20mm;flex-shrink:0">`,
    `  <div style="font-size:8pt;color:#6B7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:8pt">${xe(subtitulo)}</div>`,
    `  <div style="font-size:20pt;font-weight:900;color:#1E3A8A;line-height:1.2;margin-bottom:8pt">${xe(p.titulo)}</div>`,
    `  <div style="font-size:13pt;font-weight:700;color:#374151;margin-bottom:4pt">${xe(p.razaoSocial)}</div>`,
    endereco ? `  <div style="font-size:9pt;color:#374151">${xe(endereco)}</div>` : '',
    `</div>`,

    // ── Espaçador inferior ────────────────────────────────────────────────────
    `<div style="flex:1 1 0"></div>`,

    // ── Bloco profissional: à esquerda, próximo ao rodapé ────────────────────
    `<div style="flex-shrink:0">`,
    `  <div style="border-top:2px solid #1E3A8A;margin:0 20mm"></div>`,
    `  <div style="padding:8mm 20mm;font-size:9.5pt;color:#222;line-height:1.9">`,
    `    <b style="color:#1E3A8A">Inspetor Respons&aacute;vel:</b> ${xe(p.nomeInspetor)}<br>`,
    linhaTitulo,
    `    <b style="color:#1E3A8A">Data:</b> ${xe(p.data)}`,
    `  </div>`,
    // ── Faixa azul rodapé ─────────────────────────────────────────────────────
    `  <div style="background:#1E3A8A;height:8mm"></div>`,
    `</div>`,

    `</div>`,
  ].join('\n')
}

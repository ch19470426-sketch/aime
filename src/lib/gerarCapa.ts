// src/lib/gerarCapa.ts
// Componente gerador de capa — usado por laudos 41-44, 45-48 e planos 51-58

export interface CapaParams {
  titulo: string
  subtitulo?: string
  razaoSocial: string
  logradouro?: string
  cidade?: string
  uf?: string
  logo?: string
  cabecalhoTexto?: string
  nomeInspetor: string
  tituloInspetor?: string
  registroInspetor?: string
  especializacao?: string
  data: string
}

export function gerarCapa(p: CapaParams): string {
  const xe = (s?: string) => (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const FONT = 'font-family:Arial,sans-serif'

  const cabecalhoHtml = p.logo
    ? `<img src="${p.logo}" style="max-height:28mm;max-width:95mm">`
    : p.cabecalhoTexto
      ? `<div style="${FONT};font-size:20pt;font-weight:900;color:#1E3A8A;line-height:1.3;text-align:center;padding:0 20mm">${xe(p.cabecalhoTexto)}</div>`
      : ''

  const endereco = [
    p.logradouro,
    p.cidade && p.uf ? `${p.cidade}/${p.uf}` : (p.cidade || p.uf)
  ].filter(Boolean).join(' — ')

  const subtitulo = p.subtitulo ?? 'LAUDO TÉCNICO'

  // Sem o 1cm buffer — @page capa-pg tem margin:0 então height:297mm ocupa a página inteira
  // width:210mm garante largura total independente do contexto
  return [
    `<div class="pg-capa" style="${FONT};counter-reset:page 0;display:flex;flex-direction:column;width:210mm;height:297mm;overflow:hidden">`,

    // ── Faixa azul topo — width:100% garante largura total ───────────────────
    `<div style="background:#1E3A8A;height:8mm;width:100%;flex-shrink:0"></div>`,

    // ── Cabeçalho: logo ou cabecalho_documentos ───────────────────────────────
    cabecalhoHtml
      ? `<div style="text-align:center;padding:8mm 0 0;flex-shrink:0">${cabecalhoHtml}</div>`
      : '',

    // ── Espaçador superior ────────────────────────────────────────────────────
    `<div style="flex:1 1 0;min-height:0"></div>`,

    // ── Bloco central ─────────────────────────────────────────────────────────
    `<div style="text-align:center;padding:0 20mm;flex-shrink:0">`,
    `  <div style="${FONT};font-size:8pt;color:#6B7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:8pt">${xe(subtitulo)}</div>`,
    `  <div style="${FONT};font-size:20pt;font-weight:900;color:#1E3A8A;line-height:1.2;margin-bottom:8pt">${xe(p.titulo)}</div>`,
    `  <div style="${FONT};font-size:13pt;font-weight:700;color:#374151;margin-bottom:4pt">${xe(p.razaoSocial)}</div>`,
    endereco ? `  <div style="${FONT};font-size:9pt;color:#374151">${xe(endereco)}</div>` : '',
    `</div>`,

    // ── Espaçador inferior ────────────────────────────────────────────────────
    `<div style="flex:1 1 0;min-height:0"></div>`,

    // ── Bloco profissional ────────────────────────────────────────────────────
    `<div style="flex-shrink:0">`,
    `  <div style="border-top:2px solid #1E3A8A;margin:0 20mm"></div>`,
    `  <div style="${FONT};padding:8mm 20mm;font-size:9.5pt;color:#222;line-height:1.9">`,
    `    <b style="color:#1E3A8A">Inspetor Respons&aacute;vel:</b> ${xe(p.nomeInspetor)}<br>`,
    p.tituloInspetor
      ? `    <b style="color:#1E3A8A">T&iacute;tulo Profissional:</b> ${xe(p.tituloInspetor)}${p.registroInspetor ? ' &mdash; ' + xe(p.registroInspetor) : ''}<br>`
      : '',
    p.especializacao
      ? `    <b style="color:#1E3A8A">Especialidade:</b> Especialista ${xe(p.especializacao)}<br>`
      : '',
    `    <b style="color:#1E3A8A">Data:</b> ${xe(p.data)}`,
    `  </div>`,
    `  <div style="background:#1E3A8A;height:8mm;width:100%"></div>`,
    `</div>`,

    `</div>`,
  ].join('\n')
}

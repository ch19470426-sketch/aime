// src/lib/gerarCapa.ts
// Componente gerador de capa — laudos 41-44, 45-48 e planos 51-58
//
// TÉCNICA: full-bleed por margens negativas.
// A página tem margens (@page margin: 25mm 20mm 20mm 25mm). Em vez de tentar
// zerá-las (named pages / @page :first são ignorados pelo WeasyPrint da Vercel),
// a capa usa margens negativas idênticas. Resultado:
//   - caixa de MARGEM = 165x252mm → cabe na área útil, sem overflow/quebra
//   - caixa de BORDA  = 210x297mm → ocupa a página física inteira
// As faixas azuis alcançam as bordas reais do papel.

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
  /** Margens do @page do documento, em mm. Default: 25/20/20/25 */
  margens?: { top: number; right: number; bottom: number; left: number }
}

export function gerarCapa(p: CapaParams): string {
  const xe = (s?: string) =>
    (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const F = 'font-family:Arial,sans-serif'
  const cabHtml = p.logo
    ? `<img src="${p.logo}" style="max-height:28mm;max-width:95mm">`
    : p.cabecalhoTexto
      ? `<div style="${F};font-size:20pt;font-weight:900;color:#1E3A8A;line-height:1.3">${xe(p.cabecalhoTexto)}</div>`
      : ''

  const endereco = [
    p.logradouro,
    p.cidade && p.uf ? `${p.cidade}/${p.uf}` : (p.cidade || p.uf),
  ].filter(Boolean).join(' — ')

  const subtitulo = p.subtitulo ?? 'LAUDO TÉCNICO'

  return `<div class="pg-capa" style="${F};display:flex;flex-direction:column;height:297mm;box-sizing:border-box">

  <div style="height:8mm;background:#1E3A8A;flex:0 0 8mm"></div>

  <div style="flex:0 0 auto;text-align:center;padding:10mm 20mm 0">${cabHtml}</div>

  <div style="flex:1 1 auto;display:flex;align-items:center;justify-content:center;padding:0 20mm;min-height:0">
    <div style="text-align:center">
      <div style="${F};font-size:8pt;color:#6B7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:8pt">${xe(subtitulo)}</div>
      <div style="${F};font-size:20pt;font-weight:900;color:#1E3A8A;line-height:1.2;margin-bottom:8pt">${xe(p.titulo)}</div>
      <div style="${F};font-size:13pt;font-weight:700;color:#374151;margin-bottom:4pt">${xe(p.razaoSocial)}</div>
      ${endereco ? `<div style="${F};font-size:9pt;color:#374151">${xe(endereco)}</div>` : ''}
    </div>
  </div>

  <div style="flex:0 0 auto">
    <div style="border-top:2px solid #1E3A8A;margin:0 20mm"></div>
    <div style="${F};padding:7mm 20mm;font-size:9.5pt;color:#222;line-height:1.9">
      <b style="color:#1E3A8A">Inspetor Respons&aacute;vel:</b> ${xe(p.nomeInspetor)}<br>
      ${p.tituloInspetor ? `<b style="color:#1E3A8A">T&iacute;tulo Profissional:</b> ${xe(p.tituloInspetor)}${p.registroInspetor ? ' &mdash; ' + xe(p.registroInspetor) : ''}<br>` : ''}
      ${p.especializacao ? `<b style="color:#1E3A8A">Especialidade:</b> Especialista ${xe(p.especializacao)}<br>` : ''}
      <b style="color:#1E3A8A">Data:</b> ${xe(p.data)}
    </div>
  </div>

  <div style="height:8mm;background:#1E3A8A;flex:0 0 8mm"></div>

</div>`
}

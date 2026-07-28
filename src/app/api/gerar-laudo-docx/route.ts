// src/app/api/gerar-laudo-docx/route.ts
// AIMÊ — Gera DOCX editando diretamente o XML do template 41_Laudo_autovistoria.docx
// Abordagem: baixar template, substituir placeholders, inserir dados dinâmicos

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── URL do template no GitHub ────────────────────────────────────────────────
const TMPL_URL = 'https://raw.githubusercontent.com/ch19470426-sketch/aime/main/public/templates/41_laudo.docx'

// ─── Sistemas por tipo ────────────────────────────────────────────────────────
const SISTEMAS: Record<string, string[]> = {
  '41': ['01_Sistema Estrutural','02_Fachadas, Empenas e Marquises','03_Cobertura e Telhados','04_Instalações Hidrossanitárias','05_Instalações Elétricas e SPDA','06_Instalações de Gás','07_Sistema de Prevenção e Combate a Incêndio','08_Elevadores e Equipamentos Eletromecânicos','09_Impermeabilização','10_Acessibilidade','11_Contenção de Encostas e Arrimos','12_Áreas Comuns e Infraestrutura','13_Documentação e Conformidade Legal'],
  '42': ['01_Estrutura','02_Vedações Verticais','03_Cobertura','04_Revestimentos','05_Impermeabilização','06_Esquadrias','07_Instalações Hidrossanitárias','08_Instalações Elétricas','09_Instalações de Gás','10_Instalações Ar Condicionado','11_Fachadas','12_Proteção e Combate a Incêndio','13_Acessibilidade','14_Áreas Comuns'],
  '43': ['01_Sistema Estrutural','02_Sistema de Pisos','03_Vedações Verticais','04_Sistema de Cobertura','05_Instalações Hidrossanitárias','06_Instalações Elétricas','07_Esquadrias e Vidros','08_Revestimentos e Acabamentos','09_Impermeabilização','10_Fachadas','11_Proteção Contra Incêndio','12_Acessibilidade'],
  '44': ['01_Revestimento Argamassado','02_Revestimento Cerâmico de Fachada','03_Revestimento em Pastilhas','04_Fachada Ventilada','05_Pintura de Fachada','06_EIFS / Reboco Sintético','07_Esquadrias e Juntas de Fachada','08_Peitoris, Pingadeiras e Rufos','09_Impermeabilização de Fachada','10_Estrutura de Fachada','11_Segurança Contra Incêndio','12_Manutenção e Equipamentos de Acesso'],
}

const DESC_SISTEMAS: Record<string, string> = {
  '01_Sistema Estrutural': 'Compreende os elementos de fundação, estrutura de concreto armado ou metálica, pilares, vigas e lajes, responsáveis pela sustentação e estabilidade da edificação.',
  '02_Fachadas, Empenas e Marquises': 'Inclui revestimentos externos, pintura de fachada, peitoris, pingadeiras, rufos, marquises e elementos ornamentais expostos ao intemperismo.',
  '03_Cobertura e Telhados': 'Composto por estrutura do telhado, telhas, calhas, rufos, impermeabilização da laje de cobertura e captação de águas pluviais.',
  '04_Instalações Hidrossanitárias': 'Abrange redes de água fria e quente, esgoto sanitário, drenagem pluvial, reservatórios, bombas e equipamentos hidráulicos.',
  '05_Instalações Elétricas e SPDA': 'Inclui quadros de distribuição, fiação, tomadas, iluminação, grupo gerador, SPDA e sistema de aterramento.',
  '06_Instalações de Gás': 'Compreende rede de distribuição de gás (GLP ou GN), central de gás, registros, medidores e ramais de consumo.',
  '07_Sistema de Prevenção e Combate a Incêndio': 'Inclui sprinklers, hidrantes, extintores, saídas de emergência, iluminação de emergência, alarme e sinalização de segurança.',
  '08_Elevadores e Equipamentos Eletromecânicos': 'Abrange elevadores, escadas rolantes, plataformas de acessibilidade, bombas, compressores e demais equipamentos eletromecânicos.',
  '09_Impermeabilização': 'Compreende sistemas de impermeabilização de coberturas, lajes, reservatórios, fundações, banheiros e áreas molhadas.',
  '10_Acessibilidade': 'Inclui rampas, corrimãos, pisos táteis, vagas para PCD, banheiros adaptados e demais elementos conforme NBR 9050.',
  '11_Contenção de Encostas e Arrimos': 'Abrange muros de arrimo, taludes, cortinas de estacas, drenos e sistemas de contenção de solo.',
  '12_Áreas Comuns e Infraestrutura': 'Compreende hall, corredores, escadas, garagem, playground, salão de festas, guarita e demais áreas de uso coletivo.',
  '13_Documentação e Conformidade Legal': 'Inclui análise dos documentos técnicos e legais da edificação quanto à sua regularidade e conformidade normativa.',
}

const DOCS_ANEXO1 = [
  'Auto de Conclusão da Edificação (HABITE-SE)',
  'Convenção do Condomínio',
  'Alvará de Funcionamento de Elevadores',
  'Relatório de Inspeção Anual dos Elevadores (RIA)',
  'Apólice de Seguro da edificação',
  'Auto de Vistoria do Corpo de Bombeiros (AVCB)',
  'Atestado do SPDA',
  'Avaliação da Rede de Distribuição Interna de Gás',
  'Contrato de Manutenção de Elevadores',
  'Certificado de Desratização e Desinsetização',
  'Relatório de Manutenção das Caixas de Água',
  'Certificado do reservatório de GLP',
  'Laudo de autovistoria anterior',
  'Projeto Arquitetônico Aprovado',
  'Projetos Elétrico e Hidrossanitário Aprovados',
  'Manual de Uso, Operação e Manutenção',
  'Plano de Manutenção Preventiva',
  'Atestado de Brigada de Incêndio',
  'Alvará de Funcionamento',
  'Licenças Ambientais',
]

// ─── Helpers XML ──────────────────────────────────────────────────────────────
function X(v: unknown): string {
  return String(v ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
}
function xe(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
function fmtDoc(v: string): string {
  const n = (v||'').replace(/\D/g,'')
  if (n.length===14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
  if (n.length===11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
  return v
}
function fmtData(): string {
  const d = new Date()
  const M = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`
}
function pct(v: number, t: number): string { return t ? Math.round(v*100/t)+'%' : '—' }
function nomeS(s: string): string { return s.slice(3).replace(/_/g,' ') }

// ─── XML builders ─────────────────────────────────────────────────────────────
const TW = 9638  // largura útil em twips
const AZUL = '1E3A8A'
const AZUL_MED = '2a52a8'

// Parágrafo no estilo do template
function par(texto: string, opts: {bold?:boolean;italic?:boolean;color?:string;size?:string;before?:string;after?:string;indent?:string;align?:string} = {}): string {
  const sz = opts.size ?? '20'
  const b = opts.bold ? '<w:b/><w:bCs/>' : '<w:bCs/>'
  const i = opts.italic ? '<w:i/><w:iCs w:val="0"/>' : ''
  const col = opts.color ? `<w:color w:val="${opts.color}"/>` : ''
  const ind = opts.indent ? `<w:ind w:left="${opts.indent}"/>` : ''
  const align = opts.align ?? 'both'
  const before = opts.before ?? '60'
  const after = opts.after ?? '60'
  return `<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="7880"/></w:tabs><w:spacing w:before="${before}" w:after="${after}" w:line="276" w:lineRule="auto"/><w:contextualSpacing/><w:mirrorIndents/><w:jc w:val="${align}"/>${ind}<w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorHAnsi"/>${b}</w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorHAnsi"/>${b}${i}${col}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${xe(texto)}</w:t></w:r></w:p>`
}

// Célula de tabela
function tc(texto: string, opts: {bold?:boolean;bg?:string;color?:string;span?:number;w?:number;align?:string;size?:string} = {}): string {
  const fill = opts.bg ?? ''
  const textColor = opts.color ?? (fill ? 'FFFFFF' : '000000')
  const b = opts.bold ? '<w:b/><w:bCs/>' : '<w:bCs/>'
  const sz = opts.size ?? '16'
  const align = opts.align ?? 'left'
  const spanAttr = opts.span ? `<w:gridSpan w:val="${opts.span}"/>` : ''
  const wAttr = opts.w ? `<w:tcW w:w="${opts.w}" w:type="dxa"/>` : ''
  const shdAttr = fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''
  return `<w:tc><w:tcPr>${wAttr}${spanAttr}<w:tcBorders><w:top w:val="single" w:sz="4" w:color="${AZUL}"/><w:left w:val="single" w:sz="4" w:color="${AZUL}"/><w:bottom w:val="single" w:sz="4" w:color="${AZUL}"/><w:right w:val="single" w:sz="4" w:color="${AZUL}"/></w:tcBorders>${shdAttr}<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="40" w:after="40"/><w:jc w:val="${align}"/></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorHAnsi"/>${b}<w:color w:val="${textColor}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${xe(texto)}</w:t></w:r></w:p></w:tc>`
}

// Célula com label e valor
function tcLV(label: string, valor: string, w?: number): string {
  const wAttr = w ? `<w:tcW w:w="${w}" w:type="dxa"/>` : ''
  return `<w:tc><w:tcPr>${wAttr}<w:tcBorders><w:top w:val="single" w:sz="4" w:color="${AZUL}"/><w:left w:val="single" w:sz="4" w:color="${AZUL}"/><w:bottom w:val="single" w:sz="4" w:color="${AZUL}"/><w:right w:val="single" w:sz="4" w:color="${AZUL}"/></w:tcBorders><w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="30" w:after="10"/></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorHAnsi"/><w:b/><w:bCs/><w:color w:val="${AZUL}"/><w:sz w:val="14"/><w:szCs w:val="14"/></w:rPr><w:t xml:space="preserve">${xe(label)}</w:t></w:r></w:p><w:p><w:pPr><w:spacing w:before="0" w:after="30"/></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorHAnsi"/><w:bCs/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${xe(valor||'—')}</w:t></w:r></w:p></w:tc>`
}

// Linha de tabela
function tr(cells: string[]): string {
  return `<w:tr>${cells.join('')}</w:tr>`
}

// Tabela completa com bordas
function tbl(rows: string[], colWidths?: number[]): string {
  const gridCols = colWidths ? colWidths.map(w => `<w:gridCol w:w="${w}"/>`).join('') : `<w:gridCol w:w="${TW}"/>`
  return `<w:tbl><w:tblPr><w:tblW w:w="${TW}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="8" w:color="${AZUL}"/><w:left w:val="single" w:sz="8" w:color="${AZUL}"/><w:bottom w:val="single" w:sz="8" w:color="${AZUL}"/><w:right w:val="single" w:sz="8" w:color="${AZUL}"/><w:insideH w:val="single" w:sz="4" w:color="${AZUL}"/><w:insideV w:val="single" w:sz="4" w:color="${AZUL}"/></w:tblBorders><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${gridCols}</w:tblGrid>${rows.join('')}</w:tbl>`
}

// Inserir XML após marcador de texto
function insertAfter(doc: string, marker: string, xml: string): string {
  const idx = doc.indexOf(marker)
  if (idx < 0) return doc
  const pEnd = doc.indexOf('</w:p>', idx) + 6
  return doc.slice(0, pEnd) + xml + doc.slice(pEnd)
}

// ─── Gráfico de barras como tabela ───────────────────────────────────────────
function graficoBarras(stat: {s:string;a:number;m:number;b:number;t:number}[]): string {
  const itens = stat.filter(s => s.t > 0)
  if (itens.length === 0) return par('[Nenhuma ocorrência registrada]', {italic:true})
  const max = Math.max(...itens.map(s => s.t), 1)
  const LABEL_W = 2800
  const BAR_TOTAL = TW - LABEL_W - 600
  
  const rows = [
    tr([
      tc('Sistema Construtivo', {bold:true, bg:AZUL, w:LABEL_W}),
      tc('Ocorrências', {bold:true, bg:AZUL, w:BAR_TOTAL, align:'center'}),
      tc('Nº', {bold:true, bg:AZUL, w:600, align:'center'}),
    ]),
    ...itens.map(({s, t}) => {
      const label = nomeS(s)
      const filledW = Math.max(100, Math.round((t/max)*BAR_TOTAL))
      const emptyW = Math.max(0, BAR_TOTAL - filledW)
      const cells = [tc(label, {w:LABEL_W})]
      // Barra azul preenchida
      cells.push(`<w:tc><w:tcPr><w:tcW w:w="${filledW}" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:color="${AZUL}"/><w:left w:val="single" w:sz="4" w:color="${AZUL}"/><w:bottom w:val="single" w:sz="4" w:color="${AZUL}"/><w:right w:val="nil"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${AZUL}"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="80" w:after="80"/></w:pPr></w:p></w:tc>`)
      if (emptyW > 0) {
        cells.push(`<w:tc><w:tcPr><w:tcW w:w="${emptyW}" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:color="${AZUL}"/><w:left w:val="nil"/><w:bottom w:val="single" w:sz="4" w:color="${AZUL}"/><w:right w:val="single" w:sz="4" w:color="${AZUL}"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="EEF2FF"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="80" w:after="80"/></w:pPr></w:p></w:tc>`)
      }
      cells.push(tc(String(t), {w:600, bold:true, align:'center', color:AZUL}))
      return `<w:tr>${cells.join('')}</w:tr>`
    }),
  ]
  return par('Gráfico: Nº de ocorrências por sistema construtivo', {bold:true}) + tbl(rows) + par('')
}

// Gráfico pizza como tabela com barras horizontais coloridas
function graficoPizza(totA: number, totM: number, totB: number): string {
  const tot = totA + totM + totB
  if (tot === 0) return ''
  const pA = Math.round(totA*100/tot)
  const pM = Math.round(totM*100/tot)
  const pB = 100 - pA - pM
  const W_LBL = 1400, W_QTD = 600, W_PCT = 600
  const BAR_W = TW - W_LBL - W_QTD - W_PCT

  function barRow(label: string, qtd: number, pctVal: number, fill: string, textColor: string): string {
    const filled = Math.max(50, Math.round((qtd/tot)*BAR_W))
    const empty = Math.max(0, BAR_W - filled)
    const cells = [
      tc(label, {w:W_LBL, bold:true, color:textColor}),
      tc(String(qtd), {w:W_QTD, bold:true, align:'center'}),
      tc(pctVal+'%', {w:W_PCT, align:'center'}),
    ]
    cells.push(`<w:tc><w:tcPr><w:tcW w:w="${filled}" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:color="${AZUL}"/><w:left w:val="single" w:sz="4" w:color="${AZUL}"/><w:bottom w:val="single" w:sz="4" w:color="${AZUL}"/><w:right w:val="nil"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${fill}"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="100" w:after="100"/></w:pPr></w:p></w:tc>`)
    if (empty > 0) {
      cells.push(`<w:tc><w:tcPr><w:tcW w:w="${empty}" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:color="${AZUL}"/><w:left w:val="nil"/><w:bottom w:val="single" w:sz="4" w:color="${AZUL}"/><w:right w:val="single" w:sz="4" w:color="${AZUL}"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="F7F9FF"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="100" w:after="100"/></w:pPr></w:p></w:tc>`)
    }
    return `<w:tr>${cells.join('')}</w:tr>`
  }

  const rows = [
    tr([
      tc('Prioridade', {bold:true, bg:AZUL, w:W_LBL}),
      tc('Qtd', {bold:true, bg:AZUL, w:W_QTD, align:'center'}),
      tc('%', {bold:true, bg:AZUL, w:W_PCT, align:'center'}),
      tc('Proporção', {bold:true, bg:AZUL, w:BAR_W, align:'center'}),
    ]),
    barRow('Alta (Imediata)', totA, pA, 'DC2626', '991B1B'),
    barRow('Média (Curto Prazo)', totM, pM, 'D97706', '854D0E'),
    barRow('Baixa (Longo Prazo)', totB, pB, '16A34A', '166534'),
    tr([
      tc('Total', {bold:true, bg:'EEF2FF', w:W_LBL}),
      tc(String(tot), {bold:true, bg:'EEF2FF', w:W_QTD, align:'center'}),
      tc('100%', {bg:'EEF2FF', w:W_PCT, align:'center'}),
      tc('', {bg:'EEF2FF', w:BAR_W}),
    ]),
  ]
  return par('Gráfico: Distribuição de anomalias por prioridade', {bold:true}) + tbl(rows) + par('')
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
            estab, inspetor, ncs, complemento } = body

    const titulo    = tipoServico === '43' ? 'Laudo de Vistoria de Imóvel Novo'
                    : tipoServico === '44' ? 'Laudo de Inspeção de Fachada'
                    : tipoServico === '42' ? 'Laudo de Inspeção Predial'
                    : 'Laudo de Autovistoria Predial'
    const sistemas  = SISTEMAS[tipoServico ?? '41'] ?? SISTEMAS['41']
    const cl        = complemento?.classificacao ?? {}
    const nivel     = complemento?.nivelInspecao ?? cl.nivel ?? ''
    const dataHoje  = fmtData()

    // NCs por sistema
    const ncsPorSistema: Record<string,any[]> = {}
    sistemas.forEach(s => { ncsPorSistema[s] = [] })
    ;(ncs ?? []).forEach((nc: any) => { if (ncsPorSistema[nc.sistema]) ncsPorSistema[nc.sistema].push(nc) })

    // Estatística
    const stat = sistemas.map(s => {
      const arr = ncsPorSistema[s]
      const a = arr.filter((n:any)=>n.prioridade==='Alta').length
      const m = arr.filter((n:any)=>n.prioridade==='Média').length
      const b = arr.filter((n:any)=>n.prioridade==='Baixa').length
      return { s, a, m, b, t: a+m+b }
    })
    const totA = stat.reduce((t,s)=>t+s.a,0)
    const totM = stat.reduce((t,s)=>t+s.m,0)
    const totB = stat.reduce((t,s)=>t+s.b,0)
    const totT = totA+totM+totB

    // Buscar fotos das vistorias
    const ncsComFoto = await Promise.all((ncs ?? []).map(async (nc: any) => {
      if (nc.fotoBase64) return nc
      if (!nc._arquivo) return nc
      try {
        const { data: blob } = await supabase.storage.from('aime').download(`vistorias_homologadas/${nc._arquivo}`)
        if (!blob) return nc
        const html = await blob.text()
        const m = html.match(/<img[^>]+src="(data:image[^"]+)"/)
        if (m) return { ...nc, fotoBase64: m[1] }
      } catch { /* */ }
      return nc
    }))

    // Imagens localização
    async function imgData(path: string): Promise<{b64:string;ext:string}|null> {
      if (!path) return null
      try {
        const { data, error } = await supabase.storage.from('aime').download(path)
        if (error || !data) return null
        const buf = Buffer.from(await data.arrayBuffer())
        const ext = path.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'
        return { b64: buf.toString('base64'), ext }
      } catch { return null }
    }
    const [imgCroqui, imgFachada] = await Promise.all([
      imgData(complemento?.pathCroqui ?? ''),
      imgData(complemento?.pathFoto ?? ''),
    ])

    // ── Baixar template ───────────────────────────────────────────────────────
    const tmplRes = await fetch(TMPL_URL)
    if (!tmplRes.ok) throw new Error(`Template não encontrado: ${tmplRes.status}`)
    const tmplBuf = Buffer.from(await tmplRes.arrayBuffer())

    // ── Abrir DOCX com JSZip ──────────────────────────────────────────────────
    const zip = await JSZip.loadAsync(tmplBuf)
    let doc = await zip.file('word/document.xml')!.async('string')
    let header1 = await zip.file('word/header1.xml')!.async('string')
    let footer1 = await zip.file('word/footer1.xml')!.async('string')

    // ── Substituições de placeholders ─────────────────────────────────────────
    const razaoSocial = X(estab?.razao_social_nome)
    const cidadeUF    = `${X(estab?.cidade)}/${X(estab?.uf)}`
    const mesAno      = dataHoje

    const repls: [string,string][] = [
      ['&lt;razão social da edificação&gt;', xe(razaoSocial)],
      ['&lt;Município&gt;/&lt;UF&gt; – &lt;mês/aaaa&gt;', xe(`${cidadeUF} — ${mesAno}`)],
      ['[Data]', xe(dataHoje)],
      ['&lt;cidade&gt;/&lt;UF&gt;, &lt;dd&gt; de &lt;mês&gt; de &lt;aaaa&gt;.', xe(`${cidadeUF}, ${dataHoje}.`)],
      ['&lt;assinatura digital&gt;', ''],
      ['&lt;Nome inspetor&gt; ', xe(X(inspetor?.nome_inspetor)) + ' '],
      ['&lt;Título inspetor', xe(X(inspetor?.titulo_profissional))],
      ['&lt;Número do CREA/CAU do inspetor&gt;', xe(X(inspetor?.inscricao_crea_cau))],
      ['&lt;Especialidade do inspetor, se houver&gt;', xe(X(inspetor?.especializacao ?? ''))],
      ['&lt;Índice a segundo nível de numeração dos itens&gt;', 'ÍNDICE'],
      // Conclusão
      ['&lt;não apresenta nenhum dano aparente que represente ameaça à sua solidez, no que se refere ao aspecto estrutural e contenções, pois não foram verificadas manifestações patologias que possam vir a comprometer a sua estabilidade&gt;. OU apresenta dano que requer a imediata manutenção&gt;.',
        xe(totT > 0 ? 'apresenta danos que requerem intervenção corretiva conforme prioridades definidas neste laudo.' : 'não apresenta danos que comprometam sua solidez ou estabilidade estrutural.')],
      ['&lt;existência&gt;', totT > 0 ? 'existência' : 'não existência'],
      ['&lt;não existência&gt;, de danos', totT > 0 ? 'de diversas anomalias que necessitam intervenção,' : 'de danos'],
    ]
    for (const [old, novo] of repls) {
      doc = doc.split(old).join(novo)
    }

    // Cabeçalho — substituir <tipo serviço>
    header1 = header1.split('&lt;tipo serviço&gt;').join(xe(titulo))

    // ── Inserir tabela 1.1 — Características ─────────────────────────────────
    const W6 = Math.floor(TW/6)
    const tab11 = tbl([
      tr([tc(`Características ${tipoServico==='43'?'do Imóvel':'da Edificação'}`, {bg:AZUL, bold:true, span:6, align:'center', w:TW})]),
      tr([tc('Identificação e características da edificação:', {span:6, bold:true, w:TW, bg:'F7F9FF'})]),
      tr([tcLV(tipoServico==='43'?'Proprietário':'Condomínio / Empresa', razaoSocial, W6*2), tcLV(cnpjoucpf?.length===11?'CPF':'CNPJ', fmtDoc(X(cnpjoucpf)), W6), tcLV('CEP', X(estab?.cep), W6), tc('', {w:W6*2})]),
      tr([tcLV('Endereço', `${X(estab?.logradouro)}${estab?.numero?', '+X(estab.numero):''}`, W6*3), tcLV('Bairro', X(estab?.bairro), W6*2), tc('', {w:W6})]),
      tr([tcLV('Cidade e UF', cidadeUF, W6), tcLV('Nome do responsável', X(estab?.nome_responsavel), W6*2), tcLV('Função do responsável', X(estab?.funcao_responsavel), W6*2), tc('', {w:W6})]),
      tr([tcLV('Telefone', X(estab?.whatsapp), W6*2), tcLV('eMail', X(estab?.email), W6*2), tcLV('Finalidade', titulo, W6*2)]),
      tr([tcLV('Uso', X(estab?.uso_imovel), W6), tcLV('Tipo', X(estab?.tipo_imovel), W6), tcLV('Pavimentos', X(estab?.numero_pavimentos), W6), tcLV('Unidades', X(estab?.numero_unidades_salas), W6), tcLV('Área const. m²', X(estab?.area_construida), W6), tcLV('Área terreno m²', X(estab?.area_terreno), W6)]),
    ], [W6,W6,W6,W6,W6,W6]) + par('')
    doc = insertAfter(doc, '1.1.- Caracter', tab11)

    // ── Inserir tabela 1.1 Localização (após tab11, mas sem imagens por ora) ──
    // As imagens da localização ficam no template como placeholders visuais

    // ── Inserir tabela 1.3 — Agenda de Trabalho ───────────────────────────────
    // Formato simplificado: Atividade | Dt. Início | Dt. Fim
    const W13_A = TW - 2200, W13_D = 1100
    const tab13 = tbl([
      tr([tc('Agenda de Trabalho', {bg:AZUL, bold:true, span:3, align:'center', w:TW})]),
      tr([tc('Atividade', {bg:AZUL_MED, bold:true, w:W13_A}), tc('Dt. Início', {bg:AZUL_MED, bold:true, w:W13_D, align:'center'}), tc('Dt. Fim', {bg:AZUL_MED, bold:true, w:W13_D, align:'center'})]),
      ...[
        'Análise técnica inicial da edificação para conhecer as características básicas da edificação a ser estudada.',
        'Entrevista Inicial para coletar dados históricos do prédio e pedido de documentos legais.',
        'Entrega documentos pelo síndico para o inspetor predial e análise pelo inspetor.',
        'Execução da vistoria com levantamento das anomalias e falhas e coleta de evidências fotográficas.',
        'Elaboração laudo efetuando análise, classificação, recomendações e consolidação do documento.',
        'Entrega do Laudo de autovistoria ao Síndico.',
      ].map(a => tr([tc(a, {w:W13_A}), tc('', {w:W13_D}), tc('', {w:W13_D})])),
      tr([tc('', {span:3, w:TW})]),
    ], [W13_A, W13_D, W13_D]) + par('')
    doc = insertAfter(doc, '1.3.- Plano de Trabalho', tab13)

    // ── Inserir tabela 3.1 — Descrição da Vistoria ───────────────────────────
    const descVistoria = X(complemento?.descVistoria || complemento?.dadosVistoria || '<descrever como foi realizada a vistoria>')
    const tab31 = tbl([
      tr([tc('Descrição da Realização da Vistoria', {bg:AZUL, bold:true, align:'center', w:TW})]),
      tr([tc(descVistoria, {w:TW})]),
      tr([tc('', {w:TW})]),
    ]) + par('')
    doc = insertAfter(doc, '3.1.- Descri', tab31)

    // ── Inserir tabela 3.3 — Classificação ───────────────────────────────────
    const itens33 = tipoServico==='43' ? [
      ['a)', 'A execução da obra em relação à CONFORMIDADE CONSTRUTIVA foi classificada como:', X(cl.nivel)],
      ['b)', 'A QUALIDADE DE ACABAMENTO do imóvel é classificada como:', X(cl.risco)],
      ['c)', 'Quanto ao uso, a FUNCIONALIDADE do imóvel:', X(cl.desempenho)],
      ['d)', 'Quanto às condições de ocupação, a HABITABILIDADE pode ser considerada:', X(cl.manut)],
      ['e)', 'A análise sobre a CLASSE DO IMÓVEL resulta em:', X(cl.uso)],
      ['f)', 'O GRAU DE SATISFAÇÃO NO RECEBIMENTO do imóvel:', X(cl.desempGeral)],
    ] : tipoServico==='44' ? [
      ['a)', 'Quanto ao ESTADO DE CONSERVAÇÃO da fachada:', X(cl.risco)],
      ['b)', 'O histórico de MANUTENÇÃO da fachada:', X(cl.manut)],
      ['c)', 'A AGRESSIVIDADE DO MEIO AMBIENTE sobre a fachada é considerada:', X(cl.desempenho)],
      ['d)', 'O RISCO DE QUEDA DE ELEMENTOS da fachada:', X(cl.uso)],
      ['e)', 'O DESEMPENHO TÉCNICO DO SISTEMA da fachada:', X(cl.desempGeral)],
    ] : [
      ['a)', 'Quanto ao NÍVEL da inspeção efetuada o imóvel em questão foi classificado como INSPEÇÃO PREDIAL NÍVEL:', nivel||'—'],
      ['b)', 'Quando ao GRAU DE RISCO o imóvel em questão encontra-se classificado como de RISCO:', X(cl.risco)],
      ['c)', 'Quanto ao DESEMPENHO a classificação geral do imóvel foi classificada como de DESEMPENHO:', X(cl.desempenho)],
      ['d)', 'Quanto a QUALIDADE DA MANUTENÇÃO a edificação foi classificada como QUALIDADE QUE:', X(cl.manut)],
      ['e)', 'Quanto as CONDIÇÕES DE USO a edificação foi classificada como EDIFICAÇÃO DE USO:', X(cl.uso)],
      ['f)', 'Quanto ao DESEMPENHO a edificação foi classificada como:', X(cl.desempGeral)],
    ]
    const titulo33 = tipoServico==='43'?'Resultado da Classificação do Imóvel':tipoServico==='44'?'Resultado da Classificação da Fachada':'Resultado da Classificação da Edificação.'
    const W33 = [Math.floor(TW*0.65), TW-Math.floor(TW*0.65)]
    const tab33 = tbl([
      tr([tc(titulo33, {bg:AZUL, bold:true, span:2, align:'center', w:TW})]),
      ...itens33.map(([letra,desc,val]) => tr([tc(`${letra}  ${desc}`, {w:W33[0]}), tc(val||'—', {w:W33[1], bold:true, align:'center'})])),
      tr([tc('', {span:2, w:TW})]),
    ], W33) + par('')
    doc = insertAfter(doc, 'O resultado da classificação da edificação quanto', tab33)

    // ── Inserir tabelas 4.1 — NCs por sistema ────────────────────────────────
    const W41 = [600, 2200, 1800, 700, 800, TW-6100]
    let elems41 = ''
    for (const s of sistemas) {
      const arr = ncsPorSistema[s]
      if (arr.length === 0) continue
      const rec = X(complemento?.recsSistema?.[s]??'')
      elems41 += tbl([
        tr([tc('Relação de Não Conformidades e Soluções por Sistema Construtivo', {bg:AZUL, bold:true, span:6, align:'center', w:TW})]),
        tr([tc('Sistema construtivo ou instalação:', {bold:true, span:6, w:TW, bg:'F7F9FF'})]),
        tr([tc(nomeS(s), {span:6, w:TW})]),
        tr([tc('Descrição:', {bold:true, span:6, w:TW, bg:'F7F9FF'})]),
        tr([tc(X(DESC_SISTEMAS[s]||nomeS(s)), {span:6, w:TW})]),
        ...(rec ? [tr([tc('Recomendação para o sistema construtivo:', {bold:true, span:6, w:TW, bg:'F7F9FF'})]), tr([tc(rec, {span:6, w:TW})])] : []),
        tr([tc('Foto nr.', {bg:AZUL, bold:true, w:600, align:'center'}), tc('Não Conformidade', {bg:AZUL, bold:true, w:2200}), tc('Local', {bg:AZUL, bold:true, w:1800}), tc('G Risco', {bg:AZUL, bold:true, w:700, align:'center'}), tc('Prioridade', {bg:AZUL, bold:true, w:800, align:'center'}), tc('Solução', {bg:AZUL, bold:true, w:TW-6100})]),
        ...arr.map((nc:any) => tr([tc(X(nc.fotoNr), {w:600, align:'center'}), tc(X(nc.nc||nc.anomalia), {w:2200}), tc(`${X(nc.local)}${nc.complemento?' — '+X(nc.complemento):''}`, {w:1800}), tc(X(nc.grauRisco), {w:700, align:'center'}), tc(X(nc.prioridade), {w:800, bold:true, align:'center'}), tc(X(nc.solucaoNC||nc.cp||'—'), {w:TW-6100})])),
        tr([tc('', {span:6, w:TW})]),
      ], W41) + par('')
    }
    doc = insertAfter(doc, 'Quanto a definição das prioridades foi adotado o critério', elems41)

    // ── Inserir tabela 4.2 + gráficos ─────────────────────────────────────────
    const W42a = Math.floor(TW*0.28), W42b = Math.floor((TW-W42a)/8)
    const tab42 = tbl([
      tr([tc('Estatística de Manifestações Patológicas por Sistema Construtivo', {bg:AZUL, bold:true, span:9, align:'center', w:TW})]),
      tr([tc('Sistemas construtivos', {bg:AZUL_MED, bold:true, w:W42a}), tc('Manifestações por Prioridades', {bg:AZUL_MED, bold:true, span:6, align:'center'}), tc('Sub total', {bg:AZUL_MED, bold:true, w:W42b, align:'center'}), tc('%', {bg:AZUL_MED, bold:true, w:W42b, align:'center'})]),
      tr([tc('', {bg:AZUL_MED, w:W42a}), tc('A', {bg:AZUL_MED, bold:true, w:W42b, align:'center'}), tc('%', {bg:AZUL_MED, bold:true, w:W42b, align:'center'}), tc('M', {bg:AZUL_MED, bold:true, w:W42b, align:'center'}), tc('%', {bg:AZUL_MED, bold:true, w:W42b, align:'center'}), tc('B', {bg:AZUL_MED, bold:true, w:W42b, align:'center'}), tc('%', {bg:AZUL_MED, bold:true, w:W42b, align:'center'})]),
      ...stat.map(({s,a,m,b,t}) => tr([tc(nomeS(s),{w:W42a}), tc(a?String(a):'',{w:W42b,align:'center'}), tc(a?pct(a,t):'',{w:W42b,align:'center'}), tc(m?String(m):'',{w:W42b,align:'center'}), tc(m?pct(m,t):'',{w:W42b,align:'center'}), tc(b?String(b):'',{w:W42b,align:'center'}), tc(b?pct(b,t):'',{w:W42b,align:'center'}), tc(t?String(t):'',{w:W42b,bold:true,align:'center'}), tc(t?pct(t,totT):'',{w:W42b,align:'center'})])),
      tr([tc('Total de ocorrências',{bold:true,bg:'EEF2FF',w:W42a}), tc(String(totA),{bg:'FEE2E2',bold:true,w:W42b,align:'center'}), tc(pct(totA,totT),{bg:'FEE2E2',w:W42b,align:'center'}), tc(String(totM),{bg:'FEF9C3',bold:true,w:W42b,align:'center'}), tc(pct(totM,totT),{bg:'FEF9C3',w:W42b,align:'center'}), tc(String(totB),{bg:'DCFCE7',bold:true,w:W42b,align:'center'}), tc(pct(totB,totT),{bg:'DCFCE7',w:W42b,align:'center'}), tc(String(totT),{bold:true,bg:'EEF2FF',w:W42b,align:'center'}), tc('100%',{bg:'EEF2FF',w:W42b,align:'center'})]),
      tr([tc('A = Alta; M = Média; B = Baixa', {span:9, w:TW, size:'14'})]),
    ]) + par('') + graficoBarras(stat) + graficoPizza(totA, totM, totB)
    doc = insertAfter(doc, 'A tabela que segue apresenta a estatística', tab42)

    // ── Inserir tabela 5 — Recomendações ─────────────────────────────────────
    const tab5 = tbl([
      tr([tc('Recomendações Gerais', {bg:AZUL, bold:true, align:'center', w:TW})]),
      tr([tc('5.1.- Avaliação e recomendações da manutenção.', {bold:true, bg:'EEF2FF', w:TW})]),
      tr([tc(X(complemento?.rec51)||'[A ser preenchido pelo responsável técnico]', {w:TW})]),
      tr([tc('5.2.- Avaliação e recomendações do uso da edificação.', {bold:true, bg:'EEF2FF', w:TW})]),
      tr([tc(X(complemento?.rec52)||'[A ser preenchido pelo responsável técnico]', {w:TW})]),
      tr([tc('5.3.- Avaliação e recomendações da sustentabilidade.', {bold:true, bg:'EEF2FF', w:TW})]),
      tr([tc(X(complemento?.rec53)||'[A ser preenchido pelo responsável técnico]', {w:TW})]),
      tr([tc('5.4.- Outras avaliações e recomendações.', {bold:true, bg:'EEF2FF', w:TW})]),
      tr([tc(X(complemento?.rec54)||'[A ser preenchido pelo responsável técnico]', {w:TW})]),
    ]) + par('')
    doc = insertAfter(doc, 'A seguir estão registradas as recomendações', tab5)

    // ── Inserir Relação de Documentos no Anexo 1 ──────────────────────────────
    const WA1 = [Math.floor(TW*0.58), Math.floor(TW*0.21), TW-Math.floor(TW*0.58)-Math.floor(TW*0.21)]
    const tabA1 = tbl([
      tr([tc('Relação de Documentos Solicitados e Recebidos', {bg:AZUL, bold:true, span:3, align:'center', w:TW})]),
      tr([tc('Documento', {bg:AZUL_MED, bold:true, w:WA1[0]}), tc('Situação', {bg:AZUL_MED, bold:true, w:WA1[1], align:'center'}), tc('Resultado', {bg:AZUL_MED, bold:true, w:WA1[2]})]),
      ...DOCS_ANEXO1.map(d => {
        const info = (complemento?.docsAnexo1??{})[d]??{}
        return tr([tc(d, {w:WA1[0]}), tc(info.situacao||'—', {w:WA1[1], align:'center'}), tc(info.resultado||'—', {w:WA1[2]})])
      }),
    ], WA1) + par('')

    // Inserir tabela Anexo 1 após o título "Anexo 1"
    // O título está no início do documento (índice) e na posição final
    // Buscar a segunda ocorrência
    const idx_a1_1 = doc.indexOf(' Anexo 1')
    const idx_a1_2 = doc.indexOf(' Anexo 1', idx_a1_1+1)
    if (idx_a1_2 >= 0) {
      const pEnd = doc.indexOf('</w:p>', idx_a1_2) + 6
      doc = doc.slice(0, pEnd) + tabA1 + doc.slice(pEnd)
    }

    // ── Inserir formulários do Anexo 2 ───────────────────────────────────────
    let elemsA2 = ''
    for (let idx=0; idx<(ncsComFoto??[]).length; idx++) {
      const nc = (ncsComFoto??[])[idx]
      const ns  = X(nc.sistema).slice(3).replace(/_/g,' ')
      const grN = Number(nc.grauRisco)
      const corGR   = grN>=64?'DC2626':grN>=35?'D97706':'16A34A'
      const bgGR    = grN>=64?'FEE2E2':grN>=35?'FEF9C3':'DCFCE7'
      const priSim  = grN>=64?'▲ Alta':grN>=35?'■ Média':'▼ Baixa'
      const AZUL_F  = '0C447C'
      const AZUL_TT = '185FA5'

      if (idx > 0) elemsA2 += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`

      // Cabeçalho do formulário
      elemsA2 += `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:shd w:val="clear" w:color="${AZUL_F}" w:fill="${AZUL_F}"/></w:rPr><w:t>AIMÊ  Autovistoria — Formulário de Vistoria</w:t></w:r></w:p>`

      // Blocos
      function blocoF(titulo: string, linhas: string[]): string {
        return tbl([
          tr([tc(titulo, {bg:AZUL_TT, bold:true, w:TW})]),
          ...linhas,
        ]) + par('')
      }

      function linhaF(label: string, valor: string, w:number=TW): string {
        return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:color="B5D4F4"/><w:left w:val="single" w:sz="4" w:color="B5D4F4"/><w:bottom w:val="single" w:sz="4" w:color="B5D4F4"/><w:right w:val="single" w:sz="4" w:color="B5D4F4"/></w:tcBorders><w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="30" w:after="10"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="4a6480"/><w:sz w:val="14"/><w:szCs w:val="14"/></w:rPr><w:t xml:space="preserve">${xe(label.toUpperCase())}</w:t></w:r></w:p><w:p><w:pPr><w:spacing w:before="0" w:after="30"/></w:pPr><w:r><w:rPr><w:bCs/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">${xe(valor||'—')}</w:t></w:r></w:p></w:tc>`
      }

      const W2=Math.floor(TW/2), W3=Math.floor(TW/3), W4=Math.floor(TW/4)

      elemsA2 += blocoF('Identificação', [tr([linhaF(cnpjoucpf?.length===11?'CPF':'CNPJ', fmtDoc(X(nc.cnpjoucpf||cnpjoucpf)), W2), linhaF('Razão Social / Nome', X(estab?.razao_social_nome), TW-W2)])])
      elemsA2 += blocoF('Manifestação Patológica', [
        tr([linhaF('Sistema', ns, W3), linhaF('Subsistema', X(nc.subsistema), W3), linhaF('Anomalia / Falha', X(nc.anomalia), TW-2*W3)]),
        tr([linhaF('Origem', X(nc.origem||nc.resultado||'—'), W3), linhaF('Local de Ocorrência', X(nc.local), W3), linhaF('Complemento do Local', X(nc.complemento), TW-2*W3)]),
      ])
      elemsA2 += blocoF('Classificação de Risco', [
        tr([linhaF('Gravidade', X(nc.gravidade), W4), linhaF('Urgência', X(nc.urgencia), W4), linhaF('Abrangência', X(nc.abrangencia), W4), linhaF('Exposição', X(nc.exposicao), TW-3*W4)]),
        tr([
          `<w:tc><w:tcPr><w:tcW w:w="${W2}" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:color="B5D4F4"/><w:left w:val="single" w:sz="4" w:color="B5D4F4"/><w:bottom w:val="single" w:sz="4" w:color="B5D4F4"/><w:right w:val="single" w:sz="4" w:color="B5D4F4"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${bgGR}"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="40" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="4a6480"/><w:sz w:val="14"/><w:szCs w:val="14"/></w:rPr><w:t>GRAU DE RISCO</w:t></w:r></w:p><w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="${corGR}"/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr><w:t>${xe(X(nc.grauRisco))}</w:t></w:r></w:p></w:tc>`,
          `<w:tc><w:tcPr><w:tcW w:w="${TW-W2}" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:color="B5D4F4"/><w:left w:val="single" w:sz="4" w:color="B5D4F4"/><w:bottom w:val="single" w:sz="4" w:color="B5D4F4"/><w:right w:val="single" w:sz="4" w:color="B5D4F4"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${bgGR}"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="4a6480"/><w:sz w:val="14"/><w:szCs w:val="14"/></w:rPr><w:t>PRIORIDADE</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="${corGR}"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>${xe(priSim)}</w:t></w:r></w:p></w:tc>`,
        ]),
      ])

      // Evidência fotográfica
      let fotoXml = blocoF('Evidência Fotográfica', [
        tr([linhaF('Foto Nº', X(nc.fotoNr), W2), linhaF('Data da Vistoria', X(nc.dataVistoria), TW-W2)]),
        ...(() => {
          if (nc.fotoBase64?.startsWith('data:image')) {
            try {
              const m2 = nc.fotoBase64.match(/^data:([^;]+);base64,(.+)$/)
              if (m2) {
                const mediaName = `image_nc_${idx}.${m2[1].includes('png')?'png':'jpeg'}`
                const mediaType = m2[1]
                zip.file(`word/media/${mediaName}`, m2[2], {base64:true})
                // Adicionar relationship
                const relId = `rId_nc_${idx}`
                const relsFile = zip.file('word/_rels/document.xml.rels')
                if (relsFile) {
                  relsFile.async('string').then(relsXml => {
                    const newRel = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/>`
                    zip.file('word/_rels/document.xml.rels', relsXml.replace('</Relationships>', newRel+'</Relationships>'))
                  })
                }
                const imgW = 4500000, imgH = 3000000  // EMUs
                return [tr([`<w:tc><w:tcPr><w:tcW w:w="${TW}" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:color="B5D4F4"/><w:left w:val="single" w:sz="4" w:color="B5D4F4"/><w:bottom w:val="single" w:sz="4" w:color="B5D4F4"/><w:right w:val="single" w:sz="4" w:color="B5D4F4"/></w:tcBorders><w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${imgW}" cy="${imgH}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${idx+100}" name="Foto${idx}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${idx+100}" name="Foto${idx}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${imgW}" cy="${imgH}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:tc>`])]
              }
            } catch { /* sem foto */ }
          }
          return [tr([`<w:tc><w:tcPr><w:tcW w:w="${TW}" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:color="B5D4F4"/><w:left w:val="single" w:sz="4" w:color="B5D4F4"/><w:bottom w:val="single" w:sz="4" w:color="B5D4F4"/><w:right w:val="single" w:sz="4" w:color="B5D4F4"/></w:tcBorders><w:tcMar><w:top w:w="200" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="200" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:iCs/><w:color w:val="9CA3AF"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>[Sem foto disponível]</w:t></w:r></w:p></w:tc>`])]
        })(),
      ])
      elemsA2 += fotoXml

      elemsA2 += blocoF('Resultado da Análise e Avaliação', [
        tr([tc('DESCRIÇÃO DA NÃO CONFORMIDADE (NC)', {bg:'EEF2FF', bold:true, w:TW, size:'14'})]),
        tr([tc(X(nc.nc||nc.anomalia||'—'), {w:TW})]),
        tr([tc('DESCRIÇÃO DA CAUSA PROVÁVEL (CP)', {bg:'EEF2FF', bold:true, w:TW, size:'14'})]),
        tr([tc(X(nc.cp||'—'), {w:TW})]),
        tr([tc('SOLUÇÃO', {bg:'EEF2FF', bold:true, w:TW, size:'14'})]),
        tr([tc(X(nc.solucaoNC||nc.cp||'—'), {w:TW})]),
      ])
    }

    // Inserir Anexo 2 após o título "Anexo 2"
    const idx_a2 = doc.indexOf('Anexo 2 – Resultado da Vistoria')
    if (idx_a2 >= 0) {
      const pEnd = doc.indexOf('</w:p>', idx_a2) + 6
      doc = doc.slice(0, pEnd) + par('') + (elemsA2 || par('[Nenhuma vistoria homologada encontrada]', {italic:true})) + doc.slice(pEnd)
    }

    // ── Atualizar o DOCX ──────────────────────────────────────────────────────
    zip.file('word/document.xml', doc)
    zip.file('word/header1.xml', header1)

    // Aguardar operações assíncronas de image
    await new Promise(r => setTimeout(r, 100))

    const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

    return new NextResponse(outBuf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="laudo.docx"',
      },
    })

  } catch (err: any) {
    console.error('gerar-laudo-docx:', err)
    return NextResponse.json({ erro: String(err?.message ?? err) }, { status: 500 })
  }
}

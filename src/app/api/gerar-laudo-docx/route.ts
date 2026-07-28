// src/app/api/gerar-laudo-docx/route.ts
// AIMÊ — Gera DOCX do Laudo baseado fielmente no template 41_Laudo_autovistoria.docx
// Página A4 | margens 2.5cm | fonte Arial 10pt | cabeçalho/rodapé MAPEAMENTO

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, ShadingType,
  BorderStyle, PageBreak, Header, Footer, PageNumber,
  ImageRun, convertMillimetersToTwip, VerticalAlign,
  HeadingLevel, NumberFormat, LevelFormat,
} from 'docx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Sistemas por tipo de serviço ────────────────────────────────────────────
const SISTEMAS: Record<string, string[]> = {
  '41': ['01_Sistema Estrutural','02_Fachadas, Empenas e Marquises','03_Cobertura e Telhados','04_Instalações Hidrossanitárias','05_Instalações Elétricas e SPDA','06_Instalações de Gás','07_Sistema de Prevenção e Combate a Incêndio','08_Elevadores e Equipamentos Eletromecânicos','09_Impermeabilização','10_Acessibilidade','11_Contenção de Encostas e Arrimos','12_Áreas Comuns e Infraestrutura','13_Documentação e Conformidade Legal'],
  '42': ['01_Estrutura','02_Vedações Verticais','03_Cobertura','04_Revestimentos','05_Impermeabilização','06_Esquadrias','07_Instalações Hidrossanitárias','08_Instalações Elétricas','09_Instalações de Gás','10_Instalações Ar Condicionado','11_Fachadas','12_Proteção e Combate a Incêndio','13_Acessibilidade','14_Áreas Comuns'],
  '43': ['01_Sistema Estrutural','02_Sistema de Pisos','03_Vedações Verticais','04_Sistema de Cobertura','05_Instalações Hidrossanitárias','06_Instalações Elétricas','07_Esquadrias e Vidros','08_Revestimentos e Acabamentos','09_Impermeabilização','10_Fachadas','11_Proteção Contra Incêndio','12_Acessibilidade'],
  '44': ['01_Revestimento Argamassado','02_Revestimento Cerâmico de Fachada','03_Revestimento em Pastilhas','04_Fachada Ventilada','05_Pintura de Fachada','06_EIFS / Reboco Sintético','07_Esquadrias e Juntas de Fachada','08_Peitoris, Pingadeiras e Rufos','09_Impermeabilização de Fachada','10_Estrutura de Fachada','11_Segurança Contra Incêndio','12_Manutenção e Equipamentos de Acesso'],
}

const TITULO_SERVICO: Record<string, string> = {
  '41': 'Laudo de Autovistoria Predial',
  '42': 'Laudo de Inspeção Predial',
  '43': 'Laudo de Vistoria de Imóvel Novo',
  '44': 'Laudo de Inspeção de Fachada',
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function X(v: unknown): string {
  return String(v ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
}
function fmtDoc(v: string): string {
  const n = (v || '').replace(/\D/g, '')
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return v
}
function fmtData(): string {
  const d = new Date()
  const M = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`
}
function nomeS(s: string): string { return s.slice(3).replace(/_/g, ' ') }
function descS(s: string): string { return DESC_SISTEMAS[s] || `Sistema: ${nomeS(s)}` }
function pct(v: number, t: number): string { return t ? Math.round(v * 100 / t) + '%' : '—' }

// ─── Constantes de layout ─────────────────────────────────────────────────────
const MM = convertMillimetersToTwip
const FONT = 'Arial'
const SZ = 20        // 10pt em half-points
const SZ_SM = 18     // 9pt
const SZ_XS = 16     // 8pt
const SZ_LBL = 14    // 7pt (labels)
const TW = 9638      // largura útil A4 com margens 2.5cm (~16.8cm)
const AZUL = '1E3A8A'
const AZUL_MED = '2a52a8'
const BRANCO = 'FFFFFF'
const PRETO = '000000'

// ─── Funções de parágrafo ─────────────────────────────────────────────────────
function par(texto: string | TextRun[], opts: {
  bold?: boolean; italic?: boolean; indent?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  before?: number; after?: number; size?: number; color?: string; keepNext?: boolean;
} = {}): Paragraph {
  const runs: TextRun[] = Array.isArray(texto)
    ? texto
    : [new TextRun({ text: texto, bold: opts.bold, italics: opts.italic, size: opts.size ?? SZ, font: FONT, color: opts.color ?? PRETO })]
  return new Paragraph({
    children: runs,
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { before: opts.before ?? 80, after: opts.after ?? 80 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    keepNext: opts.keepNext,
  })
}

function h1(texto: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: texto, bold: true, size: SZ, font: FONT, color: PRETO })],
    spacing: { before: 200, after: 100 },
    keepNext: true,
  })
}

function h2(texto: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: texto, bold: true, size: SZ, font: FONT, color: PRETO })],
    spacing: { before: 160, after: 80 },
    indent: { left: 0 },
    keepNext: true,
  })
}

function h3(texto: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: texto, bold: true, size: SZ, font: FONT, color: PRETO })],
    spacing: { before: 120, after: 60 },
    indent: { left: 360 },
    keepNext: true,
  })
}

function li(texto: string | TextRun[], indent = 720): Paragraph {
  return new Paragraph({
    children: Array.isArray(texto)
      ? texto
      : [new TextRun({ text: texto, size: SZ, font: FONT, color: PRETO })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 40, after: 40 },
    indent: { left: indent, hanging: 360 },
    bullet: { level: 0 },
  })
}

function liAlpha(letra: string, texto: string | TextRun[], indent = 720): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${letra})  `, size: SZ, font: FONT, color: PRETO }),
      ...(Array.isArray(texto) ? texto : [new TextRun({ text: texto, size: SZ, font: FONT, color: PRETO })]),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 60, after: 60 },
    indent: { left: indent },
  })
}

// ─── Funções de célula e tabela ───────────────────────────────────────────────
function cel(texto: string, opts: {
  bold?: boolean; italic?: boolean; bg?: string; color?: string; span?: number; rowSpan?: number;
  width?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  size?: number; vAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
  minH?: number;
} = {}): TableCell {
  const runs = [new TextRun({
    text: texto, bold: opts.bold, italics: opts.italic,
    size: opts.size ?? SZ_XS, font: FONT,
    color: opts.color ?? (opts.bg ? BRANCO : PRETO),
  })]
  return new TableCell({
    children: [new Paragraph({
      children: runs,
      alignment: opts.align ?? AlignmentType.LEFT,
      spacing: { before: 40, after: 40 },
    })],
    columnSpan: opts.span,
    rowSpan: opts.rowSpan,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.bg ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.bg } : undefined,
    verticalAlign: opts.vAlign ?? VerticalAlign.TOP,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  })
}

// Célula com dois parágrafos: label pequeno + valor
function celLV(label: string, valor: string, width?: number): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: label, bold: true, size: SZ_LBL, font: FONT, color: AZUL })],
        spacing: { before: 30, after: 20 },
      }),
      new Paragraph({
        children: [new TextRun({ text: valor || '—', size: SZ_SM, font: FONT, color: PRETO })],
        spacing: { before: 0, after: 30 },
      }),
    ],
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    margins: { top: 30, bottom: 30, left: 80, right: 80 },
  })
}

function bordaTabela(rows: TableRow[], columnWidths?: number[]): Table {
  return new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: columnWidths,
    borders: {
      top:     { style: BorderStyle.SINGLE, size: 1, color: AZUL },
      bottom:  { style: BorderStyle.SINGLE, size: 1, color: AZUL },
      left:    { style: BorderStyle.SINGLE, size: 1, color: AZUL },
      right:   { style: BorderStyle.SINGLE, size: 1, color: AZUL },
      insideH: { style: BorderStyle.SINGLE, size: 1, color: AZUL },
      insideV: { style: BorderStyle.SINGLE, size: 1, color: AZUL },
    },
    rows,
    margins: { bottom: 120 },
  })
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
            estab, inspetor, ncs, complemento } = body

    if (!tipoServico)
      return NextResponse.json({ erro: 'tipoServico obrigatório.' }, { status: 400 })

    const titulo   = TITULO_SERVICO[tipoServico] ?? 'Laudo Técnico'
    const sistemas = SISTEMAS[tipoServico] ?? []
    const cl       = complemento?.classificacao ?? {}
    const nivel    = complemento?.nivelInspecao ?? cl.nivel ?? ''
    const dataHoje = fmtData()
    const labelDoc = cnpjoucpf?.length === 11 ? 'CPF' : 'CNPJ'
    const labelEst = tipoServico === '43' ? 'Proprietário' : 'Condomínio / Empresa'

    // NCs por sistema
    const ncsPorSistema: Record<string, any[]> = {}
    sistemas.forEach(s => { ncsPorSistema[s] = [] })
    ;(ncs ?? []).forEach((nc: any) => {
      if (ncsPorSistema[nc.sistema] !== undefined) ncsPorSistema[nc.sistema].push(nc)
    })

    // Estatística
    const stat = sistemas.map(s => {
      const arr = ncsPorSistema[s]
      const a = arr.filter((n: any) => n.prioridade === 'Alta').length
      const m = arr.filter((n: any) => n.prioridade === 'Média').length
      const b = arr.filter((n: any) => n.prioridade === 'Baixa').length
      return { s, a, m, b, t: a + m + b }
    })
    const totA = stat.reduce((t, s) => t + s.a, 0)
    const totM = stat.reduce((t, s) => t + s.m, 0)
    const totB = stat.reduce((t, s) => t + s.b, 0)
    const totT = totA + totM + totB

    // Buscar fotos das vistorias homologadas
    const ncsComFoto = await Promise.all((ncs ?? []).map(async (nc: any) => {
      if (nc.fotoBase64) return nc
      if (!nc._arquivo) return nc
      try {
        const { data: blob } = await supabase.storage.from('aime')
          .download(`vistorias_homologadas/${nc._arquivo}`)
        if (!blob) return nc
        const html = await blob.text()
        const m = html.match(/<img[^>]+src="(data:image[^"]+)"/)
        if (m) return { ...nc, fotoBase64: m[1] }
      } catch { /* sem foto */ }
      return nc
    }))

    // Imagens localização
    async function imgBuf(path: string): Promise<{ buf: Buffer; ext: 'png' | 'jpg' } | null> {
      if (!path) return null
      try {
        const { data, error } = await supabase.storage.from('aime').download(path)
        if (error || !data) return null
        const buf = Buffer.from(await data.arrayBuffer())
        const ext = path.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
        return { buf, ext: ext as 'png' | 'jpg' }
      } catch { return null }
    }

    const [imgCroqui, imgFachada, imgArt] = await Promise.all([
      imgBuf(complemento?.pathCroqui ?? ''),
      imgBuf(complemento?.pathFoto   ?? ''),
      imgBuf(complemento?.pathArt    ?? ''),
    ])

    // ── Cabeçalho e rodapé (igual ao template) ───────────────────────────────
    const cabTexto = X(inspetor?.cabecalho_documentos) || titulo
    const rodTexto = X(inspetor?.rodape_documentos) ||
      `${X(inspetor?.nome_inspetor)} — ${X(inspetor?.titulo_profissional)} — CREA/CAU ${X(inspetor?.inscricao_crea_cau)}`

    const headerCab = new Header({
      children: [
        new Paragraph({
          children: [new TextRun({ text: cabTexto, size: SZ_SM, font: FONT, color: PRETO })],
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: AZUL, space: 4 } },
          spacing: { after: 80 },
        }),
      ],
    })

    const footerRod = new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: rodTexto + '   Pág. ', size: SZ_XS, font: FONT, color: PRETO }),
            new TextRun({ children: [PageNumber.CURRENT], size: SZ_XS, font: FONT }),
            new TextRun({ text: ' de ', size: SZ_XS, font: FONT }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: SZ_XS, font: FONT }),
          ],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: '999999', space: 4 } },
          spacing: { before: 60 },
        }),
      ],
    })

    // ── Tabela 1.1 — Características ────────────────────────────────────────
    const W6 = Math.floor(TW / 6)
    const tab11 = bordaTabela([
      new TableRow({ children: [cel(`Características ${tipoServico === '43' ? 'do Imóvel' : 'da Edificação'}`, { bg: AZUL, bold: true, span: 6, align: AlignmentType.CENTER })] }),
      new TableRow({ children: [cel('Identificação e características da edificação:', { span: 6, bold: true, size: SZ_XS })] }),
      new TableRow({ children: [
        celLV(labelEst, X(estab?.razao_social_nome), W6 * 2),
        celLV(labelDoc, fmtDoc(cnpjoucpf), W6),
        celLV('CEP', X(estab?.cep), W6),
        cel('', { width: W6 * 2 }),
      ]}),
      new TableRow({ children: [
        celLV('Endereço', `${X(estab?.logradouro)}${estab?.numero ? ', ' + X(estab.numero) : ''}${estab?.complemento ? ' — ' + X(estab.complemento) : ''}`, W6 * 3),
        celLV('Bairro', X(estab?.bairro), W6 * 2),
        cel('', { width: W6 }),
      ]}),
      new TableRow({ children: [
        celLV('Cidade e UF', `${X(estab?.cidade)}/${X(estab?.uf)}`, W6),
        celLV('Nome do responsável', X(estab?.nome_responsavel), W6 * 2),
        celLV('Função do responsável', X(estab?.funcao_responsavel), W6 * 2),
        cel('', { width: W6 }),
      ]}),
      new TableRow({ children: [
        celLV('Telefone contato', X(estab?.whatsapp), W6 * 2),
        celLV('eMail contato', X(estab?.email), W6 * 2),
        celLV('Finalidade da vistoria', titulo, W6 * 2),
      ]}),
      new TableRow({ children: [
        celLV('Uso imóvel', X(estab?.uso_imovel), W6),
        celLV('Tipo imóvel', X(estab?.tipo_imovel), W6),
        celLV('Nr pavimentos', X(estab?.numero_pavimentos), W6),
        celLV('Nr unidades/salas', X(estab?.numero_unidades_salas), W6),
        celLV('Área construída', X(estab?.area_construida), W6),
        celLV('Área do terreno', X(estab?.area_terreno), W6),
      ]}),
      new TableRow({ children: [cel('Síntese da descrição da Edificação:', { span: 6, bold: true, size: SZ_XS })] }),
      new TableRow({ children: [
        new TableCell({
          columnSpan: 6,
          children: [par(X(complemento?.sinteseEdif || ''), { before: 40, after: 40 })],
          width: { size: TW, type: WidthType.DXA },
          margins: { top: 40, bottom: 80, left: 80, right: 80 },
        }),
      ]}),
    ], [W6, W6, W6, W6, W6, W6])

    // ── Tabela 1.1 — Localização ─────────────────────────────────────────────
    const imgW = Math.floor(TW / 2) - 100
    const imgH = MM(60)

    function celImagem(img: { buf: Buffer; ext: 'png' | 'jpg' } | null, placeholder: string): TableCell {
      return new TableCell({
        width: { size: Math.floor(TW / 2), type: WidthType.DXA },
        children: img
          ? [new Paragraph({
              children: [new ImageRun({ data: img.buf, transformation: { width: imgW / 15, height: imgH / 15 }, type: img.ext })],
              spacing: { before: 60, after: 60 },
            })]
          : [par(placeholder, { italic: true, align: AlignmentType.CENTER, before: 300, after: 300 })],
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
      })
    }

    const tab11loc = bordaTabela([
      new TableRow({ children: [cel('Localização do Estabelecimento', { bg: AZUL, bold: true, span: 2, align: AlignmentType.CENTER })] }),
      new TableRow({ children: [celImagem(imgCroqui, '< croqui maps >'), celImagem(imgFachada, '<foto fachada principal>')] }),
    ], [Math.floor(TW / 2), TW - Math.floor(TW / 2)])

    // ── Tabela 1.3 — Plano de Trabalho ───────────────────────────────────────
    const W13 = [800, 1000, 1200, 1200, TW - 4200]
    const tab13 = bordaTabela([
      new TableRow({ children: [cel('Agenda de Trabalho – Inspetor e Síndico', { bg: AZUL, bold: true, span: 5, align: AlignmentType.CENTER })] }),
      new TableRow({ children: [
        cel('Duração Prevista', { bg: AZUL, bold: true, span: 2, align: AlignmentType.CENTER }),
        cel('Período', { bg: AZUL, bold: true, span: 2, align: AlignmentType.CENTER }),
        cel('Atividades', { bg: AZUL, bold: true, width: TW - 4200, align: AlignmentType.CENTER }),
      ]}),
      new TableRow({ children: [
        cel('Horas', { bg: AZUL_MED, bold: true, width: 800, align: AlignmentType.CENTER }),
        cel('Dias Úteis', { bg: AZUL_MED, bold: true, width: 1000, align: AlignmentType.CENTER }),
        cel('Dt Início', { bg: AZUL_MED, bold: true, width: 1200, align: AlignmentType.CENTER }),
        cel('Dt Fim', { bg: AZUL_MED, bold: true, width: 1200, align: AlignmentType.CENTER }),
        cel('', { bg: AZUL_MED, width: TW - 4200 }),
      ]}),
      ...([
        ['2','1','Análise técnica inicial da edificação para conhecer as características básicas da edificação a ser estudada.'],
        ['3','1','Entrevista Inicial para coletar dados históricos do prédio e pedido de documentos legais'],
        ['3','3','Entrega documentos pelo síndico para o inspetor predial e análise pelo inspetor'],
        ['6','5','Execução da vistoria com levantamento das anomalias e falhas e coleta de evidências fotográficas'],
        ['34','6','Elaboração laudo efetuando análise, classificação, recomendações e consolidação do documento'],
        ['1','1','Entrega do Laudo de autovistoria ao Síndico'],
      ] as [string,string,string][]).map(([h, d, a]) =>
        new TableRow({ children: [
          cel(h, { width: 800, align: AlignmentType.CENTER }),
          cel(d, { width: 1000, align: AlignmentType.CENTER }),
          cel('', { width: 1200 }),
          cel('', { width: 1200 }),
          cel(a, { width: TW - 4200 }),
        ]})
      ),
      new TableRow({ children: [cel('', { span: 5 })] }),
    ], W13)

    // ── Tabela 3.3 — Classificação ───────────────────────────────────────────
    const itens33 = tipoServico === '43' ? [
      ['a)', 'A execução da obra em relação à CONFORMIDADE CONSTRUTIVA foi classificada como:', X(cl.nivel)],
      ['b)', 'A QUALIDADE DE ACABAMENTO do imóvel é classificada como:', X(cl.risco)],
      ['c)', 'Quanto ao uso, a FUNCIONALIDADE do imóvel:', X(cl.desempenho)],
      ['d)', 'Quanto às condições de ocupação, a HABITABILIDADE pode ser considerada:', X(cl.manut)],
      ['e)', 'A análise sobre a CLASSE DO IMÓVEL resulta em:', X(cl.uso)],
      ['f)', 'O GRAU DE SATISFAÇÃO NO RECEBIMENTO do imóvel:', X(cl.desempGeral)],
    ] : tipoServico === '44' ? [
      ['a)', 'Quanto ao ESTADO DE CONSERVAÇÃO da fachada pode ser classificado como:', X(cl.risco)],
      ['b)', 'O histórico de MANUTENÇÃO da fachada:', X(cl.manut)],
      ['c)', 'A AGRESSIVIDADE DO MEIO AMBIENTE sobre a fachada é considerada:', X(cl.desempenho)],
      ['d)', 'O RISCO DE QUEDA DE ELEMENTOS da fachada é considerado:', X(cl.uso)],
      ['e)', 'O DESEMPENHO TÉCNICO DO SISTEMA da fachada:', X(cl.desempGeral)],
    ] : [
      ['a)', 'Quanto ao NÍVEL da inspeção efetuada o imóvel em questão foi classificado como INSPEÇÃO PREDIAL NÍVEL:', nivel || '—'],
      ['b)', 'Quando ao GRAU DE RISCO o imóvel em questão encontra-se classificado como de RISCO:', X(cl.risco)],
      ['c)', 'Quanto ao DESEMPENHO a classificação geral do imóvel foi classificada como de DESEMPENHO:', X(cl.desempenho)],
      ['d)', 'Quanto a QUALIDADE DA MANUTENÇÃO a edificação foi classificada como QUALIDADE QUE:', X(cl.manut)],
      ['e)', 'Quanto as CONDIÇÕES DE USO a edificação foi classificada como EDIFICAÇÃO DE USO:', X(cl.uso)],
      ['f)', 'Quanto ao DESEMPENHO a edificação foi classificada como:', X(cl.desempGeral)],
    ]

    const titulo33 = tipoServico === '43' ? 'Resultado da Classificação do Imóvel'
      : tipoServico === '44' ? 'Resultado da Classificação da Fachada'
      : 'Resultado da Classificação da Edificação.'

    const W33 = [Math.floor(TW * 0.65), TW - Math.floor(TW * 0.65)]
    const tab33 = bordaTabela([
      new TableRow({ children: [cel(titulo33, { bg: AZUL, bold: true, span: 2, align: AlignmentType.CENTER })] }),
      new TableRow({ children: [cel('', { span: 2 })] }),
      ...itens33.map(([letra, desc, val]) =>
        new TableRow({ children: [
          cel(`${letra}  ${desc}`, { width: W33[0] }),
          cel(val || '—', { width: W33[1], bold: true, align: AlignmentType.CENTER }),
        ]})
      ),
      new TableRow({ children: [cel('', { span: 2 })] }),
    ], W33)

    // ── Tabelas 4.1 — NCs por sistema ────────────────────────────────────────
    const W41 = [600, 2200, 1800, 700, 800, TW - 6100]
    const elems41: any[] = []
    for (const s of sistemas) {
      const arr = ncsPorSistema[s]
      if (arr.length === 0) continue
      const rec = X(complemento?.recsSistema?.[s] ?? '')
      elems41.push(
        bordaTabela([
          new TableRow({ children: [cel('Relação de Não Conformidades e Soluções por Sistema Construtivo', { bg: AZUL, bold: true, span: 6, align: AlignmentType.CENTER })] }),
          new TableRow({ children: [cel('Sistema construtivo ou instalação:', { bold: true, span: 6 })] }),
          new TableRow({ children: [cel(nomeS(s), { span: 6 })] }),
          new TableRow({ children: [cel('Descrição:', { bold: true, span: 6 })] }),
          new TableRow({ children: [cel(descS(s), { span: 6 })] }),
          ...(rec ? [new TableRow({ children: [cel('Recomendação para o sistema construtivo:', { bold: true, span: 6 })] }),
                     new TableRow({ children: [cel(rec, { span: 6 })] })] : []),
          new TableRow({ children: [
            cel('Foto', { bg: AZUL, bold: true, width: 600, align: AlignmentType.CENTER }),
            cel('Não Conformidade', { bg: AZUL, bold: true, width: 2200 }),
            cel('Local ocorrência', { bg: AZUL, bold: true, width: 1800 }),
            cel('Grau Risco', { bg: AZUL, bold: true, width: 700, align: AlignmentType.CENTER }),
            cel('Prioridade', { bg: AZUL, bold: true, width: 800, align: AlignmentType.CENTER }),
            cel('Soluções', { bg: AZUL, bold: true, width: TW - 6100 }),
          ]}),
          ...arr.map((nc: any, i: number) => new TableRow({ children: [
            cel(X(nc.fotoNr), { width: 600, align: AlignmentType.CENTER }),
            cel(X(nc.nc || nc.anomalia), { width: 2200 }),
            cel(`${X(nc.local)}${nc.complemento ? ' — ' + X(nc.complemento) : ''}`, { width: 1800 }),
            cel(X(nc.grauRisco), { width: 700, align: AlignmentType.CENTER }),
            cel(X(nc.prioridade), { width: 800, align: AlignmentType.CENTER, bold: true }),
            cel(X(nc.solucaoNC || nc.cp || '—'), { width: TW - 6100 }),
          ]})),
          new TableRow({ children: [cel('', { span: 6 })] }),
        ], W41),
        par('')
      )
    }

    // ── Tabela 4.2 — Estatística ─────────────────────────────────────────────
    const W42a = Math.floor(TW * 0.28)
    const W42b = Math.floor((TW - W42a) / 8)
    const tab42 = bordaTabela([
      new TableRow({ children: [cel('Estatística de Manifestações Patológicas por Sistema Construtivo', { bg: AZUL, bold: true, span: 9, align: AlignmentType.CENTER })] }),
      new TableRow({ children: [
        cel('Sistemas construtivos', { bg: AZUL_MED, bold: true, rowSpan: 2, width: W42a, vAlign: VerticalAlign.CENTER }),
        cel('Manifestações por Prioridades', { bg: AZUL_MED, bold: true, span: 6, align: AlignmentType.CENTER }),
        cel('Sub total', { bg: AZUL_MED, bold: true, width: W42b, align: AlignmentType.CENTER }),
        cel('%', { bg: AZUL_MED, bold: true, width: W42b, align: AlignmentType.CENTER }),
      ]}),
      new TableRow({ children: [
        cel('A', { bg: AZUL_MED, bold: true, width: W42b, align: AlignmentType.CENTER }),
        cel('%', { bg: AZUL_MED, bold: true, width: W42b, align: AlignmentType.CENTER }),
        cel('M', { bg: AZUL_MED, bold: true, width: W42b, align: AlignmentType.CENTER }),
        cel('%', { bg: AZUL_MED, bold: true, width: W42b, align: AlignmentType.CENTER }),
        cel('B', { bg: AZUL_MED, bold: true, width: W42b, align: AlignmentType.CENTER }),
        cel('%', { bg: AZUL_MED, bold: true, width: W42b, align: AlignmentType.CENTER }),
      ]}),
      ...stat.map(({ s, a, m, b, t }) =>
        new TableRow({ children: [
          cel(nomeS(s), { width: W42a }),
          cel(a ? String(a) : '', { width: W42b, align: AlignmentType.CENTER }),
          cel(a ? pct(a, t) : '', { width: W42b, align: AlignmentType.CENTER }),
          cel(m ? String(m) : '', { width: W42b, align: AlignmentType.CENTER }),
          cel(m ? pct(m, t) : '', { width: W42b, align: AlignmentType.CENTER }),
          cel(b ? String(b) : '', { width: W42b, align: AlignmentType.CENTER }),
          cel(b ? pct(b, t) : '', { width: W42b, align: AlignmentType.CENTER }),
          cel(t ? String(t) : '', { width: W42b, align: AlignmentType.CENTER, bold: true }),
          cel(t ? pct(t, totT) : '', { width: W42b, align: AlignmentType.CENTER }),
        ]})
      ),
      new TableRow({ children: [
        cel('Total de ocorrências', { bold: true, bg: 'EEF2FF', width: W42a }),
        cel(String(totA), { bg: 'FEE2E2', bold: true, width: W42b, align: AlignmentType.CENTER }),
        cel(pct(totA, totT), { bg: 'FEE2E2', width: W42b, align: AlignmentType.CENTER }),
        cel(String(totM), { bg: 'FEF9C3', bold: true, width: W42b, align: AlignmentType.CENTER }),
        cel(pct(totM, totT), { bg: 'FEF9C3', width: W42b, align: AlignmentType.CENTER }),
        cel(String(totB), { bg: 'DCFCE7', bold: true, width: W42b, align: AlignmentType.CENTER }),
        cel(pct(totB, totT), { bg: 'DCFCE7', width: W42b, align: AlignmentType.CENTER }),
        cel(String(totT), { bg: 'EEF2FF', bold: true, width: W42b, align: AlignmentType.CENTER }),
        cel('100%', { bg: 'EEF2FF', width: W42b, align: AlignmentType.CENTER }),
      ]}),
      new TableRow({ children: [cel('A = Alta; M = Média; B = Baixa', { span: 9, italic: true, size: SZ_XS })] }),
    ])

    // ── Tabela 5 — Recomendações ─────────────────────────────────────────────
    const W5num = 500
    const tab5 = bordaTabela([
      new TableRow({ children: [
        new TableCell({
          width: { size: W5num, type: WidthType.DXA },
          children: [par('5.1', { bold: true, align: AlignmentType.CENTER })],
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EEF2FF' },
          margins: { top: 60, bottom: 60, left: 40, right: 40 },
        }),
        new TableCell({
          children: [
            par('5.1.- Avaliação e recomendações da manutenção.', { bold: true, before: 40, after: 40 }),
            par(X(complemento?.rec51) || '[A ser preenchido pelo responsável técnico]', { before: 20, after: 60 }),
          ],
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
        }),
      ]}),
      new TableRow({ children: [
        new TableCell({
          width: { size: W5num, type: WidthType.DXA },
          children: [par('5.2', { bold: true, align: AlignmentType.CENTER })],
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EEF2FF' },
          margins: { top: 60, bottom: 60, left: 40, right: 40 },
        }),
        new TableCell({
          children: [
            par('5.2.- Avaliação e recomendações do uso da edificação.', { bold: true, before: 40, after: 40 }),
            par(X(complemento?.rec52) || '[A ser preenchido pelo responsável técnico]', { before: 20, after: 60 }),
          ],
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
        }),
      ]}),
      new TableRow({ children: [
        new TableCell({
          width: { size: W5num, type: WidthType.DXA },
          children: [par('5.3', { bold: true, align: AlignmentType.CENTER })],
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EEF2FF' },
          margins: { top: 60, bottom: 60, left: 40, right: 40 },
        }),
        new TableCell({
          children: [
            par('5.3.- Avaliação e recomendações da sustentabilidade.', { bold: true, before: 40, after: 40 }),
            par(X(complemento?.rec53) || '[A ser preenchido pelo responsável técnico]', { before: 20, after: 60 }),
          ],
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
        }),
      ]}),
      new TableRow({ children: [
        new TableCell({
          width: { size: W5num, type: WidthType.DXA },
          children: [par('5.4', { bold: true, align: AlignmentType.CENTER })],
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EEF2FF' },
          margins: { top: 60, bottom: 60, left: 40, right: 40 },
        }),
        new TableCell({
          children: [
            par('5.4.- Outras avaliações e recomendações.', { bold: true, before: 40, after: 40 }),
            par(X(complemento?.rec54) || '[A ser preenchido pelo responsável técnico]', { before: 20, after: 60 }),
          ],
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
        }),
      ]}),
    ])

    // ── Anexo 1 — Documentos ─────────────────────────────────────────────────
    const W_DOC = Math.floor(TW * 0.58)
    const W_SIT = Math.floor(TW * 0.21)
    const W_RES = TW - W_DOC - W_SIT
    const tabA1 = bordaTabela([
      new TableRow({ children: [
        cel('Documentos', { bg: AZUL, bold: true, width: W_DOC }),
        cel('Situação', { bg: AZUL, bold: true, width: W_SIT, align: AlignmentType.CENTER }),
        cel('Resultado', { bg: AZUL, bold: true, width: W_RES }),
      ]}),
      ...DOCS_ANEXO1.map(d => {
        const info = (complemento?.docsAnexo1 ?? {})[d] ?? {}
        const sit  = info.situacao  || '—'
        const res  = info.resultado || '—'
        return new TableRow({ children: [
          cel(d, { width: W_DOC }),
          cel(sit, { width: W_SIT, align: AlignmentType.CENTER, bold: sit === 'Entregue' }),
          cel(res, { width: W_RES }),
        ]})
      }),
    ], [W_DOC, W_SIT, W_RES])

    // ── Anexo 2 — Formulários das vistorias homologadas ──────────────────────
    // Layout idêntico ao formulário HTML (Formulario_autovistoria_A4_Forms.html)
    const elemsA2: any[] = []
    for (let idx = 0; idx < (ncsComFoto ?? []).length; idx++) {
      const nc = (ncsComFoto ?? [])[idx]
      const ns  = X(nc.sistema).slice(3).replace(/_/g, ' ')
      const grN = Number(nc.grauRisco)
      const corGR   = grN >= 64 ? 'DC2626' : grN >= 35 ? 'D97706' : '16A34A'
      const bgGR    = grN >= 64 ? 'FEE2E2' : grN >= 35 ? 'FEF9C3' : 'DCFCE7'
      const priSim  = grN >= 64 ? '▲ Alta' : grN >= 35 ? '■ Média' : '▼ Baixa'
      const AZUL_FORM = '0C447C'
      const AZUL_TIT  = '185FA5'

      if (idx > 0) elemsA2.push(new Paragraph({ children: [new PageBreak()] }))

      // Cabeçalho do formulário
      elemsA2.push(new Table({
        width: { size: TW, type: WidthType.DXA },
        borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }, insideH: { style: BorderStyle.NIL }, insideV: { style: BorderStyle.NIL } },
        rows: [new TableRow({ children: [new TableCell({
          width: { size: TW, type: WidthType.DXA },
          children: [
            new Paragraph({ children: [new TextRun({ text: 'AIMÊ  ', bold: true, size: 26, font: FONT, color: BRANCO }), new TextRun({ text: 'Autovistoria', bold: true, size: 22, font: FONT, color: BRANCO })], spacing: { before: 80, after: 20 }, indent: { left: 100 } }),
            new Paragraph({ children: [new TextRun({ text: 'Formulário para registro de manifestações patológicas e avaliação de riscos', size: 14, font: FONT, color: 'B5D4F4' })], spacing: { before: 0, after: 80 }, indent: { left: 100 } }),
          ],
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: AZUL_FORM },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
        })]}),
        ],
        margins: { bottom: 80 },
      }))

      // Helper blocos do formulário
      function blocoForm(titulo: string, rows: TableRow[]): Table {
        return new Table({
          width: { size: TW, type: WidthType.DXA },
          borders: {
            top:     { style: BorderStyle.SINGLE, size: 2, color: 'B5D4F4' },
            bottom:  { style: BorderStyle.SINGLE, size: 2, color: 'B5D4F4' },
            left:    { style: BorderStyle.SINGLE, size: 2, color: 'B5D4F4' },
            right:   { style: BorderStyle.SINGLE, size: 2, color: 'B5D4F4' },
            insideH: { style: BorderStyle.NIL },
            insideV: { style: BorderStyle.NIL },
          },
          rows: [
            new TableRow({ children: [new TableCell({
              columnSpan: 10,
              width: { size: TW, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: titulo.toUpperCase(), bold: true, size: 14, font: FONT, color: BRANCO })], spacing: { before: 40, after: 40 }, indent: { left: 80 } })],
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: AZUL_TIT },
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
            })] }),
            ...rows,
          ],
          margins: { bottom: 80 },
        })
      }

      function celF(label: string, valor: string, width: number): TableCell {
        return new TableCell({
          width: { size: width, type: WidthType.DXA },
          children: [
            new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 12, font: FONT, color: '4a6480' })], spacing: { before: 40, after: 10 } }),
            new Paragraph({ children: [new TextRun({ text: valor || '—', size: SZ_XS, font: FONT, color: PRETO })], spacing: { before: 0, after: 40 }, border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' } } as any }),
          ],
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
        })
      }

      const W2 = Math.floor(TW / 2)
      const W3 = Math.floor(TW / 3)
      const W4 = Math.floor(TW / 4)

      elemsA2.push(
        // IDENTIFICAÇÃO
        blocoForm('Identificação', [
          new TableRow({ children: [celF(labelDoc, fmtDoc(X(nc.cnpjoucpf || cnpjoucpf)), W2), celF('Razão Social / Nome', X(estab?.razao_social_nome), TW - W2)] }),
        ]),

        // MANIFESTAÇÃO PATOLÓGICA
        blocoForm('Manifestação Patológica', [
          new TableRow({ children: [celF('Sistema', ns, W3), celF('Subsistema', X(nc.subsistema), W3), celF('Anomalia / Falha', X(nc.anomalia), TW - 2 * W3)] }),
          new TableRow({ children: [celF('Origem', X(nc.origem || nc.resultado || '—'), W3), celF('Local de Ocorrência', X(nc.local), W3), celF('Complemento do Local', X(nc.complemento), TW - 2 * W3)] }),
        ]),

        // CLASSIFICAÇÃO DE RISCO
        blocoForm('Classificação de Risco', [
          new TableRow({ children: [celF('Gravidade', X(nc.gravidade), W4), celF('Urgência', X(nc.urgencia), W4), celF('Abrangência', X(nc.abrangencia), W4), celF('Exposição', X(nc.exposicao), TW - 3 * W4)] }),
          new TableRow({ children: [
            new TableCell({
              width: { size: W2, type: WidthType.DXA },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'GRAU DE RISCO', bold: true, size: 12, font: FONT, color: '4a6480' })], spacing: { before: 60, after: 20 } }),
                new Paragraph({ children: [new TextRun({ text: X(nc.grauRisco), bold: true, size: 40, font: FONT, color: corGR })], spacing: { before: 0, after: 60 } }),
              ],
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: bgGR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' } },
            }),
            new TableCell({
              width: { size: TW - W2, type: WidthType.DXA },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'PRIORIDADE', bold: true, size: 12, font: FONT, color: '4a6480' })], spacing: { before: 60, after: 20 }, alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: priSim, bold: true, size: 22, font: FONT, color: corGR })], spacing: { before: 0, after: 60 }, alignment: AlignmentType.CENTER }),
              ],
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: bgGR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
            }),
          ]}),
        ]),
      )

      // EVIDÊNCIA FOTOGRÁFICA
      const fotoRows: TableRow[] = [
        new TableRow({ children: [celF('Foto Nº', X(nc.fotoNr), W2), celF('Data da Vistoria', X(nc.dataVistoria), TW - W2)] }),
      ]
      if (nc.fotoBase64 && nc.fotoBase64.startsWith('data:image')) {
        try {
          const m2 = nc.fotoBase64.match(/^data:([^;]+);base64,(.+)$/)
          if (m2) {
            const buf = Buffer.from(m2[2], 'base64')
            const ext = m2[1].includes('png') ? 'png' as const : 'jpg' as const
            fotoRows.push(new TableRow({ height: { value: 4500, rule: 'atLeast' as any }, children: [new TableCell({
              columnSpan: 10,
              width: { size: TW, type: WidthType.DXA },
              children: [new Paragraph({ children: [new ImageRun({ data: buf, transformation: { width: 500, height: 300 }, type: ext })], alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 } })],
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E6F1FB' },
              borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
            })] }))
          }
        } catch { /* sem foto */ }
      } else {
        fotoRows.push(new TableRow({ height: { value: 1000, rule: 'atLeast' as any }, children: [new TableCell({
          columnSpan: 10,
          width: { size: TW, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: '[Sem foto disponível]', italics: true, size: SZ_XS, font: FONT, color: '9CA3AF' })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } })],
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E6F1FB' },
          borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'B5D4F4' }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
        })] }))
      }
      elemsA2.push(blocoForm('Evidência Fotográfica', fotoRows))

      // RESULTADO DA ANÁLISE
      elemsA2.push(blocoForm('Resultado da Análise e Avaliação', [
        new TableRow({ children: [new TableCell({ columnSpan: 10, width: { size: TW, type: WidthType.DXA }, children: [
          new Paragraph({ children: [new TextRun({ text: 'DESCRIÇÃO DA NÃO CONFORMIDADE (NC)', bold: true, size: 12, font: FONT, color: '4a6480' })], spacing: { before: 40, after: 10 } }),
          new Paragraph({ children: [new TextRun({ text: X(nc.nc || nc.anomalia || '—'), size: SZ_XS, font: FONT })], spacing: { before: 0, after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: 'DESCRIÇÃO DA CAUSA PROVÁVEL (CP)', bold: true, size: 12, font: FONT, color: '4a6480' })], spacing: { before: 40, after: 10 } }),
          new Paragraph({ children: [new TextRun({ text: X(nc.cp || '—'), size: SZ_XS, font: FONT })], spacing: { before: 0, after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: 'SOLUÇÃO', bold: true, size: 12, font: FONT, color: '4a6480' })], spacing: { before: 40, after: 10 } }),
          new Paragraph({ children: [new TextRun({ text: X(nc.solucaoNC || nc.cp || '—'), size: SZ_XS, font: FONT })], spacing: { before: 0, after: 60 } }),
        ], margins: { top: 40, bottom: 40, left: 80, right: 80 }, borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } } })] }),
      ]))
    }

    // ─── Montar o documento completo ──────────────────────────────────────────
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: MM(210), height: MM(297) },
            margin: { top: MM(25), bottom: MM(20), left: MM(25), right: MM(20) },
          },
        },
        headers: { default: headerCab },
        footers: { default: footerRod },
        children: [
          // ── Seção 1 ─────────────────────────────────────────────────────────
          h1('1.- Considerações Preliminares.'),
          par(`Este ${titulo} é o documento completo resultante do trabalho executado na vistoria da edificação, análise, classificação e priorização das manifestações patológicas, conforme exigências da ABNT NBR 16.747/2020 e NBR 15. , recomendações da Norma de Inspeção Predial do IBAPE de 2025 e legislação vigente.`),
          par('A inspeção apresentada neste laudo é o resultado de um exame "clínico geral" que avalia as condições globais do objeto em estudo e detecta a existência de problemas de conservação ou funcionamento, com base em uma análise fundamentalmente sensorial e efetuada por um profissional habilitado. Com base nesta análise, pode ocorrer a recomendação de contratação de ensaios especializadas ou outras ações para que se possa aprofundar e refinar o diagnóstico.'),
          par('A documentação da edificação solicitada pelo inspetor na reunião inicial foi analisada e avaliada, e o resultado fica registrado na planilha apresentada no Anexo 1 deste laudo.'),
          par(''),

          h2('1.1.- Características e localização da edificação.'),
          tab11,
          par(''),
          tab11loc,
          par(''),

          h2('1.2.- Objetivo.'),
          par('Avaliar as condições de segurança, funcionalidade, habitabilidade e manutenção da edificação, de acordo com os critérios da ABNT NBR 16.747/2020, normas correlatas, legislação vigente e metodologia apresentada neste documento.'),
          par(''),

          h2('1.3.- Plano de Trabalho.'),
          par('As etapas básicas desenvolvidas para a realização do presente trabalho de Inspeção Predial constam na tabela que segue:'),
          tab13,
          par(''),

          h2('1.4.- Condições e limitações.'),
          par('O Laudo de Inspeção Predial segue as condições abaixo relacionadas, além de estar sujeito às seguintes limitações:'),
          li('Neste trabalho computamos como corretos os elementos documentais consultados e as informações prestadas por terceiros, de boa fé e confiáveis;'),
          li('O trabalho apresentado e o resultado final são válidos apenas para a sequência metodológica apresentada, sendo vedada a utilização deste laudo em conexão com qualquer outro trabalho, exceto como referência para contratação dos serviços de manutenção;'),
          li('O responsável técnico não assume responsabilidade sobre matéria alheia ao exercício profissional, estabelecido em leis, códigos e regulamentos. Foram observadas apenas condições externas que, eventualmente, possam influenciar o desempenho, a segurança ou a manutenção da edificação, sem caracterizar análise do poder público ou de serviços urbanos.'),
          par(''),

          // ── Seção 2 ─────────────────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),
          h1('2.- Metodologia adotada para o Trabalho de Autovistoria.'),
          par('A metodologia adotada para este trabalho segue as normas da ABNT, IBAPE e legislação estadual e municipal que regulamentam a autovistoria.'),
          par(''),

          h2('2.1.- Norma Brasileira para Inspeção Predial - NBR-16.747/2020.'),
          par('A metodologia básica para execução do presente trabalho foi pautada nos requisitos constantes da NBR-16.747/2020 (Inspeção Predial – Diretrizes, Conceitos, Terminologia e Procedimentos) da Associação Brasileira de Normas Técnicas - ABNT, como segue:'),
          par([new TextRun({ text: '"Abrangências da análise', bold: true, italic: true, size: SZ, font: FONT, color: PRETO })]),
          par('A inspeção predial baseia-se na constatação e análise do estado aparente de desempenho dos sistemas construtivos na fase de uso, operação e manutenção, considerando os requisitos dos usuários.', { italic: true }),
          par('A análise consiste na constatação da situação da edificação quanto à sua capacidade de atender à suas funções segundo os requisitos dos usuários, com registro das anomalias, falhas de manutenção, uso e operação e manifestações patológicas identificadas nos diversos sistemas construtivos e instalações de uma edificação.', { italic: true }),
          par(''),

          h2('2.2.- Norma de Inspeção Predial do IBAPE/2025.'),
          par('A Norma de Inspeção Predial do IBAPE fixa diretrizes, conceitos, terminologias, critérios e procedimentos relativos à atividade de Inspeção Predial, a fim de detalhar a metodologia com base na ABNT NBR 16747/2020 - Inspeção Predial: Diretrizes, Conceitos, Terminologia e Procedimento. Fornece procedimentos essenciais para a Inspeção Predial, considerando a análise das condições técnicas, de uso, operação, manutenção e funcionalidade da edificação e de seus sistemas e subsistemas construtivos, de forma sistêmica e predominantemente sensorial. Tais procedimentos se baseiam na avaliação da perda de desempenho na fase de uso da edificação, observados os seguintes requisitos de desempenho definidos pelas exigências dos usuários:'),
          liAlpha('a', [new TextRun({ text: 'Segurança: ', italic: true, bold: true, size: SZ, font: FONT }), new TextRun({ text: 'segurança estrutural; segurança contra incêndio; segurança no uso e na operação;', italic: true, size: SZ, font: FONT })]),
          liAlpha('b', [new TextRun({ text: 'Habitabilidade: ', italic: true, bold: true, size: SZ, font: FONT }), new TextRun({ text: 'estanqueidade; saúde, higiene e qualidade do ar; funcionalidade e acessibilidade;', italic: true, size: SZ, font: FONT })]),
          liAlpha('c', [new TextRun({ text: 'Sustentabilidade: ', italic: true, bold: true, size: SZ, font: FONT }), new TextRun({ text: 'durabilidade e manutenibilidade.', italic: true, size: SZ, font: FONT })]),
          par('A norma se aplica a todas as tipologias de edificações, sendo elas públicas ou privadas, devendo ser observadas as características técnicas e complexidade dos sistemas e subsistemas construtivos para definição da equipe multidisciplinar, formada por profissionais habilitados, necessária para a Inspeção Predial.'),
          par([new TextRun({ text: 'As normas ABNT apresentadas a seguir são referências auxiliares e complementares à aplicação da norma IBAPE: NBR 16747: Inspeção Predial – Diretrizes, Conceitos, Terminologia e Procedimento; NBR 5674: Manutenção de Edificações – Requisitos para Sistemas de Gestão de Manutenção; NBR 16280: Reforma de Edificação - Requisitos. NBR 14037: Diretrizes para Elaboração de Manuais de Uso, Operação e Manutenção das Edificações – Requisitos para Elaboração e Apresentação dos Conteúdos; e NBR 15575-1: Edificações Habitacionais – Desempenho, Parte 1: Procedimentos Gerais.', italic: true, size: SZ, font: FONT })]),
          par(''),

          h2('2.3.- Critérios e Metodologia da Inspeção.'),
          h3('2.3.1.- Critérios.'),
          par('O critério utilizado para elaboração de laudos baseia-se na análise do risco oferecido aos usuários, ao meio ambiente e ao patrimônio, diante as condições técnicas, de uso, operação e manutenção da edificação, bem como da natureza da exposição ambiental.'),
          par('A análise do risco consiste na classificação das anomalias e falhas identificadas nos diversos sistemas construtivos e instalações de uma edificação, quanto ao seu grau de risco, relacionado com fatores de conservação, depreciação, saúde, segurança, funcionalidade, comprometimento de vida útil e perda de desempenho.'),

          h3('2.3.2.- Método.'),
          par('O método empregado consiste em: determinar o nível da inspeção predial (NBR 16.747); verificar e analisar a documentação; obter informações com responsável pela edificação; vistoriar os sistemas construtivos e instalações definidos para o escopo do trabalho; classificar as anomalias e falhas constatadas nos itens vistoriados; registrar as não conformidades e as evidências por imagens; classificar e analisar as anomalias e falhas quanto a origem e ao grau de risco; definir prioridades de manutenção; efetuar recomendações técnicas e soluções; avaliar a manutenção e uso da edificação; apresentar recomendações gerais e de sustentabilidade; elaborar o laudo técnico; e apresentar as ART\'s/RRT\'s com os responsáveis técnicos.'),
          par('O planejamento da vistoria inclui uma entrevista com o responsável pela edificação, abordando características técnicas e aspectos cotidianos da manutenção e do uso do imóvel.'),

          h3('2.3.3.- Classificação das Inspeções Prediais (NBR 16.747) e Edificações.'),
          par('Aa classificação das inspeções prediais e edificações devem ser efetuadas segundo critérios definidos em nomas técnicas, conforme segue:'),
          liAlpha('a', [new TextRun({ text: 'Quanto ao ', size: SZ, font: FONT }), new TextRun({ text: 'NÍVEL', bold: true, size: SZ, font: FONT }), new TextRun({ text: ' de inspeção predial as edificações são classificadas quanto a sua complexidade e elaboração de laudo, consideradas as características técnicas da edificação, manutenção e operação existentes e necessidade de formação de equipe multidisciplinar para execução dos trabalhos. Os níveis de inspeção predial podem ser classificados em nível 1, nível 2 e nível 3:', size: SZ, font: FONT })]),
          li([new TextRun({ text: 'NÍVEL 1: ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'Edificações mais simples, sem necessidade de equipe multidisciplinar, necessário somente um profissional: Engenheiro Civil ou Arquiteto;', size: SZ, font: FONT })], 1080),
          li([new TextRun({ text: 'NÍVEL 2: ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'Edifícios multifamiliares ou comerciais sem sistemas construtivos mais complexos como climatização, automação, etc, somente com elevadores. Requer equipe multidisciplinar composta de Engenheiro Civil ou Arquiteto e Engenheiro Elétrico;', size: SZ, font: FONT })], 1080),
          li([new TextRun({ text: 'NÍVEL 3: ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'Edificações complexas onde há sistemas implantados com manutenção regulamentada pela NBR 5674 da ABNT. Requer equipe multidisciplinar composta de Engenheiro Civil ou Arquiteto, Engenheiro Elétrico e Engenheiro Mecânico.', size: SZ, font: FONT })], 1080),
          liAlpha('b', [new TextRun({ text: 'Quanto ao ', size: SZ, font: FONT }), new TextRun({ text: 'RISCO', bold: true, size: SZ, font: FONT }), new TextRun({ text: ' as edificações são classificadas considerando o risco oferecido aos usuários, ao meio ambiente e ao patrimônio, dentro dos limites da inspeção predial:', size: SZ, font: FONT })]),
          li([new TextRun({ text: 'CRÍTICO: ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'Relativo ao risco que pode provocar danos contra a saúde e segurança das pessoas e/ou meio ambiente, perda excessiva de desempenho causando possíveis paralisações, aumento de custo, comprometimento sensível de vida útil e desvalorização acentuada, recomendando intervenção imediata;', size: SZ, font: FONT })], 1080),
          li([new TextRun({ text: 'REGULAR: ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'Relativo ao risco que pode provocar a perda de funcionalidade sem prejuízo à operação direta de sistemas, perda pontual de desempenho (possibilidade de recuperação), deterioração precoce e pequena desvalorização, recomendando programação e intervenção a curto prazo;', size: SZ, font: FONT })], 1080),
          li([new TextRun({ text: 'MÍNIMO: ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'Relativo a pequenos prejuízos à estética ou atividade programável e planejada, sem incidência ou sem a probabilidade de ocorrência dos riscos críticos e regulares, além de baixo ou nenhum comprometimento do valor imobiliário, recomendando programação e intervenção a médio prazo.', size: SZ, font: FONT })], 1080),
          liAlpha('c', [new TextRun({ text: 'Quanto ao ', size: SZ, font: FONT }), new TextRun({ text: 'DESEMPENHO', bold: true, size: SZ, font: FONT }), new TextRun({ text: ' as edificações são classificadas em três níveis de desempenho: MINIMO, INTERMEDIÁRIO e SUPERIOR;', size: SZ, font: FONT })]),
          par('As ', { indent: 720 }),
          par([new TextRun({ text: 'As Prioridades', bold: true, size: SZ, font: FONT }), new TextRun({ text: ' para efetuar as manutenções das não conformidades são apuradas por metodologias técnicas como a GUT adaptado (Gravidade, Urgência e Tendência), ou outra que as dispõe em ordem decrescente quanto ao grau de risco:', size: SZ, font: FONT })]),
          li([new TextRun({ text: 'Prioridade 1 (Alta)', bold: true, size: SZ, font: FONT }), new TextRun({ text: ': ações necessárias para correção das não conformidades devem ser executadas de imediato, quando a perda de desempenho compromete a saúde e/ou a segurança dos usuários, e/ou a funcionalidade dos sistemas construtivos, com possíveis paralisações; comprometimento de durabilidade (vida útil) e/ou aumento expressivo de custo de manutenção e de recuperação. A manutenção deve ser efetuada em prazo inferior a 8 meses;', size: SZ, font: FONT })]),
          li([new TextRun({ text: 'Prioridade 2 (Média)', bold: true, size: SZ, font: FONT }), new TextRun({ text: ': ações corretivas necessárias a serem executadas a médio prazo, quando a perda parcial de desempenho (real ou potencial) tem impacto sobre a funcionalidade da edificação, sem prejuízo à operação direta de sistemas e sem comprometer a saúde e segurança dos usuários. A manutenção deve ser efetuada em prazo inferior a 15 meses;', size: SZ, font: FONT })]),
          li([new TextRun({ text: 'Prioridade 3 (Baixa)', bold: true, size: SZ, font: FONT }), new TextRun({ text: ': ações necessárias a serem planejadas a longo prazo, quando a perda de desempenho (real ou potencial) pode ocasionar pequenos prejuízos à estética ou quando as ações necessárias são atividades programáveis e passíveis de planejamento, além de baixo ou nenhum comprometimento do valor da edificação. A manutenção pode ser efetuada em prazo não superior a 30 meses.', size: SZ, font: FONT })]),

          h3('2.3.4.- Critérios para avaliação da manutenção, uso da edificação e do desempenho.'),
          par('As recomendações quanto a manutenção, uso da edificação e sustentabilidade serão efetuadas segundo os critérios que seguem.'),
          liAlpha('a', [new TextRun({ text: 'Quanto a ', size: SZ, font: FONT }), new TextRun({ text: 'MANUTENÇÃO', bold: true, size: SZ, font: FONT }), new TextRun({ text: ' da edificação será avaliada a coerência entre o plano de manutenção apresentado e o recomendado pela construtora no Manual de Uso e de Manutenção e as especificações dos fabricantes de equipamentos e sistemas inspecionados em conformidade com a ABNT NBR 14037. Na avaliação serão considerados a existência ou não de plano de manutenção, a idade da construção, seu uso regular e condições de exposição ambiental entre outros aspectos, além de verificar se existem condições mínimas necessárias de acesso aos equipamentos e sistemas, condições de segurança para o mantenedor e usuários da edificação, efetiva execução das atividades dispostas no plano de manutenção, procedimentos técnicos e periodicidades de execução das atividades de manutenção da edificação, classificando-a como: TOTALMENTE; PARCIALMENTE; ou NÃO ATENDE.', size: SZ, font: FONT })]),
          liAlpha('b', [new TextRun({ text: 'Quanto as ', size: SZ, font: FONT }), new TextRun({ text: 'CONDIÇÕES DE USO', bold: true, size: SZ, font: FONT }), new TextRun({ text: ' a análise de cada um dos sistemas construtivos será efetuada em relação ao tipo de uso previsto em projeto, com observância de informações em projetos, se existirem, que estabeleçamos parâmetros operacionais e de uso de sistemas para a edificação inspecionada, dados de fabricantes, legislação específica e outros documentos que indiquem o uso adequado dos elementos, sistemas e equipamentos inspecionados. A classificação da condição de uso poderá ser REGULAR ou IRREGULAR:', size: SZ, font: FONT })]),
          li([new TextRun({ text: 'USO REGULAR ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'é aquele onde a edificação é ocupada e utilizada dentro dos parâmetros previstos no projeto;', size: SZ, font: FONT })], 1080),
          li([new TextRun({ text: 'USO IRREGULAR ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'quando a edificação se encontra ocupada e utilizada de forma irregular, com o uso divergente do previsto no projeto.', size: SZ, font: FONT })], 1080),
          liAlpha('c', [new TextRun({ text: 'Quanto a ', size: SZ, font: FONT }), new TextRun({ text: 'DESEMPENHO', bold: true, size: SZ, font: FONT }), new TextRun({ text: ' a edificação é classificado por níveis, a partir da avaliação das anomalias e falhas, considerando gravidade, urgência e tendência. A classificação poderá ser BOM; REGULAR; RUIM; CRÍTICO:', size: SZ, font: FONT })]),
          li([new TextRun({ text: 'BOM, ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'a edificação encontra-se em bom estado de conservação e funcionamento. Anomalias inexistentes ou leves, sem impacto relevante no desempenho;', size: SZ, font: FONT })], 1080),
          li([new TextRun({ text: 'REGULAR, ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'anomalias leves a moderadas, com impactos pontuais. Exige manutenções corretivas programáveis;', size: SZ, font: FONT })], 1080),
          li([new TextRun({ text: 'RUIM, ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'anomalias significativas, com prejuízo ao desempenho, durabilidade ou segurança. Requer intervenções corretivas prioritárias;', size: SZ, font: FONT })], 1080),
          li([new TextRun({ text: 'CRÍTICO, ', bold: true, size: SZ, font: FONT }), new TextRun({ text: 'anomalias graves, com risco à segurança, à saúde ou à funcionalidade. Demanda intervenção imediata.', size: SZ, font: FONT })], 1080),
          par(''),

          // ── Seção 3 ─────────────────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),
          h1('3.- Resultado da Vistoria Técnica e Classificação da Edificação.'),
          h2('3.1.- Descrição da Vistoria Técnica.'),
          bordaTabela([
            new TableRow({ children: [cel('Descrição da Realização da Vistoria', { bg: AZUL, bold: true, span: 1, align: AlignmentType.CENTER })] }),
            new TableRow({ height: { value: 1200, rule: 'atLeast' as any }, children: [new TableCell({
              children: [par(X(complemento?.descVistoria || complemento?.dadosVistoria) || '<descrever como foi realizada a vistoria>', { before: 40, after: 40 })],
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
            })] }),
            new TableRow({ children: [cel('', { span: 1 })] }),
          ]),
          par('Os sistemas construtivos e instalações vistoriadas, com as condições observadas e as respectivas recomendações são apresentadas nos Relatórios de Não Conformidades, item 4 deste documento.'),
          par('O resultado da vistoria é apresentado por sistema construtivo ou instalação, num conjunto de formulários, contendo o sistema e subsistema construtivo, anomalias ou falhas com suas classificações, priorizações, localizações, descrição das não conformidades e a respectiva evidência fotográfica.'),
          par(''),

          h2('3.2.- Resultado da Vistoria.'),
          par('O resultado da vistoria, imagens dos formulários da coleta de dados, é apresentado no Anexo 2 deste documento e apresenta, fielmente, dados, informações e fotos coletadas durante a realização da vistoria.'),
          par(''),

          h2('3.3.- Resultado da Classificação da Edificação.'),
          par('O resultado da classificação da edificação quanto ao nível de inspeção, grau de risco, desempenho, manutenção e uso foi efetuada seguindo a metodologia apresentada para execução deste trabalho e apresentada a seguir.'),
          par(''),
          tab33,
          par('As Prioridades para aplicar as soluções de manutenção constam na relação apresentada no item 4. deste documento.'),
          par(''),

          // ── Seção 4 ─────────────────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),
          h1('4.- Relação de Não Conformidades e Análise das Manifestações Patológicas.'),
          h2('4.1.- Relação de Não Conformidades e Soluções.'),
          par('Neste item é apresentado, de forma clara e concisa, o conjunto de manifestações patológicas identificadas na vistoria, suas localizações e o número da foto no respectivo formulário de vistoria. Na tabela constam as prioridades para manutenção e soluções para retificação dos problemas de cada um dos sistemas construtivos ou instalações, visando mitigar os riscos e garantir a conformidade e eficiência da edificação, segundo normas técnicas vigentes.'),
          par('Salientamos, também, a importância do condomínio documentar as manutenções corretivas realizadas no pós inspeção, indicando a solução aplicada, local da ocorrência, período da realização da manutenção corretiva e o responsável pela execução do serviço, de modo a subsidiar análise e recomendações de correções futuras, atendendo o exigido na legislação local.'),
          par('A prioridade para manutenção de cada uma das não conformidades foi obtida pelo grau de risco (0 a 100), calculado com base nos parâmetros: : gravidade (40%); urgência (30%); abrangência (20%); e exposição (10%); da anomalia ou falha.'),
          par('Quanto a definição das prioridades foi adotado o critério: grau de risco superior a 64 pontos, prioridade ALTA; grau de risco menor que 65 pontos e maior que 34 pontos, prioridade MÉDIA; grau de risco inferior a 35 pontos, prioridade BAIXA.'),
          par(''),
          ...elems41,

          h2('4.2.- Análise Estatística das Manifestações Patológicas.'),
          par('A tabela que segue apresenta a estatística de ocorrências de manifestações patológicas por sistema construtivos e prioridades, onde se pode observar o comprometimento de cada um dos sistemas construtivos, possibilitando uma clara compreensão do estado da edificação e um adequado planejamento para execução das atividades de manutenções corretivas.'),
          par(''),
          tab42,
          par(''),

          // ── Seção 5 ─────────────────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),
          h1('5.- Recomendações sobre a Manutenção, Uso, Sustentabilidade e Gerais.'),
          par('No decorrer do processo de autovistoria foi efetuada a análise da documentação, a vistoria na edificação, a classificação da edificação e das anomalias e falhas identificadas, o que possibilitou uma completa avaliação dos sistemas construtivos da edificação.'),
          par('A seguir estão registradas as recomendações para a manutenção, o uso, a sustentabilidade e outras consideradas pertinentes para este trabalho.'),
          par(''),
          tab5,
          par(''),

          // ── Seção 6 ─────────────────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),
          h1('6.- Conclusão.'),
          par('Diante do exposto neste documento, e após analisados todos os fatos observados que interferem ou possam vir a interferir com o assunto objeto deste laudo, concluímos:'),
          li(`A vistoria proporcionou a constatação de que, considerando a idade da construção, o imóvel ${totT > 0 ? 'apresenta danos que requerem manutenção' : 'não apresenta nenhum dano aparente que represente ameaça à sua solidez, no que se refere ao aspecto estrutural e contenções'}.`),
          li(`Verificou-se a ${totT > 0 ? 'existência' : 'não existência'} de diversas anomalias como documentado neste laudo, ${totT > 0 ? 'as quais necessitam de intervenções corretivas a serem executadas segundo as prioridades definidas' : 'que possam comprometer a segurança da edificação'}.`),
          li('Com o intuito de melhor orientar futuras ações de manutenção e conservação do imóvel, recomendamos a execução de nova autovistoria no prazo máximo de 5 anos, para reavaliar e atuar preventivamente na situação construtiva da edificação.'),
          par(''),

          // ── Seção 7 ─────────────────────────────────────────────────────────
          h1('7.- Encerramento.'),
          h2('7.1. Anexos:'),
          li('Anexo 1 – Relação de documentos solicitados e analisados;'),
          li('Anexo 2 – Resultado da Vistoria;'),
          li('Anexo 3 – Anotações de responsabilidade dos profissionais que atuaram nesta inspeção.'),
          par(''),

          h2('7.2.- Declaração de conformidade com o Código de Ética.'),
          par('O signatário atesta que a presente autovistoria segue criteriosamente os seguintes princípios:'),
          li('Os itens deste trabalho foram revisados pessoalmente pelo responsável técnico que elaborou o Laudo Autovistoria;'),
          li('O responsável técnico não possui no presente, nem contempla para o futuro, interesse nos bens envolvidos neste trabalho;'),
          li('O responsável técnico não tem inclinações nem interesse em relação a finalidade deste trabalho, tão pouco em relação a solicitação;'),
          li('O trabalho encontra-se abrigado por absoluta confidencialidade, sendo garantido o sigilo perante terceiros quanto às razões que motivaram a presente contratação, bem como aos resultados alcançados;'),
          li('Este trabalho foi elaborado em observância estrita aos princípios dos Códigos de Ética Profissional do CONFEA-Conselho Federal de Engenharia, Arquitetura e Agronomia e do IBAPE - Instituto Brasileiro de Avaliações e Perícias de Engenharia.'),
          par(''),

          h2('7.3.- Termo de encerramento:'),
          par('O responsável técnico pela execução deste trabalho coloca-se ao inteiro dispor para esclarecimentos adicionais, caso necessários.'),
          par('O documento é entregue em mídia magnética.'),
          par('Atenção: O titular do direito autoral deste trabalho somente autoriza sua reprodução nos casos legais cabíveis, vedando sua cópia ou qualquer forma de reprodução que caracterize plágio ou represente utilização dos direitos exclusivos do autor, sendo que sua violação acarretará as penalidades civis e criminais previstas no art.184 do Código Penal Brasileiro e Lei nº 9.610.'),
          par(''),
          par(`${X(estab?.cidade)}/${X(estab?.uf)}, ${dataHoje}.`),
          par(''),
          par(''),
          par(''),
          par('___________________________________'),
          par(`${X(inspetor?.nome_inspetor)} – Responsável Técnico`, { bold: true }),
          par(`${X(inspetor?.titulo_profissional)} – CREA/CAU - ${X(inspetor?.inscricao_crea_cau)}`),
          ...(inspetor?.especializacao ? [par(X(inspetor.especializacao))] : []),
          par(''),

          // ── Anexo 1 ─────────────────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),
          h1('Anexo 1 – Relação de Documentos Solicitados e Avaliados'),
          par(''),
          tabA1,
          par(''),

          // ── Anexo 2 ─────────────────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),
          h1('Anexo 2 – Resultado da Vistoria'),
          par(''),
          ...(elemsA2.length > 0 ? elemsA2 : [par('[Nenhuma vistoria homologada encontrada para este serviço.]', { italic: true })]),

          // ── Anexo 3 ─────────────────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),
          h1('Anexo 3 – Anotações de responsabilidade dos profissionais que atuaram nesta inspeção.'),
          par(''),
          ...(imgArt
            ? [new Paragraph({ children: [new ImageRun({ data: imgArt.buf, transformation: { width: 500, height: 650 }, type: imgArt.ext })], alignment: AlignmentType.CENTER })]
            : [par('[Inserir ART/RRT do responsável técnico]', { italic: true })]),
          par('-.-.-.-.-', { align: AlignmentType.CENTER }),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    return new NextResponse(buffer, {
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

// src/app/api/gerar-laudo-docx/route.ts
// AIMÊ — Gera DOCX profissional do laudo diretamente via pacote docx
// Evita o bug do html-to-docx (@w Invalid XML name)

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
} from 'docx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SISTEMAS: Record<string, string[]> = {
  '41': ['01_Sistema Estrutural','02_Fachadas, Empenas e Marquises','03_Cobertura e Telhados','04_Instalações Hidrossanitárias','05_Instalações Elétricas e SPDA','06_Instalações de Gás','07_Sistema de Prevenção e Combate a Incêndio','08_Elevadores e Equipamentos Eletromecânicos','09_Impermeabilização','10_Acessibilidade','11_Contenção de Encostas e Arrimos','12_Áreas Comuns e Infraestrutura','13_Documentação e Conformidade Legal'],
  '42': ['01_Estrutura','02_Vedações Verticais','03_Cobertura','04_Revestimentos','05_Impermeabilização','06_Esquadrias','07_Instalações Hidrossanitárias','08_Instalações Elétricas','09_Instalações de Gás','10_Instalações Ar Condicionado / HVAC','11_Fachadas','12_Proteção e Combate a Incêndio','13_Acessibilidade','14_Áreas Comuns e Infraestrutura'],
  '43': ['01_Sistema Estrutural','02_Sistema de Pisos','03_Vedações Verticais','04_Sistema de Cobertura','05_Instalações Hidrossanitárias','06_Instalações Elétricas','07_Esquadrias e Vidros','08_Revestimentos e Acabamentos','09_Impermeabilização','10_Fachadas','11_Proteção Contra Incêndio','12_Acessibilidade'],
  '44': ['01_Revestimento Argamassado (SPFE)','02_Revestimento Cerâmico de Fachada (APFE)','03_Revestimento em Pastilhas','04_Fachada Ventilada','05_Pintura de Fachada (SBCE / Textura)','06_EIFS / Reboco Sintético','07_Esquadrias e Juntas de Fachada','08_Peitoris, Pingadeiras e Rufos','09_Impermeabilização de Fachada','10_Estrutura de Fachada e Vedação','11_Segurança Contra Incêndio em Fachadas','12_Manutenção e Equipamentos de Acesso'],
}

const TITULO: Record<string,string> = {
  '41':'Laudo de Autovistoria','42':'Laudo de Inspeção Predial',
  '43':'Laudo de Imóvel Novo','44':'Laudo de Inspeção de Fachada',
}

const DOCS_ANEXO1 = [
  'Auto de Conclusão da Edificação (HABITE-SE)',
  'Convenção do Condomínio',
  'Alvará de Funcionamento de Elevadores',
  'Relatório de Inspeção Anual dos Elevadores (RIA)',
  'Apólice de Seguro da edificação',
  'Auto de Vistoria do Corpo de Bombeiros (AVCB)',
  'Atestado do Sistema de Proteção a Descarga Atmosférica (SPDA)',
  'Avaliação da Rede de Distribuição Interna de Gás',
  'Contrato de Manutenção de Elevadores',
  'Certificado de Desratização e Desinsetização',
  'Relatório de Manutenção e Limpeza das Caixas de Água',
  'Certificado do reservatório de GLP',
  'Laudo de autovistoria anterior',
  'Projeto Arquitetônico Aprovado na Prefeitura',
  'Projetos Elétrico e Hidrossanitário Aprovados na Prefeitura',
  'Manual de Uso, Operação e Manutenção da Edificação',
  'Plano de Manutenção Preventiva da Edificação',
  'Atestado de Brigada de Incêndio (Imóveis não Residenciais)',
  'Alvará de Funcionamento (Imóveis não Residenciais)',
  'Licenças Ambientais (Imóveis não Residenciais)',
  'Outorga e Licença de Estação de Tratamento de Efluentes',
  'Outorga e Licença de Poço Profundo de Captação de Água',
]

function fmtDoc(v: string) {
  const n = (v||'').replace(/\D/g,'')
  if (n.length===14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
  if (n.length===11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
  return v
}

function fmtData() {
  const hoje = new Date()
  const M = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${hoje.getDate()} de ${M[hoje.getMonth()]} de ${hoje.getFullYear()}`
}

function pct(v: number, t: number) { return t ? Math.round(v*100/t)+'%' : '-' }

const X = (s: unknown) => String(s ?? '')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
            estab, inspetor, ncs, nomeArquivo, complemento } = body

    if (!cpfInspetor || !tipoServico)
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    // Imports já feitos no topo do arquivo
    const _ = { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, ShadingType, BorderStyle, PageBreak, Header, Footer, PageNumber, convertMillimetersToTwip, VerticalAlign }

    const titulo = TITULO[tipoServico] ?? 'Laudo Técnico'
    const sistemas = SISTEMAS[tipoServico] ?? []
    const dataHoje = fmtData()
    const cl = complemento?.classificacao ?? {}
    const nivel = complemento?.nivelInspecao || cl.nivel || ''

    const labelDoc = (cnpjoucpf||'').length===11 ? 'CPF' : 'CNPJ'
    const TW = 9638

    // Helpers locais
    function par(texto: string | any[], opts: any = {}) {
      const runs: any[] = []
      if (typeof texto === 'string') {
        runs.push(new TextRun({ text: texto, bold: opts.bold, italics: opts.italics, size: opts.size ?? 20, font: 'Arial' }))
      } else {
        ;(texto as any[]).forEach(r => runs.push(new TextRun({ font: 'Arial', size: 20, ...r })))
      }
      return new Paragraph({
        children: runs,
        alignment: opts.align ?? AlignmentType.JUSTIFIED,
        spacing: { before: opts.before ?? 120, after: opts.after ?? 120 },
        indent: opts.indent ? { left: opts.indent } : undefined,
        keepNext: opts.keepNext,
      })
    }

    function h(texto: string, nivel2 = 1) {
      const ind = [0, 0, 0, 720]
      return new Paragraph({
        children: [new TextRun({ text: texto, bold: true, size: 20, font: 'Arial' })],
        spacing: { before: nivel2 === 1 ? 280 : 200, after: 120 },
        indent: { left: ind[nivel2] ?? 0 },
        keepNext: true,
      })
    }

    // Gráfico de barras como tabela DOCX
    function tabelaBarras(stat: {s:string,a:number,m:number,b:number,t:number}[]): any[] {
      const itens = stat.filter(s => s.t > 0)
      if (itens.length === 0) return [par('Nenhuma ocorrência registrada.',{italics:true})]
      const max = Math.max(...itens.map(s => s.t), 1)
      const LABEL_W = 3000  // largura do label em DXA
      const BAR_TOTAL = TW - LABEL_W - 500  // largura total da barra

      const rows = [
        new TableRow({ children: [
          cel('Sistema Construtivo', { bg:'1E3A8A', bold:true, width:LABEL_W, color:'FFFFFF' }),
          cel('Ocorrências (proporcional)', { bg:'1E3A8A', bold:true, width:BAR_TOTAL, align:AlignmentType.CENTER, color:'FFFFFF' }),
          cel('Nº', { bg:'1E3A8A', bold:true, width:500, align:AlignmentType.CENTER, color:'FFFFFF' }),
        ]}),
        ...itens.map(({s, t}, i) => {
          const label = s.slice(3).replace(/_/g,' ')
          const filledW = Math.max(200, Math.round((t / max) * BAR_TOTAL))
          const emptyW  = Math.max(0, BAR_TOTAL - filledW)
          const bg = i % 2 === 0 ? 'FFFFFF' : 'F7F9FF'
          return new TableRow({ children: [
            cel(label, { width: LABEL_W, size:16 }),
            new TableCell({
              columnSpan: 1,
              children: [new Paragraph({
                children: [
                  new TextRun({ text: ' ', font:'Arial', size:18, highlight:'none' as any }),
                ],
                shading: { type: ShadingType.CLEAR, color:'auto', fill:'1E3A8A' } as any,
                spacing: { before: 60, after: 60 },
                indent: { left: 0, right: 0 },
              })],
              width: { size: filledW, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, color:'auto', fill:'1E3A8A' },
              margins: { top:0, bottom:0, left:0, right:0 },
            }),
            ...(emptyW > 0 ? [new TableCell({
              children: [new Paragraph({ children:[], spacing:{before:60,after:60} })],
              width: { size: emptyW, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, color:'auto', fill: bg },
              margins: { top:0, bottom:0, left:0, right:0 },
            })] : []),
            cel(String(t), { width:500, bold:true, align:AlignmentType.CENTER, color:'1E3A8A' }),
          ]})
        }),
      ]
      return [
        par('Nº de ocorrências por sistema construtivo', { bold:true }),
        new Table({ width:{ size:TW, type:WidthType.DXA }, rows }),
      ]
    }

    function tabelaPizza(totA: number, totM: number, totB: number): any[] {
      const tot = totA + totM + totB
      if (tot === 0) return [par('Nenhuma ocorrência registrada.',{italics:true})]
      const pA = Math.round(totA*100/tot)
      const pM = Math.round(totM*100/tot)
      const pB = 100 - pA - pM
      const BAR_MAX = 3600  // largura máxima da barra visual em DXA
      const mkBar = (val:number, total:number, cor:string) => {
        const w = Math.max(100, Math.round((val/total)*BAR_MAX))
        const e = Math.max(0, BAR_MAX - w)
        const cells: any[] = [
          new TableCell({ width:{size:w,type:WidthType.DXA},
            children:[new Paragraph({children:[],spacing:{before:100,after:100}})],
            shading:{type:ShadingType.CLEAR,color:'auto',fill:cor},
            margins:{top:0,bottom:0,left:0,right:0},
          }),
        ]
        if (e > 0) cells.push(new TableCell({ width:{size:e,type:WidthType.DXA},
          children:[new Paragraph({children:[],spacing:{before:100,after:100}})],
          shading:{type:ShadingType.CLEAR,color:'auto',fill:'F7F9FF'},
          margins:{top:0,bottom:0,left:0,right:0},
        }))
        return cells
      }
      const W_LBL = 1400, W_QTD = 500, W_PCT = 500
      return [
        par('Distribuição por Prioridade', { bold:true }),
        new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
          new TableRow({ children:[
            cel('Prioridade', {bg:'1E3A8A',bold:true,width:W_LBL,color:'FFFFFF'}),
            cel('Qtd',        {bg:'1E3A8A',bold:true,width:W_QTD,align:AlignmentType.CENTER,color:'FFFFFF'}),
            cel('%',          {bg:'1E3A8A',bold:true,width:W_PCT,align:AlignmentType.CENTER,color:'FFFFFF'}),
            cel('Proporção',  {bg:'1E3A8A',bold:true,width:BAR_MAX,align:AlignmentType.CENTER,color:'FFFFFF'}),
          ]}),
          // Alta
          new TableRow({ children:[
            cel('Alta (Imediata)', {width:W_LBL,bold:true,color:'991B1B'}),
            cel(String(totA), {width:W_QTD,bold:true,align:AlignmentType.CENTER}),
            cel(pA+'%', {width:W_PCT,align:AlignmentType.CENTER}),
            ...mkBar(totA, tot, 'DC2626'),
          ]}),
          // Média
          new TableRow({ children:[
            cel('Média (Curto Prazo)', {width:W_LBL,bold:true,color:'854D0E'}),
            cel(String(totM), {width:W_QTD,bold:true,align:AlignmentType.CENTER}),
            cel(pM+'%', {width:W_PCT,align:AlignmentType.CENTER}),
            ...mkBar(totM, tot, 'D97706'),
          ]}),
          // Baixa
          new TableRow({ children:[
            cel('Baixa (Longo Prazo)', {width:W_LBL,bold:true,color:'166534'}),
            cel(String(totB), {width:W_QTD,bold:true,align:AlignmentType.CENTER}),
            cel(pB+'%', {width:W_PCT,align:AlignmentType.CENTER}),
            ...mkBar(totB, tot, '16A34A'),
          ]}),
          // Total
          new TableRow({ children:[
            cel('Total', {bg:'EEF2FF',bold:true,width:W_LBL}),
            cel(String(tot), {bg:'EEF2FF',bold:true,width:W_QTD,align:AlignmentType.CENTER}),
            cel('100%', {bg:'EEF2FF',width:W_PCT,align:AlignmentType.CENTER}),
            cel('', {bg:'EEF2FF',width:BAR_MAX}),
          ]}),
        ]}),
      ]
    }


    function cel(texto: string, opts: any = {}) {
      const runs = Array.isArray(texto)
        ? (texto as any[]).map(r => new TextRun({ font: 'Arial', size: 18, ...r }))
        : [new TextRun({ text: X(texto), bold: opts.bold, size: 18, font: 'Arial', italics: opts.italics })]
      return new TableCell({
        children: [new Paragraph({ children: runs, alignment: opts.align ?? AlignmentType.LEFT, spacing: { before: 40, after: 40 } })],
        columnSpan: opts.span,
        rowSpan: opts.rowSpan,
        width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
        shading: opts.bg ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.bg } : undefined,
        verticalAlign: opts.vAlign ?? VerticalAlign.TOP,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
      })
    }

    // NCs por sistema
    // ── Buscar imagens do storage ────────────────────────────────────────────
    async function buscarImagemBase64(path: string): Promise<string> {
      if (!path) return ''
      try {
        const { data, error } = await supabase.storage.from('aime').download(path)
        if (error || !data) return ''
        const buf = Buffer.from(await data.arrayBuffer())
        const ext = path.split('.').pop()?.toLowerCase() ?? 'jpg'
        const mime = ext === 'png' ? 'image/png' : ext === 'pdf' ? 'application/pdf' : 'image/jpeg'
        return `data:${mime};base64,${buf.toString('base64')}`
      } catch { return '' }
    }

    const [imgCroqui, imgFoto, imgArt] = await Promise.all([
      buscarImagemBase64(complemento?.pathCroqui ?? ''),
      buscarImagemBase64(complemento?.pathFoto   ?? ''),
      buscarImagemBase64(complemento?.pathArt    ?? ''),
    ])

    // Buscar fotoBase64 de cada NC do storage (vistorias_homologadas)
    const ncsComFoto = await Promise.all((ncs ?? []).map(async (nc: any) => {
      if (nc.fotoBase64) return nc // já tem foto
      if (!nc._arquivo) return nc
      try {
        const pasta = 'vistorias_homologadas'
        const { data: blob } = await supabase.storage.from('aime')
          .download(`${pasta}/${nc._arquivo}`)
        if (!blob) return nc
        const html = await blob.text()
        const m = html.match(/<img[^>]+src="(data:image[^"]+)"/)
        return m ? { ...nc, fotoBase64: m[1] } : nc
      } catch { return nc }
    }))

    const ncsPorSistema: Record<string, any[]> = {}
    sistemas.forEach(s => ncsPorSistema[s] = [])
    ;(ncsComFoto ?? []).forEach((nc: any) => { if (ncsPorSistema[nc.sistema] !== undefined) ncsPorSistema[nc.sistema].push(nc) })

    const stat = sistemas.map(s => {
      const arr = ncsPorSistema[s]
      const a = arr.filter((n:any)=>n.prioridade==='Alta').length
      const m = arr.filter((n:any)=>n.prioridade==='Média').length
      const b = arr.filter((n:any)=>n.prioridade==='Baixa').length
      return { s, a, m, b, t: a+m+b }
    })

  // Descrições dos sistemas construtivos (base fixa conforme NBR 16.747)
  const DESC_SISTEMAS_41: Record<string,string> = {
    '01_Sistema Estrutural': 'Compreende os elementos de fundação, estrutura de concreto armado ou metálica, pilares, vigas e lajes, responsáveis pela sustentação e estabilidade da edificação.',
    '02_Fachadas, Empenas e Marquises': 'Inclui revestimentos externos, pintura de fachada, peitoris, pingadeiras, rufos, marquises e elementos ornamentais expostos ao intemperismo.',
    '03_Cobertura e Telhados': 'Composto por estrutura do telhado, telhas, calhas, rufos, impermeabilização da laje de cobertura e captação de águas pluviais.',
    '04_Instalações Hidrossanitárias': 'Abrange redes de água fria e quente, esgoto sanitário, drenagem pluvial, reservatórios, bombas e equipamentos hidráulicos.',
    '05_Instalações Elétricas e SPDA': 'Inclui quadros de distribuição, fiação, tomadas, iluminação, grupo gerador, SPDA e sistema de aterramento.',
    '06_Instalações de Gás': 'Compreende rede de distribuição de gás (GLP ou GN), central de gás, registros, medidores e ramais de consumo.',
    '07_Sistema de Prevenção e Combate a Incêndio': 'Inclui sprinklers, hidrantes, extintores, saídas de emergência, iluminação de emergência, alarme e sinalização de segurança.',
    '08_Elevadores e Equipamentos Eletromecânicos': 'Abrange elevadores, escadas rolantes, plataformas de acessibilidade, bombas, compressores e demais equipamentos eletromecânicos.',
    '09_Impermeabilização': 'Compreende sistemas de impermeabilização de coberturas, lajes, reservatórios, fundações, banheiros e áreas molhadas.',
    '10_Acessibilidade': 'Inclui rampas, corrimãos, pisos táteis, vagas para PCD, banheiros adaptados e demais elementos de acessibilidade conforme NBR 9050.',
    '11_Contenção de Encostas e Arrimos': 'Abrange muros de arrimo, taludes, cortinas de estacas, drenos e sistemas de contenção de solo.',
    '12_Áreas Comuns e Infraestrutura': 'Compreende hall, corredores, escadas, garagem, playground, salão de festas, guarita e demais áreas de uso coletivo.',
    '13_Documentação e Conformidade Legal': 'Inclui análise dos documentos técnicos e legais da edificação quanto à sua regularidade e conformidade normativa.',
  }
  const descSistema = (s: string) => DESC_SISTEMAS_41[s] || `Sistema construtivo: ${s.replace(/_/g,' ').slice(3)}`

    const totA = stat.reduce((x,s)=>x+s.a,0)
    const totM = stat.reduce((x,s)=>x+s.m,0)
    const totB = stat.reduce((x,s)=>x+s.b,0)
    const totT = totA+totM+totB

    // Tabela 1.1 Características
    const tab11 = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
      new TableRow({children:[cel('Características da Edificação',{bg:'1E3A8A',span:6,bold:true,align:AlignmentType.CENTER,color:'FFFFFF'})]}),
      new TableRow({children:[cel(X(labelDoc)+':',{width:1000}),cel(X(estab?.razao_social_nome),{span:2,width:3000}),cel(labelDoc+':',{width:800}),cel(fmtDoc(cnpjoucpf),{width:2200}),cel('CEP: '+X(estab?.cep),{width:1438}),]}),
      new TableRow({children:[cel('Endereço:',{width:1000}),cel(X(estab?.logradouro)+', '+X(estab?.numero)+' '+X(estab?.complemento),{span:3,width:5000}),cel('Bairro:',{width:800}),cel(X(estab?.bairro),{width:1638}),]}),
      new TableRow({children:[cel('Cidade e UF:',{width:1000}),cel(X(estab?.cidade)+'/'+X(estab?.uf),{width:2000}),cel('Responsável:',{width:1600}),cel(X(estab?.nome_responsavel),{span:2,width:3838}),]}),
      new TableRow({children:[cel('Tel:',{width:1000}),cel(X(estab?.whatsapp),{width:2000}),cel('e-Mail:',{width:1600}),cel(X(estab?.email),{span:2,width:3838}),]}),
      new TableRow({children:[cel('Uso:',{width:1000}),cel(X(estab?.uso_imovel),{width:1600}),cel('Tipo:',{width:800}),cel(X(estab?.tipo_imovel),{width:1400}),cel('Pav:',{width:600}),cel(X(estab?.numero_pavimentos),{width:638}),]}),
      new TableRow({children:[cel('Unidades:',{width:1000}),cel(X(estab?.numero_unidades_salas),{width:1600}),cel('Área construída:',{width:1400}),cel(X(estab?.area_construida)+' m²',{width:1200}),cel('Terreno:',{width:800}),cel(X(estab?.area_terreno)+' m²',{width:1038}),]}),
      new TableRow({children:[cel('Síntese da descrição da Edificação:',{bg:'EEF2FF',span:6,bold:true})]}),
      new TableRow({children:[cel(X(complemento?.sinteseEdif),{span:6})]}),
    ]})

    // Tabela 1.1 Localização
    // Células de imagem para localização
    function celImagem(imgBase64: string, placeholder: string, width: number) {
      // width está em DXA (1/1440 de polegada). Converter para pontos: 1pt = 20 DXA
      // Imagem ocupa 90% da célula, altura proporcional 130pt
      const imgWidthPt  = Math.round(width / 20 * 0.88)  // 88% da largura da célula em pt
      const imgHeightPt = 130
      if (imgBase64 && imgBase64.startsWith('data:image')) {
        const matches = imgBase64.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          const imgBuf = Buffer.from(matches[2], 'base64')
          const ext = matches[1].includes('png') ? 'png' as const : 'jpg' as const
          return new TableCell({
            width: { size: width, type: WidthType.DXA },
            children: [new Paragraph({
              children: [new ImageRun({ data: imgBuf, transformation: { width: imgWidthPt, height: imgHeightPt }, type: ext })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
            })],
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            verticalAlign: VerticalAlign.CENTER,
          })
        }
      }
      return new TableCell({
        width: { size: width, type: WidthType.DXA },
        children: [new Paragraph({
          children: [new TextRun({ text: placeholder, italics: true, size: 18, color: '9CA3AF', font: 'Arial' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        })],
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        verticalAlign: VerticalAlign.CENTER,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F8FAFC' },
      })
    }

    const tab11loc = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
      new TableRow({children:[cel('Localização do Estabelecimento',{bg:'1E3A8A',span:2,bold:true,align:AlignmentType.CENTER,color:'FFFFFF'})]}),
      new TableRow({ height:{value:2800,rule:'atLeast' as any}, children:[
        celImagem(imgCroqui, '[CROQUI MAPS — colar após baixar o documento]', Math.floor(TW/2)),
        celImagem(imgFoto,   '[FOTO DA FACHADA PRINCIPAL — inserir pelo responsável técnico]', TW-Math.floor(TW/2)),
      ]}),
    ]})

    // Tabela 1.3 Plano de trabalho
    const ATIVIDADES_PLANO = [
      ['2','1','Análise técnica inicial da edificação para conhecer as características e peculiaridades'],
      ['3','1','Entrevista Inicial para coletar dados históricos do prédio e documentação necessária'],
      ['3','3','Entrega documentos pelo síndico para o inspetor predial e análise'],
      ['6','5','Execução da vistoria com levantamento das anomalias e falhas nos sistemas construtivos'],
      ['34','6','Elaboração laudo efetuando análise, classificação, recomendações e soluções'],
      ['1','1','Entrega do Laudo de autovistoria ao Síndico'],
    ]
    const tab13 = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
      new TableRow({children:[cel('Agenda de Trabalho – Inspetor e Síndico',{bg:'1E3A8A',span:5,bold:true,align:AlignmentType.CENTER,color:'FFFFFF'})]}),
      new TableRow({children:[cel('Duração Prevista',{span:2,bg:'1E3A8A',align:AlignmentType.CENTER,bold:true,color:'FFFFFF'}),cel('Período',{span:2,bg:'1E3A8A',align:AlignmentType.CENTER,bold:true,color:'FFFFFF'}),cel('Atividades',{bg:'1E3A8A',align:AlignmentType.CENTER,color:'FFFFFF'})]}),
      new TableRow({children:[cel('Horas',{bg:'1E3A8A',width:800,align:AlignmentType.CENTER,color:'FFFFFF'}),cel('Dias Úteis',{bg:'1E3A8A',width:1000,align:AlignmentType.CENTER,color:'FFFFFF'}),cel('Dt Início',{bg:'1E3A8A',width:1200,align:AlignmentType.CENTER,color:'FFFFFF'}),cel('Dt Fim',{bg:'1E3A8A',width:1200,align:AlignmentType.CENTER,color:'FFFFFF'}),cel('Atividades',{bg:'1E3A8A',width:5438,align:AlignmentType.CENTER,color:'FFFFFF'})]}),
      ...ATIVIDADES_PLANO.map(([h,d,a]) => new TableRow({children:[cel(h,{width:800,align:AlignmentType.CENTER}),cel(d,{width:1000,align:AlignmentType.CENTER}),cel('',{width:1200}),cel('',{width:1200}),cel(a,{width:5438})]})),
    ]})

    // Tabela 3.1
    const tab31 = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
      new TableRow({children:[cel('Descrição da Realização da Vistoria',{bg:'1E3A8A',bold:true,align:AlignmentType.CENTER,color:'FFFFFF'})]}),
      new TableRow({height:{value:1500,rule:'atLeast' as any},children:[cel(X(complemento?.descVistoria||complemento?.dadosVistoria))]}),
          ]})

    // Tabela 3.3
    const tab33rows: any[] = [
      new TableRow({children:[cel('Resultado da Classificação da Edificação.',{bg:'1E3A8A',span:2,bold:true,align:AlignmentType.CENTER,color:'FFFFFF'})]}),
    ]
    const cl33 = tipoServico==='43' ? [
      ['a) A execução da obra em relação à CONFORMIDADE CONSTRUTIVA foi classificada como:', cl.nivel||''],
      ['b) A QUALIDADE DE ACABAMENTO do imóvel é classificada como:', cl.risco||''],
      ['c) A FUNCIONALIDADE do imóvel:', cl.desempenho||''],
      ['d) A HABITABILIDADE pode ser considerada:', cl.manut||''],
      ['e) A CLASSE DO IMÓVEL resulta em:', cl.uso||''],
      ['f) O GRAU DE SATISFAÇÃO NO RECEBIMENTO do imóvel:', cl.desempGeral||''],
    ] : tipoServico==='44' ? [
      ['a) Quanto ao ESTADO DE CONSERVAÇÃO da fachada pode ser classificado como:', cl.nivel||''],
      ['b) O histórico de MANUTENÇÃO da fachada é:', cl.risco||''],
      ['c) A AGRESSIVIDADE DO MEIO AMBIENTE sobre a fachada é:', cl.desempenho||''],
      ['d) O RISCO DE QUEDA DE ELEMENTOS da fachada é considerado:', cl.manut||''],
      ['e) O DESEMPENHO TÉCNICO DO SISTEMA da fachada:', cl.uso||''],
      ['f) A PRIORIDADE DE INTERVENÇÃO para manutenção:', cl.desempGeral||''],
    ] : [
      ['a) Quanto ao NÍVEL da inspeção efetuada o imóvel em questão foi classificado como INSPEÇÃO PREDIAL NÍVEL:', nivel],
      ['b) Quando ao GRAU DE RISCO o imóvel em questão encontra-se classificado como de RISCO:', cl.risco||''],
      ['c) Quanto ao DESEMPENHO a classificação geral do imóvel foi classificada como de DESEMPENHO:', cl.desempenho||''],
      ['d) Quanto a QUALIDADE DA MANUTENÇÃO a edificação foi classificada como QUALIDADE QUE:', cl.manut||''],
      ['e) Quanto as CONDIÇÕES DE USO a edificação foi classificada como EDIFICAÇÃO DE USO:', cl.uso||''],
      ['f) Quanto ao DESEMPENHO a edificação foi classificada como:', cl.desempGeral||''],
    ]
    cl33.forEach(([d,v]) => tab33rows.push(new TableRow({children:[cel(d,{width:Math.floor(TW*0.72)}),cel(v,{width:TW-Math.floor(TW*0.72),align:AlignmentType.CENTER,bold:true})]})))
    const tab33 = new Table({ width:{size:TW,type:WidthType.DXA}, rows:tab33rows })

    // Tabelas 4.1 por sistema
    const elems41: any[] = []
    for (const s of sistemas) {
      const arr = ncsPorSistema[s]
      if (!arr.length) continue
      const nomeS = s.slice(3).replace(/_/g,' ')
      const rec = complemento?.recsSistema?.[s] || ''
      elems41.push(new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
        new TableRow({children:[cel('Relação de Não Conformidades e Soluções por Sistema Construtivo',{span:6,bold:true,align:AlignmentType.CENTER,bg:'1E3A8A',color:'FFFFFF'})]}),
        new TableRow({children:[cel('Sistema construtivo ou instalação:',{span:6,bold:true,bg:'FFFFFF'})]}),
        new TableRow({children:[cel(nomeS,{span:6,bg:'FFFFFF'})]}),
        new TableRow({children:[cel('Descrição:',{span:6,bold:true,bg:'FFFFFF'})]}),
        new TableRow({children:[cel(descSistema(s),{span:6,bg:'FFFFFF'})]}),
        new TableRow({children:[cel('Recomendação para o sistema construtivo:',{span:6,bold:true,bg:'FFFFFF'})]}),
        new TableRow({children:[cel(rec||'[Gerado pela IA — revisar]',{span:6,bg:'FFFFFF',italics:!rec})]}),
        new TableRow({children:[
          cel('Foto',{bg:'1E3A8A',bold:true,align:AlignmentType.CENTER,width:500,color:'FFFFFF'}),
          cel('Não Conformidade',{bg:'1E3A8A',bold:true,width:2500,color:'FFFFFF'}),
          cel('Local ocorrência',{bg:'1E3A8A',bold:true,width:1500,color:'FFFFFF'}),
          cel('Grau Risco',{bg:'1E3A8A',bold:true,align:AlignmentType.CENTER,width:600,color:'FFFFFF'}),
          cel('Prioridade',{bg:'1E3A8A',bold:true,align:AlignmentType.CENTER,width:800,color:'FFFFFF'}),
          cel('Soluções',{bg:'1E3A8A',bold:true,width:3738,color:'FFFFFF'}),
        ]}),
        ...arr.map((nc:any) => new TableRow({children:[
          cel(X(nc.fotoNr),{align:AlignmentType.CENTER,width:600}),
          cel(X(nc.nc||nc.anomalia),{width:2200}),
          cel(X(nc.local)+(nc.complemento?' — '+X(nc.complemento):''),{width:1800}),
          cel(X(nc.grauRisco),{align:AlignmentType.CENTER,width:700}),
          cel(X(nc.prioridade),{align:AlignmentType.CENTER,width:900,bold:true}),
          cel(X(nc.solucaoNC||nc.cp||'—'),{width:3738}),
        ]})),
              ]}))
      elems41.push(par(''))
    }

    // Tabela 4.2
    const tab42 = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
      
      new TableRow({children:[cel('Estatística de Manifestações Patológicas por Sistema Construtivo',{span:9,bold:true,align:AlignmentType.CENTER,bg:'1E3A8A',color:'FFFFFF'})]}),
      new TableRow({children:[
        cel('Sistemas construtivos',{bg:'2a52a8',bold:true,rowSpan:2,width:3500,color:'FFFFFF'}),
        cel('Manifestações por Prioridades',{bg:'2a52a8',bold:true,span:6,align:AlignmentType.CENTER,width:5438,color:'FFFFFF'}),
        cel('Sub total',{bg:'2a52a8',bold:true,align:AlignmentType.CENTER,width:700,color:'FFFFFF'}),
      ]}),
      new TableRow({children:[
        cel('A',{bg:'2a52a8',bold:true,align:AlignmentType.CENTER,color:'FFFFFF',width:650}),
        cel('%',{bg:'2a52a8',bold:true,align:AlignmentType.CENTER,color:'FFFFFF',width:650}),
        cel('M',{bg:'2a52a8',bold:true,align:AlignmentType.CENTER,color:'FFFFFF',width:650}),
        cel('%',{bg:'2a52a8',bold:true,align:AlignmentType.CENTER,color:'FFFFFF',width:650}),
        cel('B',{bg:'2a52a8',bold:true,align:AlignmentType.CENTER,color:'FFFFFF',width:650}),
        cel('%',{bg:'2a52a8',bold:true,align:AlignmentType.CENTER,color:'FFFFFF',width:788}),
        cel('',{bg:'2a52a8',bold:true,align:AlignmentType.CENTER,width:700,color:'FFFFFF'}),
      ]}),
      ...stat.map(({s,a,m,b,t}) => new TableRow({children:[
        cel(s.replace(/_/g,' '),{bg:'FFFFFF',width:3500}),
        cel(String(a||'-'),{align:AlignmentType.CENTER,width:650}),
        cel(a?pct(a,t):'-',{align:AlignmentType.CENTER,width:650}),
        cel(String(m||'-'),{align:AlignmentType.CENTER,width:650}),
        cel(m?pct(m,t):'-',{align:AlignmentType.CENTER,width:650}),
        cel(String(b||'-'),{align:AlignmentType.CENTER,width:650}),
        cel(b?pct(b,t):'-',{align:AlignmentType.CENTER,width:788}),
        cel(String(t||'-'),{align:AlignmentType.CENTER,bold:true,width:700}),
      ]})),
      new TableRow({children:[
        cel('Total de ocorrências',{bold:true,width:3500}),
        cel(String(totA),{align:AlignmentType.CENTER,bold:true,width:650}),
        cel(pct(totA,totT),{align:AlignmentType.CENTER,bold:true,width:650}),
        cel(String(totM),{align:AlignmentType.CENTER,bold:true,width:650}),
        cel(pct(totM,totT),{align:AlignmentType.CENTER,bold:true,width:650}),
        cel(String(totB),{align:AlignmentType.CENTER,bold:true,width:650}),
        cel(pct(totB,totT),{align:AlignmentType.CENTER,bold:true,width:788}),
        cel(String(totT),{align:AlignmentType.CENTER,bold:true,width:700}),
      ]}),
      new TableRow({children:[cel('A = Alta; M = Média; B = Baixa',{span:9,italics:true})]}),
      
    ]})

    // Tabela 5
    const tab5 = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
      new TableRow({children:[cel('5.1.- Avaliação e recomendações da manutenção.',{span:3,bold:true})]}),
      new TableRow({children:[cel('',{width:500}),cel(X(complemento?.rec51)||'[A ser preenchido pelo responsável técnico]',{span:2,italics:!complemento?.rec51})]}),
      new TableRow({children:[cel('',{span:3})]}),
      new TableRow({children:[cel('5.2.- Avaliação e recomendações do uso da edificação.',{span:3,bold:true})]}),
      new TableRow({children:[cel('',{width:500}),cel(X(complemento?.rec52)||'[A ser preenchido]',{span:2,italics:!complemento?.rec52})]}),
      new TableRow({children:[cel('',{span:3})]}),
      new TableRow({children:[cel('5.3.- Avaliação e recomendações da sustentabilidade.',{span:3,bold:true})]}),
      new TableRow({children:[cel('',{width:500}),cel(X(complemento?.rec53)||'[A ser preenchido]',{span:2,italics:!complemento?.rec53})]}),
      new TableRow({children:[cel('',{span:3})]}),
      new TableRow({children:[cel('5.4.- Outras avaliações e recomendações.',{span:3,bold:true})]}),
      new TableRow({children:[cel('',{width:500}),cel(X(complemento?.rec54)||'[A ser preenchido]',{span:2,italics:!complemento?.rec54})]}),
    ]})

    // Tabela Anexo 1
    const tabA1 = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
      new TableRow({children:[cel('Documentação da Edificação Solicitada para Análise e Avaliação',{span:3,bold:true,align:AlignmentType.CENTER})]}),
      new TableRow({children:[cel('Documentos',{bg:'1E3A8A',bold:true,width:Math.floor(TW*0.6),color:'FFFFFF'}),cel('Situação',{bg:'1E3A8A',bold:true,align:AlignmentType.CENTER,width:Math.floor(TW*0.2),color:'FFFFFF'}),cel('Resultado',{bg:'1E3A8A',bold:true,width:TW-Math.floor(TW*0.8),color:'FFFFFF'})]}),
      ...DOCS_ANEXO1.map(d => new TableRow({children:[cel(d,{width:Math.floor(TW*0.6)}),cel('',{align:AlignmentType.CENTER,width:Math.floor(TW*0.2)}),cel('',{width:TW-Math.floor(TW*0.8)})]})),
      new TableRow({children:[cel('Situação: Entregue; Pendente; Desnecessário — Resultado: Conforme; Não conforme; Não se aplica',{span:3,italics:true})]}),
          ]})

    // Cabeçalho/Rodapé
    const cabTexto = X(inspetor?.cabecalho_documentos) || titulo
    const rodTexto = X(inspetor?.rodape_documentos) || `${X(inspetor?.nome_inspetor)} — ${X(inspetor?.titulo_profissional)} — CREA/CAU ${X(inspetor?.inscricao_crea_cau)}`

    // Gerar documento
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Arial', size: 20 },
            paragraph: { spacing: { after: 60 } }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(25),
              right: convertMillimetersToTwip(20),
            }
          }
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              children: [new TextRun({ text: cabTexto, size: 18, font: 'Arial' })],
              alignment: AlignmentType.CENTER,
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E3A8A' } },
            })]
          })
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              children: [
                new TextRun({ text: rodTexto + '  —  Página ', size: 16, font: 'Arial' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial' }),
                new TextRun({ text: ' de ', size: 16, font: 'Arial' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Arial' }),
              ],
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' } },
            })]
          })
        },
        children: [
          // CAPA
          par(X(estab?.cidade)+'/'+X(estab?.uf)+' — '+dataHoje,{align:AlignmentType.RIGHT,size:18}),
          par(''), par(''),
          par(titulo.toUpperCase(),{bold:true,align:AlignmentType.CENTER,size:28}),
          par(''),
          par(X(estab?.razao_social_nome),{bold:true,align:AlignmentType.CENTER,size:24}),
          par(X(estab?.cidade)+'/'+X(estab?.uf),{align:AlignmentType.CENTER,size:20}),
          par(''), par(''),
          par(X(inspetor?.nome_inspetor),{align:AlignmentType.CENTER}),
          par(X(inspetor?.titulo_profissional)+' — CREA/CAU '+X(inspetor?.inscricao_crea_cau),{align:AlignmentType.CENTER}),
          par(''),
          // ÍNDICE
          new Paragraph({children:[new PageBreak()]}),
          h('ÍNDICE',1),
          ...['1.- Considerações Preliminares','     1.1.- Características e localização da edificação','     1.2.- Objetivo','     1.3.- Plano de Trabalho','     1.4.- Condições e limitações','2.- Metodologia adotada para o Trabalho de Autovistoria','3.- Resultado da Vistoria Técnica e Classificação da Edificação','     3.1.- Descrição da Vistoria Técnica','     3.2.- Resultado da Vistoria','     3.3.- Resultado da Classificação da Edificação','4.- Relação de Não Conformidades e Análise das Manifestações Patológicas','     4.1.- Relação de Não Conformidades e Soluções','     4.2.- Análise Estatística das Manifestações Patológicas','5.- Recomendações sobre a Manutenção, Uso, Sustentabilidade e Gerais','6.- Conclusão','7.- Encerramento','Anexo 1 – Relação de documentos solicitados e analisados','Anexo 2 – Resultado da Vistoria','Anexo 3 – Anotações de responsabilidade dos profissionais que atuaram nesta inspeção'].map(t => par(t,{before:40,after:20})),
          par(''),
          // 1. CONSIDERAÇÕES
          new Paragraph({children:[new PageBreak()]}),
          h('1.- Considerações Preliminares.'),
          par('Este Laudo de Autovistoria é o documento completo resultante do trabalho executado na vistoria da edificação, análise, classificação e priorização das manifestações patológicas, conforme exigências da ABNT/NBR 16.747/2020, recomendações da Norma de Inspeção Predial do IBAPE de 2025 e legislação vigente.'),
          par('A inspeção apresentada neste laudo é o resultado de um exame "clínico geral" que avalia as condições globais do objeto em estudo e detecta a existência de problemas de conservação ou funcionamento, com base em uma análise fundamentalmente sensorial e efetuada por um profissional habilitado.'),
          par('A documentação da edificação solicitada pelo inspetor na reunião inicial foi analisada e avaliada, e o resultado fica registrado na planilha apresentada no Anexo 1 deste laudo.'),
          par(''),
          h('1.1.- Características e localização da edificação.',2),
          tab11, par(''), tab11loc, par(''),
          h('1.2.- Objetivo.',2),
          par('Avaliar as condições de segurança, funcionalidade, habitabilidade e manutenção da edificação, de acordo com os critérios da ABNT NBR 16.747/2020, normas correlatas, legislação vigente e metodologia apresentada neste documento.'),
          par(''),
          h('1.3.- Plano de Trabalho.',2),
          par('As etapas básicas desenvolvidas para a realização do presente trabalho de Inspeção Predial constam na tabela que segue:'),
          tab13, par(''),
          h('1.4.- Condições e limitações.',2),
          par('O Laudo de Autovistoria segue as condições abaixo relacionadas, além de estar sujeito às seguintes limitações:'),
          par('Neste trabalho computamos como corretos os elementos documentais consultados e as informações prestadas por terceiros, de boa fé e confiáveis;',{indent:720}),
          par('O trabalho apresentado e o resultado final são válidos apenas para a sequência metodológica apresentada, sendo vedada a utilização deste laudo em conexão com qualquer outro trabalho, exceto como referência para contratação dos serviços de manutenção;',{indent:720}),
          par('O responsável técnico não assume responsabilidade sobre matéria alheia ao exercício profissional, estabelecido em leis, códigos e regulamentos.',{indent:720}),
          par(''),
          // 2. METODOLOGIA
          new Paragraph({children:[new PageBreak()]}),
          h('2.- Metodologia adotada para o Trabalho de Autovistoria.'),
          par('A metodologia adotada para este trabalho segue as normas da ABNT, IBAPE e legislação estadual e municipal que regulamentam a autovistoria.'),
          par(''),
          h('2.1.- Norma Brasileira para Inspeção Predial — NBR-16.747/2020.',2),
          par('A metodologia básica para execução do presente trabalho foi pautada nos requisitos constantes da NBR-16.747/2020 (Inspeção Predial — Diretrizes, Conceitos, Terminologia e Procedimentos) da Associação Brasileira de Normas Técnicas — ABNT.'),
          par([{text:'"Abrangências da análise',bold:true,italics:true}]),
          par('A inspeção predial baseia-se na constatação e análise do estado aparente de desempenho dos sistemas construtivos na fase de uso, operação e manutenção, considerando os requisitos dos usuários.',{italics:true}),
          par('A análise consiste na constatação da situação da edificação quanto à sua capacidade de atender às suas funções segundo os requisitos dos usuários, com base na análise fundamentalmente sensorial e efetuada por um profissional habilitado."',{italics:true}),
          par(''),
          h('2.2.- Norma de Inspeção Predial do IBAPE/2025.',2),
          par('A Norma de Inspeção Predial do IBAPE fixa diretrizes, conceitos, terminologias, critérios e procedimentos relativos à atividade de Inspeção Predial, abrangendo os requisitos mínimos de:'),
          par('Segurança: segurança estrutural; segurança contra incêndio; segurança no uso e na operação;',{indent:720,italics:true}),
          par('Habitabilidade: estanqueidade; saúde, higiene e qualidade do ar; funcionalidade e acessibilidade;',{indent:720,italics:true}),
          par('Sustentabilidade: durabilidade e manutenibilidade.',{indent:720,italics:true}),
          par('A norma se aplica a todas as tipologias de edificações, sendo elas públicas ou privadas, devendo ser observadas as características técnicas e complexidades dos sistemas construtivos.'),
          par([{text:'As normas ABNT apresentadas a seguir são referências auxiliares e complementares à aplicação da norma IBAPE: ',italics:true},{text:'NBR 16747: Inspeção Predial; NBR 5674: Manutenção de Edificações; NBR 15575: Desempenho; NBR 14037: Manual de Operação, Uso e Manutenção; NBR 16280: Reforma em Edificações.',italics:true}]),
          par(''),
          h('2.3.- Critérios e Metodologia da Inspeção.',2),
          h('2.3.1.- Critérios.',3),
          par('O critério utilizado para elaboração de laudos baseia-se na análise do risco oferecido aos usuários, ao meio ambiente e ao patrimônio, diante as condições observadas nos sistemas construtivos durante a vistoria.'),
          par('A análise do risco consiste na classificação das anomalias e falhas identificadas nos diversos sistemas construtivos e instalações de uma edificação, levando em consideração: a Gravidade, a Urgência e a Tendência de evolução, usando a metodologia GUT adaptado.'),
          par(''),
          h('2.3.2.- Método.',3),
          par('O método empregado consiste em: determinar o nível da inspeção predial (NBR 16.747); verificar e analisar a documentação; obter informações com responsáveis pela edificação; vistoriar os sistemas construtivos e instalações; classificar e priorizar as manifestações patológicas; e elaborar o laudo técnico.'),
          par('O planejamento da vistoria inclui uma entrevista com o responsável pela edificação, abordando características técnicas e aspectos cotidianos da manutenção do prédio, de forma a antecipar as dificuldades do trabalho.'),
          par(''),
          h('2.3.3.- Classificação das Inspeções Prediais (NBR 16.747) e Edificações.',3),
          par('A classificação das inspeções prediais e edificações devem ser efetuadas segundo critérios definidos em normas técnicas, conforme segue:'),
          par([{text:'Quanto ao NÍVEL'},{text:' de inspeção predial as edificações são classificadas quanto a sua complexidade e elaboração de laudo:'}]),
          par([{text:'NÍVEL 1:',bold:true},{text:' Edificações mais simples, sem necessidade de equipe multidisciplinar, necessário somente um profissional: Engenheiro Civil ou Arquiteto;'}],{indent:720}),
          par([{text:'NÍVEL 2:',bold:true},{text:' Edifícios multifamiliares ou comerciais sem sistemas construtivos mais complexos como climatização, automação, etc, somente com elevadores. Requer Engenheiro Civil ou Arquiteto e Engenheiro Elétrico;'}],{indent:720}),
          par([{text:'NÍVEL 3:',bold:true},{text:' Edificações complexas onde há sistemas implantados com manutenção regulamentada pela NBR 5674 da ABNT. Requer equipe multidisciplinar composta por Engenheiro Civil ou Arquiteto, Engenheiro Elétrico e Engenheiro Mecânico.'}],{indent:720}),
          par([{text:'Quanto ao RISCO',bold:true},{text:' as edificações são classificadas considerando o risco oferecido aos usuários, ao meio ambiente e ao patrimônio:'}]),
          par([{text:'CRÍTICO:',bold:true},{text:' Relativo ao risco que pode provocar danos contra a saúde e segurança das pessoas e/ou meio ambiente, perda excessiva de desempenho causando possível interdição. Recomenda-se intervenção imediata;'}],{indent:720}),
          par([{text:'REGULAR:',bold:true},{text:' Relativo ao risco que pode provocar a perda de funcionalidade sem prejuízo à operação direta de sistemas, perda pontual de desempenho. Recomenda-se intervenção a curto prazo;'}],{indent:720}),
          par([{text:'MÍNIMO:',bold:true},{text:' Relativo a pequenos prejuízos à estética ou atividade programável e planejada. Recomenda-se programar intervenção a médio prazo.'}],{indent:720}),
          par('As Prioridades para efetuar as manutenções das não conformidades são apuradas por metodologias técnicas como a GUT adaptado (Gravidade, Urgência e Tendência):'),
          par([{text:'Prioridade 1 (Alta):',bold:true},{text:' ações necessárias de imediato — prazo inferior a 8 meses;'}],{indent:630}),
          par([{text:'Prioridade 2 (Média):',bold:true},{text:' ações corretivas a médio prazo — prazo inferior a 15 meses;'}],{indent:630}),
          par([{text:'Prioridade 3 (Baixa):',bold:true},{text:' ações planejadas a longo prazo — prazo não superior a 30 meses.'}],{indent:630}),
          par(''),
          h('2.3.4.- Critérios para avaliação da manutenção, uso da edificação e do desempenho.',3),
          par('As recomendações quanto a manutenção, uso da edificação e sustentabilidade serão efetuadas segundo os critérios que seguem.'),
          par([{text:'Quanto a MANUTENÇÃO',bold:true},{text:' da edificação será avaliada a coerência entre o plano de manutenção apresentado e o recomendado, classificando como: Totalmente atende; Parcialmente atende; Não atende.'}]),
          par([{text:'Quanto as CONDIÇÕES DE USO',bold:true},{text:' a análise de cada um dos sistemas construtivos será efetuada em relação ao tipo de uso previsto em projeto:'}]),
          par([{text:'USO REGULAR',bold:true},{text:' é aquele onde a edificação é ocupada e utilizada dentro dos parâmetros previstos no projeto;'}],{indent:720}),
          par([{text:'USO IRREGULAR',bold:true},{text:' quando a edificação se encontra ocupada e utilizada de forma irregular, com o uso divergente do previsto no projeto.'}],{indent:720}),
          par([{text:'Quanto a DESEMPENHO',bold:true},{text:' a edificação é classificada por níveis:'}]),
          par([{text:'BOM,',bold:true},{text:' anomalias inexistentes ou leves, sem impacto relevante no desempenho;'}],{indent:720}),
          par([{text:'REGULAR,',bold:true},{text:' anomalias leves a moderadas, com impactos pontuais. Exige manutenções corretivas programáveis;'}],{indent:720}),
          par([{text:'RUIM,',bold:true},{text:' anomalias significativas, com prejuízo ao desempenho, durabilidade ou segurança. Requer intervenções corretivas prioritárias;'}],{indent:720}),
          par([{text:'CRÍTICO,',bold:true},{text:' anomalias graves, com risco à segurança, à saúde ou à funcionalidade. Demanda intervenção imediata.'}],{indent:720}),
          par(''),
          // 3. RESULTADO
          new Paragraph({children:[new PageBreak()]}),
          h('3.- Resultado da Vistoria Técnica e Classificação da Edificação.'),
          par(''),
          h('3.1.- Descrição da Vistoria Técnica.',2),
          tab31, par(''),
          par('Os sistemas construtivos e instalações vistoriadas, com as condições observadas e as respectivas recomendações são apresentadas nos Relatórios de Não Conformidades, item 4 deste documento.'),
          par('O resultado da vistoria é apresentado por sistema construtivo ou instalação, num conjunto de formulários, contendo o sistema e subsistema construtivo, localização da anomalia, o grau de risco e a prioridade para manutenção.'),
          par(''),
          h('3.2.- Resultado da Vistoria.',2),
          par('O resultado da vistoria, imagens dos formulários da coleta de dados, é apresentado no Anexo 2 deste documento e apresenta, fielmente, dados, informações e fotos coletadas durante a realização da vistoria.'),
          par(''),
          h('3.3.- Resultado da Classificação da Edificação.',2),
          par('O resultado da classificação da edificação quanto ao nível de inspeção, grau de risco, desempenho, manutenção e uso foi efetuada seguindo a metodologia apresentada para execução deste trabalho.'),
          tab33,
          par([{text:'As Prioridades para aplicar as soluções de manutenção constam na relação apresentada no '},{text:'item 4.',bold:true},{text:' deste documento.'}]),
          par(''),
          // 4. NÃO CONFORMIDADES
          new Paragraph({children:[new PageBreak()]}),
          h('4.- Relação de Não Conformidades e Análise das Manifestações Patológicas.'),
          par(''),
          h('4.1.- Relação de Não Conformidades e Soluções.',2),
          par('Neste item é apresentado, de forma clara e concisa, o conjunto de manifestações patológicas identificadas na vistoria, suas localizações e o número da foto no respectivo formulário de vistoria.'),
          par('Salientamos, também, a importância do condomínio documentar as manutenções corretivas realizadas no pós inspeção, indicando a solução aplicada, local, data e responsável técnico pela execução.'),
          par('A prioridade para manutenção de cada uma das não conformidades foi obtida pelo grau de risco (0 a 100), calculado com base nos parâmetros: gravidade, urgência, tendência e exposição ao risco.'),
          par('Quanto a definição das prioridades foi adotado o critério: grau de risco superior a 64 pontos, prioridade ALTA; grau de risco menor que 65 pontos e maior que 34 pontos, prioridade MÉDIA; grau de risco menor que 35 pontos, prioridade BAIXA.'),
          par(''),
          ...elems41,
          h('4.2.- Análise Estatística das Manifestações Patológicas.',2),
          par('A tabela que segue apresenta a estatística de ocorrências de manifestações patológicas por sistema construtivos e prioridades, onde se pode observar a distribuição das mesmas pelos sistemas.'),
          tab42,
          par(''),
          ...tabelaBarras(stat),
          par(''),
          ...tabelaPizza(totA, totM, totB),
          par(''),
          // 5. RECOMENDAÇÕES
          new Paragraph({children:[new PageBreak()]}),
          h('5.- Recomendações sobre a Manutenção, Uso, Sustentabilidade e Gerais.'),
          par('No decorrer do processo de autovistoria foi efetuada a análise da documentação, a vistoria na edificação, a classificação da edificação e das anomalias e falhas identificadas, o que possibilitou uma completa avaliação dos sistemas construtivos da edificação.'),
          par('A seguir estão registradas as recomendações para a manutenção, o uso, a sustentabilidade e outras consideradas pertinentes para este trabalho.'),
          par(''),
          tab5,
          par(''),
          // 6. CONCLUSÃO
          new Paragraph({children:[new PageBreak()]}),
          h('6.- Conclusão.'),
          par('\t\tDiante do exposto neste documento, e após analisados todos os fatos observados que interferem ou possam vir a interferir com o assunto objeto deste laudo, concluímos:'),
          par(`A vistoria proporcionou a constatação de que, considerando a idade da construção, o imóvel ${totA>0?'apresenta anomalias que requerem intervenção imediata':'não apresenta nenhum dano aparente que represente ameaça à sua solidez, no que se refere ao aspecto estrutural e contenções'}.`),
          par(`Verificou-se a ${totT>0?'existência':'não existência'} de ${totT>0?`${totT} manifestações patológicas distribuídas nos sistemas construtivos vistoriados, sendo ${totA} de prioridade Alta, ${totM} de prioridade Média e ${totB} de prioridade Baixa, as quais necessitam de intervenções corretivas a serem executadas segundo as prioridades definidas`:'danos que possam comprometer a segurança da edificação'}.`),
          par('Com o intuito de melhor orientar futuras ações de manutenção e conservação do imóvel, recomendamos a execução de nova autovistoria no prazo máximo de 5 anos, para reavaliar e atuar preventivamente na situação construtiva da edificação.'),
          par(''),
          par([{text:'Atenção: ',bold:true,size:16},{text:'O titular do direito autoral deste trabalho somente autoriza sua reprodução nos casos legais cabíveis, vedando sua cópia ou qualquer forma de reprodução que caracterize plágio.',italics:true,size:16}]),
          par(''),
          // 7. ENCERRAMENTO
          h('7.- Encerramento.'),
          h('7.1. Anexos:',2),
          par('Anexo 1 – Relação de documentos solicitados e analisados;',{indent:450}),
          par('Anexo 2 – Resultado da Vistoria;',{indent:450}),
          par('Anexo 3 – Anotações de responsabilidade dos profissionais que atuaram nesta inspeção.',{indent:450}),
          par(''),
          h('7.2.- Declaração de conformidade com o Código de Ética.',2),
          par('\t\tO signatário atesta que a presente autovistoria segue criteriosamente os seguintes princípios:'),
          par('Os itens deste trabalho foram revisados pessoalmente pelo responsável técnico que elaborou o Laudo Autovistoria;',{indent:450}),
          par('O responsável técnico não possui no presente, nem contempla para o futuro, interesse nos bens envolvidos neste trabalho;',{indent:450}),
          par('O trabalho encontra-se abrigado por absoluta confidencialidade, sendo garantido o sigilo perante terceiros quanto às razões que motivaram a presente contratação, bem como aos resultados alcançados;',{indent:450}),
          par('Este trabalho foi elaborado em observância estrita aos princípios dos Códigos de Ética Profissional do CONFEA e do IBAPE.',{indent:450}),
          par(''),
          h('7.3.- Termo de encerramento:',2),
          par('\t\tO responsável técnico pela execução deste trabalho coloca-se ao inteiro dispor para esclarecimentos adicionais, caso necessários.'),
          par('O documento é entregue em mídia magnética.'),
          par(''),
          par(X(estab?.cidade)+'/'+X(estab?.uf)+', '+dataHoje,{align:AlignmentType.CENTER}),
          par(''), par(''),
          par('                                    <assinatura digital>',{align:AlignmentType.CENTER,size:16}),
          par('___________________________________',{align:AlignmentType.CENTER}),
          par(`  ${X(inspetor?.nome_inspetor)} – Responsável Técnico`,{align:AlignmentType.CENTER}),
          par(` ${X(inspetor?.titulo_profissional)} – CREA/CAU - ${X(inspetor?.inscricao_crea_cau)}`,{align:AlignmentType.CENTER}),
          ...(inspetor?.especializacao ? [par(X(inspetor.especializacao),{align:AlignmentType.CENTER})] : []),
          par('-.-.-.-.-',{align:AlignmentType.CENTER}),
          par(''),
          // ANEXO 1
          new Paragraph({children:[new PageBreak()]}),
          par(' Anexo 1 – Relação de Documentos Solicitados e Avaliados',{bold:true}),
          par(''),
          tabA1,
          par(''),
          // ANEXO 2 — layout idêntico ao Formulario_autovistoria_A4_Forms.html
          new Paragraph({children:[new PageBreak()]}),
          par('Anexo 2 – Resultado da Vistoria',{bold:true}),
          par(''),
          ...((ncsComFoto ?? []).length === 0
            ? [par('[Nenhuma vistoria homologada encontrada para este serviço.]',{italics:true})]
            : (ncsComFoto ?? []).flatMap((nc: any, idx: number) => {

                const nomeS  = X(nc.sistema).slice(3).replace(/_/g,' ')
                const grNum  = Number(nc.grauRisco)
                // Cores por prioridade (igual ao formulário HTML)
                const corGR   = grNum >= 64 ? 'E24B4A' : grNum >= 35 ? 'E8A000' : '1A7A3C'
                const bgBadge = grNum >= 64 ? 'FCEBEB' : grNum >= 35 ? 'FFF0C2' : 'E6F5EE'
                const fgBadge = grNum >= 64 ? 'CC0000' : grNum >= 35 ? '8A5C00' : '1A7A3C'
                const priSim  = grNum >= 64 ? '▲ Alta' : grNum >= 35 ? '● Média' : '▼ Baixa'

                // ── Helpers ─────────────────────────────────────────────────
                // block-title: fundo #185FA5, texto branco, uppercase bold
                function blockTitle(txt: string): TableRow {
                  return new TableRow({children:[new TableCell({
                    width:{size:TW,type:WidthType.DXA},
                    children:[new Paragraph({
                      children:[new TextRun({text:txt.toUpperCase(),bold:true,size:14,color:'FFFFFF',font:'Arial'})],
                      spacing:{before:40,after:40},indent:{left:80},
                    })],
                    shading:{type:ShadingType.CLEAR,color:'auto',fill:'185FA5'},
                    margins:{top:0,bottom:0,left:0,right:0},
                    columnSpan:10,
                  })]})
                }

                // campo: label uppercase cinza acima, valor em caixa com borda #B5D4F4
                function campo(label: string, valor: string, w: number): TableCell {
                  return new TableCell({
                    width:{size:w,type:WidthType.DXA},
                    children:[
                      new Paragraph({children:[new TextRun({text:label.toUpperCase(),bold:true,size:12,color:'4a6480',font:'Arial'})],spacing:{before:40,after:20}}),
                      new Paragraph({children:[new TextRun({text:valor||'—',size:16,color:'0C2744',font:'Arial'})],
                        border:{top:{style:BorderStyle.SINGLE,size:1,color:'B5D4F4'},bottom:{style:BorderStyle.SINGLE,size:1,color:'B5D4F4'},left:{style:BorderStyle.SINGLE,size:1,color:'B5D4F4'},right:{style:BorderStyle.SINGLE,size:1,color:'B5D4F4'}} as any,
                        spacing:{before:20,after:40},indent:{left:60},
                      }),
                    ],
                    margins:{top:40,bottom:40,left:80,right:80},
                    borders:{top:{style:BorderStyle.NIL},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL}},
                  })
                }

                function mkRow(...cells: TableCell[]): TableRow {
                  return new TableRow({children:cells})
                }

                function bloco(rows: TableRow[]): Table {
                  return new Table({
                    width:{size:TW,type:WidthType.DXA},
                    borders:{
                      top:{style:BorderStyle.SINGLE,size:2,color:'B5D4F4'},
                      bottom:{style:BorderStyle.SINGLE,size:2,color:'B5D4F4'},
                      left:{style:BorderStyle.SINGLE,size:2,color:'B5D4F4'},
                      right:{style:BorderStyle.SINGLE,size:2,color:'B5D4F4'},
                      insideH:{style:BorderStyle.NIL},
                      insideV:{style:BorderStyle.NIL},
                    },
                    rows,
                    margins:{bottom:80},
                  })
                }

                // ── Cabeçalho do formulário ──────────────────────────────────
                const tabCab = new Table({
                  width:{size:TW,type:WidthType.DXA},
                  borders:{top:{style:BorderStyle.NIL},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL},insideH:{style:BorderStyle.NIL},insideV:{style:BorderStyle.NIL}},
                  rows:[new TableRow({children:[new TableCell({
                    width:{size:TW,type:WidthType.DXA},
                    children:[
                      new Paragraph({children:[
                        new TextRun({text:'AIMÊ',bold:true,size:24,color:'FFFFFF',font:'Arial'}),
                        new TextRun({text:'  Autovistoria',bold:true,size:20,color:'FFFFFF',font:'Arial'}),
                      ],spacing:{before:80,after:16},indent:{left:80}}),
                      new Paragraph({children:[
                        new TextRun({text:'Formulário para registro de manifestações patológicas e avaliação de riscos',size:13,color:'B5D4F4',font:'Arial'}),
                      ],spacing:{before:0,after:80},indent:{left:80}}),
                    ],
                    shading:{type:ShadingType.CLEAR,color:'auto',fill:'0C447C'},
                    margins:{top:80,bottom:80,left:120,right:120},
                  })]})],
                  margins:{bottom:100},
                })

                // ── IDENTIFICAÇÃO ────────────────────────────────────────────
                const tabIdent = bloco([
                  blockTitle('Identificação'),
                  mkRow(
                    campo(cnpjoucpf?.length===11?'CPF':'CNPJ', fmtDoc(X(nc.cnpjoucpf||cnpjoucpf)), Math.floor(TW/2)),
                    campo('Razão Social / Nome', X(estab?.razao_social_nome), TW-Math.floor(TW/2)),
                  ),
                ])

                // ── MANIFESTAÇÃO PATOLÓGICA ──────────────────────────────────
                const tabMP = bloco([
                  blockTitle('Manifestação Patológica'),
                  mkRow(
                    campo('Sistema', nomeS, Math.floor(TW/3)),
                    campo('Subsistema', X(nc.subsistema), Math.floor(TW/3)),
                    campo('Anomalia / Falha', X(nc.anomalia), TW-2*Math.floor(TW/3)),
                  ),
                  mkRow(
                    campo('Origem', X(nc.origem||nc.resultado||'—'), Math.floor(TW/3)),
                    campo('Local de Ocorrência', X(nc.local), Math.floor(TW/3)),
                    campo('Complemento do Local', X(nc.complemento), TW-2*Math.floor(TW/3)),
                  ),
                ])

                // ── CLASSIFICAÇÃO DE RISCO ───────────────────────────────────
                const W4 = Math.floor(TW/4)
                const tabRisco = bloco([
                  blockTitle('Classificação de Risco'),
                  mkRow(
                    campo('Gravidade',   X(nc.gravidade),    W4),
                    campo('Urgência',    X(nc.urgencia),     W4),
                    campo('Abrangência', X(nc.abrangencia),  W4),
                    campo('Exposição',   X(nc.exposicao),    TW-3*W4),
                  ),
                  new TableRow({children:[
                    // Grau de Risco — fundo #E6F1FB, GR em fonte grande
                    new TableCell({
                      width:{size:Math.floor(TW/2),type:WidthType.DXA},
                      children:[
                        new Paragraph({children:[new TextRun({text:'GRAU DE RISCO',bold:true,size:12,color:'4a6480',font:'Arial'})],spacing:{before:60,after:20}}),
                        new Paragraph({children:[new TextRun({text:X(nc.grauRisco),bold:true,size:40,color:corGR,font:'Arial'})],spacing:{before:0,after:60}}),
                      ],
                      shading:{type:ShadingType.CLEAR,color:'auto',fill:'E6F1FB'},
                      borders:{top:{style:BorderStyle.NIL},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.SINGLE,size:1,color:'B5D4F4'}},
                      margins:{top:60,bottom:60,left:120,right:120},
                    }),
                    // Prioridade — badge colorido centralizado
                    new TableCell({
                      width:{size:TW-Math.floor(TW/2),type:WidthType.DXA},
                      children:[
                        new Paragraph({children:[new TextRun({text:'PRIORIDADE',bold:true,size:12,color:'4a6480',font:'Arial'})],spacing:{before:60,after:20},alignment:AlignmentType.CENTER}),
                        new Paragraph({
                          children:[new TextRun({text:priSim,bold:true,size:22,color:fgBadge,font:'Arial'})],
                          spacing:{before:0,after:60},
                          alignment:AlignmentType.CENTER,
                          shading:{type:ShadingType.CLEAR,color:'auto',fill:bgBadge} as any,
                        }),
                      ],
                      shading:{type:ShadingType.CLEAR,color:'auto',fill:'E6F1FB'},
                      borders:{top:{style:BorderStyle.NIL},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL}},
                      margins:{top:60,bottom:60,left:120,right:120},
                    }),
                  ]}),
                ])

                // ── EVIDÊNCIA FOTOGRÁFICA ────────────────────────────────────
                const fotoRows: TableRow[] = [
                  blockTitle('Evidência Fotográfica'),
                  mkRow(
                    campo('Foto Nº', X(nc.fotoNr), Math.floor(TW/2)),
                    campo('Data da Vistoria', X(nc.dataVistoria), TW-Math.floor(TW/2)),
                  ),
                ]
                if (nc.fotoBase64 && nc.fotoBase64.startsWith('data:image')) {
                  try {
                    const m2 = nc.fotoBase64.match(/^data:([^;]+);base64,(.+)$/)
                    if (m2) {
                      const buf = Buffer.from(m2[2],'base64')
                      const ext = m2[1].includes('png') ? 'png' as const : 'jpg' as const
                      fotoRows.push(new TableRow({
                        height:{value:4800,rule:'atLeast' as any},
                        children:[new TableCell({
                          columnSpan:10,
                          width:{size:TW,type:WidthType.DXA},
                          children:[new Paragraph({
                            children:[new ImageRun({data:buf,transformation:{width:TW/57,height:220},type:ext})],
                            alignment:AlignmentType.CENTER,
                            spacing:{before:80,after:80},
                          })],
                          shading:{type:ShadingType.CLEAR,color:'auto',fill:'E6F1FB'},
                          borders:{top:{style:BorderStyle.SINGLE,size:1,color:'B5D4F4'},bottom:{style:BorderStyle.SINGLE,size:1,color:'B5D4F4'},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL}},
                          margins:{top:80,bottom:80,left:80,right:80},
                        })],
                      }))
                    }
                  } catch { /* sem foto */ }
                } else {
                  fotoRows.push(new TableRow({
                    height:{value:1200,rule:'atLeast' as any},
                    children:[new TableCell({
                      columnSpan:10,
                      width:{size:TW,type:WidthType.DXA},
                      children:[new Paragraph({
                        children:[new TextRun({text:'[Sem foto disponível]',italics:true,color:'B5D4F4',font:'Arial',size:16})],
                        alignment:AlignmentType.CENTER,spacing:{before:200,after:200},
                      })],
                      shading:{type:ShadingType.CLEAR,color:'auto',fill:'E6F1FB'},
                      borders:{top:{style:BorderStyle.SINGLE,size:1,color:'B5D4F4'},bottom:{style:BorderStyle.SINGLE,size:1,color:'B5D4F4'},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL}},
                    })],
                  }))
                }
                const tabFoto = bloco(fotoRows)

                // ── RESULTADO DA ANÁLISE ─────────────────────────────────────
                const tabNC = bloco([
                  blockTitle('Resultado da Análise e Avaliação'),
                  mkRow(campo('Descrição da não conformidade (NC)', X(nc.nc||nc.anomalia||'—'), TW)),
                  mkRow(campo('Descrição da causa provável (CP)', X(nc.cp||'—'), TW)),
                  mkRow(campo('Solução recomendada', X(nc.solucaoNC||nc.cp||'—'), TW)),
                ])

                const elems: any[] = []
                if (idx > 0) elems.push(new Paragraph({children:[new PageBreak()]}))
                elems.push(tabCab, par(''), tabIdent, par(''), tabMP, par(''), tabRisco, par(''), tabFoto, par(''), tabNC, par(''))
                return elems
              })
          ),

        // ANEXO 3
          new Paragraph({children:[new PageBreak()]}),
          par(' Anexo 3 – Anotações de responsabilidade dos profissionais que atuaram nesta inspeção.',{bold:true}),
          par(''),
          par('Inserir neste espaço a ART (Anotação de Responsabilidade Técnica) ou RRT (Registro de Responsabilidade Técnica) devidamente registrada no CREA ou CAU, relativa à execução deste trabalho de Laudo de Autovistoria.'),
          par(''),
          ...(imgArt && imgArt.startsWith('data:image') ? (() => {
            const matches = imgArt.match(/^data:([^;]+);base64,(.+)$/)
            if (matches) {
              const imgBuf = Buffer.from(matches[2], 'base64')
              const ext = matches[1].includes('png') ? 'png' as const : 'jpg' as const
              return [new Paragraph({ children: [new ImageRun({ data: imgBuf, transformation: { width: 500, height: 350 }, type: ext })], alignment: AlignmentType.CENTER })]
            }
            return [par('[Espaço reservado para inserção da ART/RRT pelo responsável técnico]',{italics:true,align:AlignmentType.CENTER})]
          })() : [par('[Espaço reservado para inserção da ART/RRT pelo responsável técnico]',{italics:true,align:AlignmentType.CENTER})]),
          par(''),
          par('-.-.-.-.-',{align:AlignmentType.CENTER}),
        ]
      }]
    })

    const buffer = await Packer.toBuffer(doc)
    const bytes = new Uint8Array(buffer)
    const nomeSemExt = (nomeArquivo || 'laudo').replace(/\.html$/i, '')
    const nomeDocx = nomeSemExt + '.docx'

    // Salvar no storage também
    await supabase.storage.from('aime')
      .upload(`documentos_inspetor/${nomeDocx}`, Buffer.from(bytes), {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${nomeDocx}"`,
      },
    })

  } catch (err) {
    console.error('gerar-laudo-docx error:', err)
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

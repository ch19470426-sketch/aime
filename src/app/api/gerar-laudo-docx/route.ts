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

    // ── Design System §3 ─────────────────────────────────────────────────────
    function titulo(txt: string): Table {
      return new Table({ width:{size:TW,type:WidthType.DXA},
        borders:{top:{style:BorderStyle.NIL},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL},insideH:{style:BorderStyle.NIL},insideV:{style:BorderStyle.NIL}},
        rows:[new TableRow({children:[new TableCell({
          children:[new Paragraph({children:[new TextRun({text:txt,bold:true,color:'FFFFFF',size:20,font:'Arial'})],spacing:{before:80,after:80},indent:{left:80}})],
          shading:{type:ShadingType.CLEAR,color:'auto',fill:'1E3A8A'},
          margins:{top:60,bottom:60,left:120,right:120},
        })]})],
        margins:{top:140,bottom:60},
      })
    }
    function blocoHdr(txt: string): TableRow {
      return new TableRow({children:[cel(txt,{bg:'1E3A8A',bold:true,span:99})]})
    }
    function itemRow(letra:string, crit:string, val:string, bgBadge='EEF2FF', fgBadge='1e40af'): TableRow {
      return new TableRow({children:[
        new TableCell({width:{size:320,type:WidthType.DXA},
          children:[new Paragraph({children:[new TextRun({text:letra,bold:true,color:'FFFFFF',size:20,font:'Arial'})],alignment:AlignmentType.CENTER,spacing:{before:80,after:80}})],
          shading:{type:ShadingType.CLEAR,color:'auto',fill:'1E3A8A'},
          borders:{top:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL}},
          margins:{top:40,bottom:40,left:40,right:40},
        }),
        new TableCell({
          children:[new Paragraph({children:[new TextRun({text:crit,color:'1E3A8A',size:16,font:'Arial'})],spacing:{before:80,after:80}})],
          borders:{top:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'}},
          margins:{top:40,bottom:40,left:80,right:80},
        }),
        new TableCell({width:{size:2800,type:WidthType.DXA},
          children:[new Paragraph({children:[new TextRun({text:val||'—',bold:true,size:17,font:'Arial',color:fgBadge})],alignment:AlignmentType.CENTER,spacing:{before:80,after:80}})],
          shading:{type:ShadingType.CLEAR,color:'auto',fill:bgBadge},
          borders:{top:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL}},
          margins:{top:40,bottom:40,left:80,right:80},
        }),
      ]})
    }
    function itemRec(num:string, txt:string): TableRow {
      return new TableRow({children:[
        new TableCell({width:{size:500,type:WidthType.DXA},
          children:[new Paragraph({children:[new TextRun({text:num,bold:true,color:'1E3A8A',size:18,font:'Arial'})],alignment:AlignmentType.CENTER,spacing:{before:80,after:80}})],
          shading:{type:ShadingType.CLEAR,color:'auto',fill:'EEF2FF'},
          borders:{top:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'}},
          margins:{top:40,bottom:40,left:40,right:40},
        }),
        new TableCell({
          children:[new Paragraph({children:[new TextRun({text:txt,size:17,color:'333333',font:'Arial'})],spacing:{before:80,after:80}})],
          borders:{top:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL}},
          margins:{top:40,bottom:40,left:80,right:80},
        }),
      ]})
    }
    function blocoTabela(rows: any[]): Table {
      return new Table({width:{size:TW,type:WidthType.DXA},
        borders:{top:{style:BorderStyle.SINGLE,size:3,color:'1E3A8A'},bottom:{style:BorderStyle.SINGLE,size:3,color:'1E3A8A'},left:{style:BorderStyle.SINGLE,size:3,color:'1E3A8A'},right:{style:BorderStyle.SINGLE,size:3,color:'1E3A8A'},insideH:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},insideV:{style:BorderStyle.NIL}},
        rows, margins:{bottom:100},
      })
    }



    // ── Design System §3 ─────────────────────────────────────────────────────
    function titulo(txt: string): Table {
      return new Table({ width:{size:TW,type:WidthType.DXA},
        borders:{top:{style:BorderStyle.NIL},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL},insideH:{style:BorderStyle.NIL},insideV:{style:BorderStyle.NIL}},
        rows:[new TableRow({children:[new TableCell({
          children:[new Paragraph({children:[new TextRun({text:txt,bold:true,color:'FFFFFF',size:20,font:'Arial'})],spacing:{before:80,after:80},indent:{left:80}})],
          shading:{type:ShadingType.CLEAR,color:'auto',fill:'1E3A8A'},
          margins:{top:60,bottom:60,left:120,right:120},
        })]})],
        margins:{top:140,bottom:60},
      })
    }
    function blocoHdr(txt: string): TableRow {
      return new TableRow({children:[cel(txt,{bg:'1E3A8A',bold:true,span:99})]})
    }
    function itemRow(letra:string, crit:string, val:string, bgBadge='EEF2FF', fgBadge='1e40af'): TableRow {
      return new TableRow({children:[
        new TableCell({width:{size:320,type:WidthType.DXA},
          children:[new Paragraph({children:[new TextRun({text:letra,bold:true,color:'FFFFFF',size:20,font:'Arial'})],alignment:AlignmentType.CENTER,spacing:{before:80,after:80}})],
          shading:{type:ShadingType.CLEAR,color:'auto',fill:'1E3A8A'},
          borders:{top:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL}},
          margins:{top:40,bottom:40,left:40,right:40},
        }),
        new TableCell({
          children:[new Paragraph({children:[new TextRun({text:crit,color:'1E3A8A',size:16,font:'Arial'})],spacing:{before:80,after:80}})],
          borders:{top:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'}},
          margins:{top:40,bottom:40,left:80,right:80},
        }),
        new TableCell({width:{size:2800,type:WidthType.DXA},
          children:[new Paragraph({children:[new TextRun({text:val||'—',bold:true,size:17,font:'Arial',color:fgBadge})],alignment:AlignmentType.CENTER,spacing:{before:80,after:80}})],
          shading:{type:ShadingType.CLEAR,color:'auto',fill:bgBadge},
          borders:{top:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL}},
          margins:{top:40,bottom:40,left:80,right:80},
        }),
      ]})
    }
    function itemRec(num:string, txt:string): TableRow {
      return new TableRow({children:[
        new TableCell({width:{size:500,type:WidthType.DXA},
          children:[new Paragraph({children:[new TextRun({text:num,bold:true,color:'1E3A8A',size:18,font:'Arial'})],alignment:AlignmentType.CENTER,spacing:{before:80,after:80}})],
          shading:{type:ShadingType.CLEAR,color:'auto',fill:'EEF2FF'},
          borders:{top:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'}},
          margins:{top:40,bottom:40,left:40,right:40},
        }),
        new TableCell({
          children:[new Paragraph({children:[new TextRun({text:txt,size:17,color:'333333',font:'Arial'})],spacing:{before:80,after:80}})],
          borders:{top:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},bottom:{style:BorderStyle.NIL},left:{style:BorderStyle.NIL},right:{style:BorderStyle.NIL}},
          margins:{top:40,bottom:40,left:80,right:80},
        }),
      ]})
    }
    function blocoTabela(rows: any[]): Table {
      return new Table({width:{size:TW,type:WidthType.DXA},
        borders:{top:{style:BorderStyle.SINGLE,size:3,color:'1E3A8A'},bottom:{style:BorderStyle.SINGLE,size:3,color:'1E3A8A'},left:{style:BorderStyle.SINGLE,size:3,color:'1E3A8A'},right:{style:BorderStyle.SINGLE,size:3,color:'1E3A8A'},insideH:{style:BorderStyle.SINGLE,size:1,color:'1E3A8A'},insideV:{style:BorderStyle.NIL}},
        rows, margins:{bottom:100},
      })
    }

    // Gráfico de barras como tabela DOCX
    function tabelaBarras(stat: {s:string,a:number,m:number,b:number,t:number}[]): any[] {
      const itens = stat.filter(s => s.t > 0)
      if (itens.length === 0) return []
      const max = Math.max(...itens.map(s => s.t), 1)
      const BAR_W = 5000  // largura total da barra em DXA
      const rows = [
        new TableRow({ children: [
          cel('Sistema Construtivo', { bg:'1E3A8A', bold:true, width:3200 }),
          cel('Ocorrências', { bg:'1E3A8A', bold:true, width:BAR_W, align:AlignmentType.CENTER }),
          cel('Nº', { bg:'1E3A8A', bold:true, width:500, align:AlignmentType.CENTER }),
        ]}),
        ...itens.map(({s, t}) => {
          const label = s.slice(3).replace(/_/g,' ')
          const barLen = Math.max(1, Math.round((t / max) * (BAR_W - 200)))
          // Barra: célula interna com fundo azul proporcional
          const barCell = new TableCell({
            width: { size: BAR_W, type: WidthType.DXA },
            children: [new Paragraph({
              children: [new TextRun({ text: ' '.repeat(Math.max(1, Math.round(barLen/50))), font: 'Arial', size: 20, highlight: 'none' as any })],
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: '1E3A8A' } as any,
              spacing: { before: 40, after: 40 },
            })],
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EEF2FF' },
            margins: { top: 40, bottom: 40, left: 0, right: 0 },
          })
          // Workaround: usar célula dividida com barra colorida
          const filledW = Math.max(100, Math.round((t / max) * BAR_W))
          const emptyW  = BAR_W - filledW
          const barFill = new TableCell({
            width: { size: filledW, type: WidthType.DXA },
            children: [new Paragraph({ children: [], spacing: { before: 80, after: 80 } })],
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: '1E3A8A' },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          })
          const barEmpty = new TableCell({
            width: { size: Math.max(100, emptyW), type: WidthType.DXA },
            children: [new Paragraph({ children: [], spacing: { before: 80, after: 80 } })],
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EEF2FF' },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          })
          return new TableRow({ children: [
            cel(label, { width: 3200 }),
            barFill,
            barEmpty,
            cel(String(t), { width: 500, bold:true, align: AlignmentType.CENTER }),
          ]})
        })
      ]
      return [
        par('Nº de ocorrências por sistema construtivo', { bold: true }),
        new Table({ width: { size: TW, type: WidthType.DXA }, rows, columnWidths: [3200, ...itens.map((_,i) => i===0?2500:0).filter(Boolean), 5000, 500] }),
      ]
    }

    // Gráfico de pizza como tabela DOCX (legenda colorida)
    function tabelaPizza(totA: number, totM: number, totB: number): any[] {
      const tot = totA + totM + totB
      if (tot === 0) return []
      const pA = Math.round(totA*100/tot), pM = Math.round(totM*100/tot), pB = 100-pA-pM
      return [
        par('Distribuição por Prioridade', { bold: true }),
        new Table({ width: { size: 4000, type: WidthType.DXA }, rows: [
          new TableRow({ children: [
            cel('Prioridade', { bg:'1E3A8A', bold:true, width:1400 }),
            cel('Qtd', { bg:'1E3A8A', bold:true, width:600, align:AlignmentType.CENTER }),
            cel('%', { bg:'1E3A8A', bold:true, width:600, align:AlignmentType.CENTER }),
            cel('', { bg:'1E3A8A', bold:true, width:1400 }),
          ]}),
          new TableRow({ children: [
            cel('Alta (Imediata)', { width:1400 }),
            cel(String(totA), { width:600, bold:true, align:AlignmentType.CENTER }),
            cel(pA+'%', { width:600, align:AlignmentType.CENTER }),
            new TableCell({ width:{size:1400,type:WidthType.DXA}, children:[new Paragraph({children:[]})], shading:{type:ShadingType.CLEAR,color:'auto',fill:'DC2626'} }),
          ]}),
          new TableRow({ children: [
            cel('Média (Curto Prazo)', { width:1400 }),
            cel(String(totM), { width:600, bold:true, align:AlignmentType.CENTER }),
            cel(pM+'%', { width:600, align:AlignmentType.CENTER }),
            new TableCell({ width:{size:1400,type:WidthType.DXA}, children:[new Paragraph({children:[]})], shading:{type:ShadingType.CLEAR,color:'auto',fill:'D97706'} }),
          ]}),
          new TableRow({ children: [
            cel('Baixa (Longo Prazo)', { width:1400 }),
            cel(String(totB), { width:600, bold:true, align:AlignmentType.CENTER }),
            cel(pB+'%', { width:600, align:AlignmentType.CENTER }),
            new TableCell({ width:{size:1400,type:WidthType.DXA}, children:[new Paragraph({children:[]})], shading:{type:ShadingType.CLEAR,color:'auto',fill:'059669'} }),
          ]}),
          new TableRow({ children: [
            cel('Total', { bg:'E5E7EB', bold:true, width:1400 }),
            cel(String(tot), { bg:'E5E7EB', bold:true, width:600, align:AlignmentType.CENTER }),
            cel('100%', { bg:'E5E7EB', width:600, align:AlignmentType.CENTER }),
            cel('', { bg:'E5E7EB', width:1400 }),
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
      new TableRow({children:[cel('',{bg:'F2F2F2',span:6,width:TW})]}),
      new TableRow({children:[cel('Características da Edificação',{bg:'F2F2F2',span:6,bold:true,align:AlignmentType.CENTER})]}),
      new TableRow({children:[cel('Identificação e características da edificação:',{bg:'F2F2F2',span:6})]}),
      new TableRow({children:[cel(X(labelDoc)+':',{width:1000}),cel(X(estab?.razao_social_nome),{span:2,width:3000}),cel(labelDoc+':',{width:800}),cel(fmtDoc(cnpjoucpf),{width:2200}),cel('CEP: '+X(estab?.cep),{width:1438}),]}),
      new TableRow({children:[cel('Endereço:',{width:1000}),cel(X(estab?.logradouro)+', '+X(estab?.numero)+' '+X(estab?.complemento),{span:3,width:5000}),cel('Bairro:',{width:800}),cel(X(estab?.bairro),{width:1638}),]}),
      new TableRow({children:[cel('Cidade e UF:',{width:1000}),cel(X(estab?.cidade)+'/'+X(estab?.uf),{width:2000}),cel('Responsável:',{width:1600}),cel(X(estab?.nome_responsavel),{span:2,width:3838}),]}),
      new TableRow({children:[cel('Tel:',{width:1000}),cel(X(estab?.whatsapp),{width:2000}),cel('e-Mail:',{width:1600}),cel(X(estab?.email),{span:2,width:3838}),]}),
      new TableRow({children:[cel('Uso:',{width:1000}),cel(X(estab?.uso_imovel),{width:1600}),cel('Tipo:',{width:800}),cel(X(estab?.tipo_imovel),{width:1400}),cel('Pav:',{width:600}),cel(X(estab?.numero_pavimentos),{width:638}),]}),
      new TableRow({children:[cel('Unidades:',{width:1000}),cel(X(estab?.numero_unidades_salas),{width:1600}),cel('Área construída:',{width:1400}),cel(X(estab?.area_construida)+' m²',{width:1200}),cel('Terreno:',{width:800}),cel(X(estab?.area_terreno)+' m²',{width:1038}),]}),
      new TableRow({children:[cel('Síntese da descrição da Edificação:',{bg:'F2F2F2',span:6,bold:true})]}),
      new TableRow({children:[cel(X(complemento?.sinteseEdif),{span:6})]}),
      new TableRow({children:[cel('',{span:6})]}),
      new TableRow({children:[cel('',{bg:'F2F2F2',span:6})]}),
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
      new TableRow({children:[cel('',{bg:'F2F2F2',span:2})]}),
      new TableRow({children:[cel('Localização do Estabelecimento',{bg:'F2F2F2',span:2,bold:true,align:AlignmentType.CENTER})]}),
      new TableRow({ height:{value:2800,rule:'atLeast' as any}, children:[
        celImagem(imgCroqui, '[CROQUI MAPS — colar após baixar o documento]', Math.floor(TW/2)),
        celImagem(imgFoto,   '[FOTO DA FACHADA PRINCIPAL — inserir pelo responsável técnico]', TW-Math.floor(TW/2)),
      ]}),
      new TableRow({children:[cel('',{bg:'F2F2F2',span:2})]}),
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
      new TableRow({children:[cel('Agenda de Trabalho – Inspetor e Síndico',{bg:'D9D9D9',span:5,bold:true,align:AlignmentType.CENTER})]}),
      new TableRow({children:[cel('Duração Prevista',{span:2,bg:'F2F2F2',align:AlignmentType.CENTER}),cel('Período',{span:2,bg:'F2F2F2',align:AlignmentType.CENTER}),cel('Atividades',{bg:'F2F2F2',align:AlignmentType.CENTER})]}),
      new TableRow({children:[cel('Horas',{bg:'F2F2F2',width:800,align:AlignmentType.CENTER}),cel('Dias Úteis',{bg:'F2F2F2',width:1000,align:AlignmentType.CENTER}),cel('Dt Início',{bg:'F2F2F2',width:1200,align:AlignmentType.CENTER}),cel('Dt Fim',{bg:'F2F2F2',width:1200,align:AlignmentType.CENTER}),cel('Atividades',{bg:'F2F2F2',width:5438,align:AlignmentType.CENTER})]}),
      ...ATIVIDADES_PLANO.map(([h,d,a]) => new TableRow({children:[cel(h,{width:800,align:AlignmentType.CENTER}),cel(d,{width:1000,align:AlignmentType.CENTER}),cel('',{width:1200}),cel('',{width:1200}),cel(a,{width:5438})]})),
      new TableRow({children:[cel('',{bg:'F2F2F2',span:5})]}),
    ]})

    // Tabela 3.1
    const tab31 = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
      new TableRow({children:[cel('',{bg:'F2F2F2'})]}),
      new TableRow({children:[cel('Descrição da Realização da Vistoria',{bold:true,align:AlignmentType.CENTER})]}),
      new TableRow({height:{value:1500,rule:'atLeast' as any},children:[cel(X(complemento?.descVistoria||complemento?.dadosVistoria))]}),
      new TableRow({children:[cel('',{bg:'F2F2F2'})]}),
    ]})

    // Tabela 3.3
    const ITENS33 = tipoServico==='43' ? [
      {l:'a)',d:'A execução da obra em relação à CONFORMIDADE CONSTRUTIVA foi classificada como:',v:X(cl.nivel),bg:'dbeafe',fg:'1e40af'},
      {l:'b)',d:'A QUALIDADE DE ACABAMENTO do imóvel é classificada como:',v:X(cl.risco),bg:'fef9c3',fg:'854d0e'},
      {l:'c)',d:'Quanto ao uso, a FUNCIONALIDADE do imóvel:',v:X(cl.desempenho),bg:'dcfce7',fg:'166534'},
      {l:'d)',d:'Quanto às condições de ocupação, a HABITABILIDADE pode ser considerada:',v:X(cl.manut),bg:'f3e8ff',fg:'6b21a8'},
      {l:'e)',d:'A análise sobre a CLASSE DO IMÓVEL resulta em:',v:X(cl.uso),bg:'e0f2fe',fg:'0369a1'},
      {l:'f)',d:'O GRAU DE SATISFAÇÃO NO RECEBIMENTO do imóvel:',v:X(cl.desempGeral),bg:'dcfce7',fg:'166534'},
    ] : tipoServico==='44' ? [
      {l:'a)',d:'Quanto ao ESTADO DE CONSERVAÇÃO da fachada:',v:X(cl.risco),bg:'fef9c3',fg:'854d0e'},
      {l:'b)',d:'O histórico de MANUTENÇÃO da fachada:',v:X(cl.manut),bg:'f3e8ff',fg:'6b21a8'},
      {l:'c)',d:'A AGRESSIVIDADE DO MEIO AMBIENTE sobre a fachada:',v:X(cl.desempenho),bg:'fef9c3',fg:'854d0e'},
      {l:'d)',d:'O RISCO DE QUEDA DE ELEMENTOS da fachada:',v:X(cl.uso),bg:'fee2e2',fg:'991b1b'},
      {l:'e)',d:'O DESEMPENHO TÉCNICO DO SISTEMA da fachada:',v:X(cl.desempGeral),bg:'dcfce7',fg:'166534'},
    ] : [
      {l:'a)',d:'Quanto ao NÍVEL da inspeção efetuada o imóvel foi classificado como INSPEÇÃO PREDIAL NÍVEL:',v:nivel,bg:'dbeafe',fg:'1e40af'},
      {l:'b)',d:'Quanto ao GRAU DE RISCO o imóvel encontra-se classificado como de RISCO:',v:X(cl.risco),bg:'fef9c3',fg:'854d0e'},
      {l:'c)',d:'Quanto ao DESEMPENHO a classificação geral do imóvel foi classificada como:',v:X(cl.desempenho),bg:'dcfce7',fg:'166534'},
      {l:'d)',d:'Quanto à QUALIDADE DA MANUTENÇÃO a edificação foi classificada como QUALIDADE QUE:',v:X(cl.manut),bg:'f3e8ff',fg:'6b21a8'},
      {l:'e)',d:'Quanto às CONDIÇÕES DE USO a edificação foi classificada como EDIFICAÇÃO DE USO:',v:X(cl.uso),bg:'e0f2fe',fg:'0369a1'},
      {l:'f)',d:'Quanto ao DESEMPENHO GERAL a edificação foi classificada como:',v:X(cl.desempGeral),bg:'dcfce7',fg:'166534'},
    ]
    const titulo33 = tipoServico==='43'?'Resultado da Classificação do Imóvel':tipoServico==='44'?'Resultado da Classificação da Fachada':'Resultado da Classificação da Edificação'
    const tab33 = blocoTabela([blocoHdr(titulo33), ...ITENS33.map((i:any)=>itemRow(i.l,i.d,i.v,i.bg,i.fg))])

    // Tabelas 4.1 por sistema
    const elems41: any[] = []
    for (const s of sistemas) {
      const arr = ncsPorSistema[s]
      if (!arr.length) continue
      const nomeS = s.slice(3).replace(/_/g,' ')
      const rec = complemento?.recsSistema?.[s] || ''
      elems41.push(new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
        new TableRow({children:[cel('',{bg:'F2F2F2',span:6})]}),
        new TableRow({children:[cel('Relação de Não Conformidades e Soluções por Sistema Construtivo',{span:6,bold:true,align:AlignmentType.CENTER,bg:'FFFFFF'})]}),
        new TableRow({children:[cel('Sistema construtivo ou instalação:',{span:6,bold:true,bg:'FFFFFF'})]}),
        new TableRow({children:[cel(nomeS,{span:6,bg:'FFFFFF'})]}),
        new TableRow({children:[cel('Descrição:',{span:6,bold:true,bg:'FFFFFF'})]}),
        new TableRow({children:[cel(descSistema(s),{span:6,bg:'FFFFFF'})]}),
        new TableRow({children:[cel('Recomendação para o sistema construtivo:',{span:6,bold:true,bg:'FFFFFF'})]}),
        new TableRow({children:[cel(rec||'[Gerado pela IA — revisar]',{span:6,bg:'FFFFFF',italics:!rec})]}),
        new TableRow({children:[
          cel('Foto',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:500}),
          cel('Não Conformidade',{bg:'F2F2F2',bold:true,width:2500}),
          cel('Local ocorrência',{bg:'F2F2F2',bold:true,width:1500}),
          cel('Grau Risco',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:600}),
          cel('Prioridade',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:800}),
          cel('Soluções',{bg:'F2F2F2',bold:true,width:3738}),
        ]}),
        ...arr.map((nc:any) => new TableRow({children:[
          cel(X(nc.fotoNr),{align:AlignmentType.CENTER,width:600}),
          cel(X(nc.nc||nc.anomalia),{width:2200}),
          cel(X(nc.local)+(nc.complemento?' — '+X(nc.complemento):''),{width:1800}),
          cel(X(nc.grauRisco),{align:AlignmentType.CENTER,width:700}),
          cel(X(nc.prioridade),{align:AlignmentType.CENTER,width:900,bold:true}),
          cel(X(nc.solucaoNC||nc.cp||'—'),{width:3738}),
        ]})),
        new TableRow({children:[cel('',{bg:'F2F2F2',span:6})]}),
      ]}))
      elems41.push(par(''))
    }

    // Tabela 4.2
    const tab42 = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
      new TableRow({children:[cel('',{bg:'EEECE1',span:9})]}),
      new TableRow({children:[cel('Estatística de Manifestações Patológicas por Sistema Construtivo',{span:9,bold:true,align:AlignmentType.CENTER,bg:'EEECE1'})]}),
      new TableRow({children:[
        cel('Sistemas construtivos',{bg:'F2F2F2',bold:true,rowSpan:2,width:3500}),
        cel('Manifestações por Prioridades',{bg:'F2F2F2',bold:true,span:6,align:AlignmentType.CENTER,width:5438}),
        cel('Sub total',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:700}),
      ]}),
      new TableRow({children:[
        cel('A',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:650}),
        cel('%',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:650}),
        cel('M',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:650}),
        cel('%',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:650}),
        cel('B',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:650}),
        cel('%',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:788}),
        cel('',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:700}),
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
      new TableRow({children:[cel('',{bg:'EEECE1',span:9})]}),
    ]})

    // Tabela 5
    const tab5 = blocoTabela([
      blocoHdr('Recomendações sobre Manutenção, Uso, Sustentabilidade e Gerais'),
      itemRec('5.1', '5.1.- Avaliação e recomendações da manutenção.  ' + (X(complemento?.rec51)||'[A ser preenchido]')),
      itemRec('5.2', '5.2.- Avaliação e recomendações do uso da edificação.  ' + (X(complemento?.rec52)||'[A ser preenchido]')),
      itemRec('5.3', '5.3.- Avaliação e recomendações da sustentabilidade.  ' + (X(complemento?.rec53)||'[A ser preenchido]')),
      itemRec('5.4', '5.4.- Outras avaliações e recomendações.  ' + (X(complemento?.rec54)||'[A ser preenchido]')),
    ])

    // Tabela Anexo 1
    const tabA1 = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
      new TableRow({children:[cel('',{bg:'F2F2F2',span:3})]}),
      new TableRow({children:[cel('Documentação da Edificação Solicitada para Análise e Avaliação',{span:3,bold:true,align:AlignmentType.CENTER})]}),
      new TableRow({children:[cel('Documentos',{bg:'F2F2F2',bold:true,width:Math.floor(TW*0.6)}),cel('Situação',{bg:'F2F2F2',bold:true,align:AlignmentType.CENTER,width:Math.floor(TW*0.2)}),cel('Resultado',{bg:'F2F2F2',bold:true,width:TW-Math.floor(TW*0.8)})]}),
      ...DOCS_ANEXO1.map(d => new TableRow({children:[cel(d,{width:Math.floor(TW*0.6)}),cel('',{align:AlignmentType.CENTER,width:Math.floor(TW*0.2)}),cel('',{width:TW-Math.floor(TW*0.8)})]})),
      new TableRow({children:[cel('Situação: Entregue; Pendente; Desnecessário — Resultado: Conforme; Não conforme; Não se aplica',{span:3,italics:true})]}),
      new TableRow({children:[cel('',{bg:'F2F2F2',span:3})]}),
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
          titulo('ÍNDICE'),
          ...['1.- Considerações Preliminares','     1.1.- Características e localização da edificação','     1.2.- Objetivo','     1.3.- Plano de Trabalho','     1.4.- Condições e limitações','2.- Metodologia adotada para o Trabalho de Autovistoria','3.- Resultado da Vistoria Técnica e Classificação da Edificação','     3.1.- Descrição da Vistoria Técnica','     3.2.- Resultado da Vistoria','     3.3.- Resultado da Classificação da Edificação','4.- Relação de Não Conformidades e Análise das Manifestações Patológicas','     4.1.- Relação de Não Conformidades e Soluções','     4.2.- Análise Estatística das Manifestações Patológicas','5.- Recomendações sobre a Manutenção, Uso, Sustentabilidade e Gerais','6.- Conclusão','7.- Encerramento','Anexo 1 – Relação de documentos solicitados e analisados','Anexo 2 – Resultado da Vistoria','Anexo 3 – Anotações de responsabilidade dos profissionais que atuaram nesta inspeção'].map(t => par(t,{before:40,after:20})),
          par(''),
          // 1. CONSIDERAÇÕES
          new Paragraph({children:[new PageBreak()]}),
          titulo('1.- Considerações Preliminares'),
          par('Este Laudo de Autovistoria é o documento completo resultante do trabalho executado na vistoria da edificação, análise, classificação e priorização das manifestações patológicas, conforme exigências da ABNT/NBR 16.747/2020, recomendações da Norma de Inspeção Predial do IBAPE de 2025 e legislação vigente.'),
          par('A inspeção apresentada neste laudo é o resultado de um exame "clínico geral" que avalia as condições globais do objeto em estudo e detecta a existência de problemas de conservação ou funcionamento, com base em uma análise fundamentalmente sensorial e efetuada por um profissional habilitado.'),
          par('A documentação da edificação solicitada pelo inspetor na reunião inicial foi analisada e avaliada, e o resultado fica registrado na planilha apresentada no Anexo 1 deste laudo.'),
          par(''),
          titulo('1.1.- Características e localização da edificação.'),
          tab11, par(''), tab11loc, par(''),
          titulo('1.2.- Objetivo.'),
          par('Avaliar as condições de segurança, funcionalidade, habitabilidade e manutenção da edificação, de acordo com os critérios da ABNT NBR 16.747/2020, normas correlatas, legislação vigente e metodologia apresentada neste documento.'),
          par(''),
          titulo('1.3.- Plano de Trabalho.'),
          par('As etapas básicas desenvolvidas para a realização do presente trabalho de Inspeção Predial constam na tabela que segue:'),
          tab13, par(''),
          titulo('1.4.- Condições e limitações.'),
          par('O Laudo de Autovistoria segue as condições abaixo relacionadas, além de estar sujeito às seguintes limitações:'),
          par('Neste trabalho computamos como corretos os elementos documentais consultados e as informações prestadas por terceiros, de boa fé e confiáveis;',{indent:720}),
          par('O trabalho apresentado e o resultado final são válidos apenas para a sequência metodológica apresentada, sendo vedada a utilização deste laudo em conexão com qualquer outro trabalho, exceto como referência para contratação dos serviços de manutenção;',{indent:720}),
          par('O responsável técnico não assume responsabilidade sobre matéria alheia ao exercício profissional, estabelecido em leis, códigos e regulamentos.',{indent:720}),
          par(''),
          // 2. METODOLOGIA
          new Paragraph({children:[new PageBreak()]}),
          titulo('2.- Metodologia Adotada'),
          par('A metodologia adotada para este trabalho segue as normas da ABNT, IBAPE e legislação estadual e municipal que regulamentam a autovistoria.'),
          par(''),
          titulo('2.1.- Norma Brasileira para Inspeção Predial — NBR-16.747/2020.'),
          par('A metodologia básica para execução do presente trabalho foi pautada nos requisitos constantes da NBR-16.747/2020 (Inspeção Predial — Diretrizes, Conceitos, Terminologia e Procedimentos) da Associação Brasileira de Normas Técnicas — ABNT.'),
          par([{text:'"Abrangências da análise',bold:true,italics:true}]),
          par('A inspeção predial baseia-se na constatação e análise do estado aparente de desempenho dos sistemas construtivos na fase de uso, operação e manutenção, considerando os requisitos dos usuários.',{italics:true}),
          par('A análise consiste na constatação da situação da edificação quanto à sua capacidade de atender às suas funções segundo os requisitos dos usuários, com base na análise fundamentalmente sensorial e efetuada por um profissional habilitado."',{italics:true}),
          par(''),
          titulo('2.2.- Norma de Inspeção Predial do IBAPE/2025.'),
          par('A Norma de Inspeção Predial do IBAPE fixa diretrizes, conceitos, terminologias, critérios e procedimentos relativos à atividade de Inspeção Predial, abrangendo os requisitos mínimos de:'),
          par('Segurança: segurança estrutural; segurança contra incêndio; segurança no uso e na operação;',{indent:720,italics:true}),
          par('Habitabilidade: estanqueidade; saúde, higiene e qualidade do ar; funcionalidade e acessibilidade;',{indent:720,italics:true}),
          par('Sustentabilidade: durabilidade e manutenibilidade.',{indent:720,italics:true}),
          par('A norma se aplica a todas as tipologias de edificações, sendo elas públicas ou privadas, devendo ser observadas as características técnicas e complexidades dos sistemas construtivos.'),
          par([{text:'As normas ABNT apresentadas a seguir são referências auxiliares e complementares à aplicação da norma IBAPE: ',italics:true},{text:'NBR 16747: Inspeção Predial; NBR 5674: Manutenção de Edificações; NBR 15575: Desempenho; NBR 14037: Manual de Operação, Uso e Manutenção; NBR 16280: Reforma em Edificações.',italics:true}]),
          par(''),
          titulo('2.3.- Critérios e Metodologia da Inspeção.'),
          titulo('2.3.1.- Critérios.'),
          par('O critério utilizado para elaboração de laudos baseia-se na análise do risco oferecido aos usuários, ao meio ambiente e ao patrimônio, diante as condições observadas nos sistemas construtivos durante a vistoria.'),
          par('A análise do risco consiste na classificação das anomalias e falhas identificadas nos diversos sistemas construtivos e instalações de uma edificação, levando em consideração: a Gravidade, a Urgência e a Tendência de evolução, usando a metodologia GUT adaptado.'),
          par(''),
          titulo('2.3.2.- Método.'),
          par('O método empregado consiste em: determinar o nível da inspeção predial (NBR 16.747); verificar e analisar a documentação; obter informações com responsáveis pela edificação; vistoriar os sistemas construtivos e instalações; classificar e priorizar as manifestações patológicas; e elaborar o laudo técnico.'),
          par('O planejamento da vistoria inclui uma entrevista com o responsável pela edificação, abordando características técnicas e aspectos cotidianos da manutenção do prédio, de forma a antecipar as dificuldades do trabalho.'),
          par(''),
          titulo('2.3.3.- Classificação das Inspeções Prediais (NBR 16.747) e Edificações.'),
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
          titulo('2.3.4.- Critérios para avaliação da manutenção, uso da edificação e do desempenho.'),
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
          titulo('3.- Resultado da Vistoria e Classificação'),
          par(''),
          titulo('3.1.- Descrição da Vistoria Técnica.'),
          tab31, par(''),
          par('Os sistemas construtivos e instalações vistoriadas, com as condições observadas e as respectivas recomendações são apresentadas nos Relatórios de Não Conformidades, item 4 deste documento.'),
          par('O resultado da vistoria é apresentado por sistema construtivo ou instalação, num conjunto de formulários, contendo o sistema e subsistema construtivo, localização da anomalia, o grau de risco e a prioridade para manutenção.'),
          par(''),
          titulo('3.2.- Resultado da Vistoria.'),
          par('O resultado da vistoria, imagens dos formulários da coleta de dados, é apresentado no Anexo 2 deste documento e apresenta, fielmente, dados, informações e fotos coletadas durante a realização da vistoria.'),
          par(''),
          titulo('3.3.- Resultado da Classificação da Edificação.'),
          par('O resultado da classificação da edificação quanto ao nível de inspeção, grau de risco, desempenho, manutenção e uso foi efetuada seguindo a metodologia apresentada para execução deste trabalho.'),
          tab33,
          par([{text:'As Prioridades para aplicar as soluções de manutenção constam na relação apresentada no '},{text:'item 4.',bold:true},{text:' deste documento.'}]),
          par(''),
          // 4. NÃO CONFORMIDADES
          new Paragraph({children:[new PageBreak()]}),
          titulo('4.- Relação de Não Conformidades e Análise'),
          par(''),
          titulo('4.1.- Relação de Não Conformidades e Soluções.'),
          par('Neste item é apresentado, de forma clara e concisa, o conjunto de manifestações patológicas identificadas na vistoria, suas localizações e o número da foto no respectivo formulário de vistoria.'),
          par('Salientamos, também, a importância do condomínio documentar as manutenções corretivas realizadas no pós inspeção, indicando a solução aplicada, local, data e responsável técnico pela execução.'),
          par('A prioridade para manutenção de cada uma das não conformidades foi obtida pelo grau de risco (0 a 100), calculado com base nos parâmetros: gravidade, urgência, tendência e exposição ao risco.'),
          par('Quanto a definição das prioridades foi adotado o critério: grau de risco superior a 64 pontos, prioridade ALTA; grau de risco menor que 65 pontos e maior que 34 pontos, prioridade MÉDIA; grau de risco menor que 35 pontos, prioridade BAIXA.'),
          par(''),
          ...elems41,
          titulo('4.2.- Análise Estatística das Manifestações Patológicas.'),
          par('A tabela que segue apresenta a estatística de ocorrências de manifestações patológicas por sistema construtivos e prioridades, onde se pode observar a distribuição das mesmas pelos sistemas.'),
          tab42,
          par(''),
          ...tabelaBarras(stat),
          par(''),
          ...tabelaPizza(totA, totM, totB),
          par(''),
          // 5. RECOMENDAÇÕES
          new Paragraph({children:[new PageBreak()]}),
          titulo('5.- Recomendações'),
          par('No decorrer do processo de autovistoria foi efetuada a análise da documentação, a vistoria na edificação, a classificação da edificação e das anomalias e falhas identificadas, o que possibilitou uma completa avaliação dos sistemas construtivos da edificação.'),
          par('A seguir estão registradas as recomendações para a manutenção, o uso, a sustentabilidade e outras consideradas pertinentes para este trabalho.'),
          par(''),
          tab5,
          par(''),
          // 6. CONCLUSÃO
          new Paragraph({children:[new PageBreak()]}),
          titulo('6.- Conclusão'),
          par('\t\tDiante do exposto neste documento, e após analisados todos os fatos observados que interferem ou possam vir a interferir com o assunto objeto deste laudo, concluímos:'),
          par(`A vistoria proporcionou a constatação de que, considerando a idade da construção, o imóvel ${totA>0?'apresenta anomalias que requerem intervenção imediata':'não apresenta nenhum dano aparente que represente ameaça à sua solidez, no que se refere ao aspecto estrutural e contenções'}.`),
          par(`Verificou-se a ${totT>0?'existência':'não existência'} de ${totT>0?`${totT} manifestações patológicas distribuídas nos sistemas construtivos vistoriados, sendo ${totA} de prioridade Alta, ${totM} de prioridade Média e ${totB} de prioridade Baixa, as quais necessitam de intervenções corretivas a serem executadas segundo as prioridades definidas`:'danos que possam comprometer a segurança da edificação'}.`),
          par('Com o intuito de melhor orientar futuras ações de manutenção e conservação do imóvel, recomendamos a execução de nova autovistoria no prazo máximo de 5 anos, para reavaliar e atuar preventivamente na situação construtiva da edificação.'),
          par(''),
          par([{text:'Atenção: ',bold:true,size:16},{text:'O titular do direito autoral deste trabalho somente autoriza sua reprodução nos casos legais cabíveis, vedando sua cópia ou qualquer forma de reprodução que caracterize plágio.',italics:true,size:16}]),
          par(''),
          // 7. ENCERRAMENTO
          titulo('7.- Encerramento'),
          titulo('7.1. Anexos:'),
          par('Anexo 1 – Relação de documentos solicitados e analisados;',{indent:450}),
          par('Anexo 2 – Resultado da Vistoria;',{indent:450}),
          par('Anexo 3 – Anotações de responsabilidade dos profissionais que atuaram nesta inspeção.',{indent:450}),
          par(''),
          titulo('7.2.- Declaração de conformidade com o Código de Ética.'),
          par('\t\tO signatário atesta que a presente autovistoria segue criteriosamente os seguintes princípios:'),
          par('Os itens deste trabalho foram revisados pessoalmente pelo responsável técnico que elaborou o Laudo Autovistoria;',{indent:450}),
          par('O responsável técnico não possui no presente, nem contempla para o futuro, interesse nos bens envolvidos neste trabalho;',{indent:450}),
          par('O trabalho encontra-se abrigado por absoluta confidencialidade, sendo garantido o sigilo perante terceiros quanto às razões que motivaram a presente contratação, bem como aos resultados alcançados;',{indent:450}),
          par('Este trabalho foi elaborado em observância estrita aos princípios dos Códigos de Ética Profissional do CONFEA e do IBAPE.',{indent:450}),
          par(''),
          titulo('7.3.- Termo de encerramento:'),
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
          titulo('Anexo 1 – Relação de Documentos Solicitados e Avaliados'),
          par(''),
          tabA1,
          par(''),
          // ANEXO 2 — Formulários de vistoria (layout fiel ao HTML homologado)
          new Paragraph({children:[new PageBreak()]}),
          titulo('Anexo 2 – Resultado da Vistoria'),
          par(''),
          ...((ncsComFoto ?? []).length === 0
            ? [par('[Nenhuma vistoria homologada encontrada para este serviço.]',{italics:true})]
            : (ncsComFoto ?? []).flatMap((nc: any, idx: number) => {
                const nomeS   = X(nc.sistema).slice(3).replace(/_/g,' ')
                const nomeDoc = (cnpjoucpf?.length === 11) ? 'CPF' : 'CNPJ'
                const labelNC = X(nc.resultado) ? 'Resultado' : 'Não conformidade (NC)'

                // ── Bloco: Identificação ──────────────────────────────────────
                const tabIdent = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
                  new TableRow({children:[cel('Identificação',{bg:'1E3A8A',span:4,bold:true})]}),
                  new TableRow({children:[
                    cel(nomeDoc+':',{bg:'EEF2FF',bold:true,width:800}),
                    cel(X(nc.cnpjoucpf),{width:2038}),
                    cel('Razão Social / Nome:',{bg:'EEF2FF',bold:true,width:1600}),
                    cel(X(estab?.razao_social_nome),{width:TW-4438}),
                  ]}),
                  new TableRow({children:[
                    cel('Tipo serviço:',{bg:'EEF2FF',bold:true,width:800}),
                    cel(X(nc.tipoServico||tipoServico),{width:2038}),
                    cel('Data Vistoria:',{bg:'EEF2FF',bold:true,width:1600}),
                    cel(X(nc.dataVistoria),{width:TW-4438}),
                  ]}),
                ]})

                // ── Bloco: Dados da NC ────────────────────────────────────────
                const tabNC = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
                  new TableRow({children:[cel('Anomalia / Não Conformidade',{bg:'1E3A8A',span:4,bold:true})]}),
                  new TableRow({children:[
                    cel('Sistema:',{bg:'EEF2FF',bold:true,width:800}),
                    cel(nomeS,{width:2038}),
                    cel('Subsistema:',{bg:'EEF2FF',bold:true,width:1600}),
                    cel(X(nc.subsistema),{width:TW-4438}),
                  ]}),
                  new TableRow({children:[
                    cel('Anomalia:',{bg:'EEF2FF',bold:true,width:800}),
                    cel(X(nc.anomalia),{span:3,width:TW-800}),
                  ]}),
                  new TableRow({children:[
                    cel('Local:',{bg:'EEF2FF',bold:true,width:800}),
                    cel(X(nc.local),{width:2038}),
                    cel('Complemento:',{bg:'EEF2FF',bold:true,width:1600}),
                    cel(X(nc.complemento),{width:TW-4438}),
                  ]}),
                ]})

                // ── Bloco: Classificação de Risco ─────────────────────────────
                const corGR = Number(nc.grauRisco) >= 64 ? 'DC2626'
                  : Number(nc.grauRisco) >= 35 ? 'D97706' : '059669'
                const tabRisco = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
                  new TableRow({children:[cel('Classificação de Risco',{bg:'1E3A8A',span:4,bold:true})]}),
                  new TableRow({children:[
                    cel('Gravidade:',{bg:'EEF2FF',bold:true,width:800}),
                    cel(X(nc.gravidade),{width:2038}),
                    cel('Urgência:',{bg:'EEF2FF',bold:true,width:1600}),
                    cel(X(nc.urgencia),{width:TW-4438}),
                  ]}),
                  new TableRow({children:[
                    cel('Abrangência:',{bg:'EEF2FF',bold:true,width:800}),
                    cel(X(nc.abrangencia),{width:2038}),
                    cel('Exposição:',{bg:'EEF2FF',bold:true,width:1600}),
                    cel(X(nc.exposicao),{width:TW-4438}),
                  ]}),
                  new TableRow({children:[
                    cel('Grau de Risco:',{bg:'EEF2FF',bold:true,width:800}),
                    cel(X(nc.grauRisco),{width:2038,bold:true,align:AlignmentType.CENTER}),
                    cel('Prioridade:',{bg:'EEF2FF',bold:true,width:1600}),
                    cel(X(nc.prioridade),{width:TW-4438,bold:true,align:AlignmentType.CENTER}),
                  ]}),
                ]})

                // ── Bloco: Foto ───────────────────────────────────────────────
                const fotoRows: any[] = [
                  new TableRow({children:[cel('Evidência Fotográfica',{bg:'1E3A8A',span:2,bold:true})]}),
                  new TableRow({children:[
                    cel('Foto Nº:',{bg:'EEF2FF',bold:true,width:800}),
                    cel(X(nc.fotoNr),{width:TW-800,bold:true,align:AlignmentType.CENTER}),
                  ]}),
                ]
                if (nc.fotoBase64 && nc.fotoBase64.startsWith('data:image')) {
                  try {
                    const m = nc.fotoBase64.match(/^data:([^;]+);base64,(.+)$/)
                    if (m) {
                      const buf = Buffer.from(m[2], 'base64')
                      const ext = m[1].includes('png') ? 'png' as const : 'jpg' as const
                      fotoRows.push(new TableRow({
                        height: { value: 4000, rule: 'atLeast' as any },
                        children:[new TableCell({
                          columnSpan: 2,
                          children: [new Paragraph({
                            children: [new ImageRun({ data: buf, transformation: { width: 500, height: 280 }, type: ext })],
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 60, after: 60 },
                          })],
                          margins: { top: 60, bottom: 60, left: 80, right: 80 },
                        })],
                      }))
                    }
                  } catch { fotoRows.push(new TableRow({children:[cel('[Foto não disponível]',{span:2,italics:true,align:AlignmentType.CENTER})]})) }
                } else {
                  fotoRows.push(new TableRow({ height:{value:1500,rule:'atLeast' as any}, children:[cel('[Sem foto]',{span:2,italics:true,align:AlignmentType.CENTER})]}))
                }
                const tabFoto = new Table({ width:{size:TW,type:WidthType.DXA}, rows: fotoRows })

                // ── Bloco: NC e CP ────────────────────────────────────────────
                const tabNCCP = new Table({ width:{size:TW,type:WidthType.DXA}, rows:[
                  new TableRow({children:[cel(labelNC,{bg:'1E3A8A',span:2,bold:true})]}),
                  new TableRow({children:[
                    cel('NC:',{bg:'EEF2FF',bold:true,width:800}),
                    cel(X(nc.nc||nc.anomalia),{width:TW-800}),
                  ]}),
                  new TableRow({children:[
                    cel('Causa Provável:',{bg:'EEF2FF',bold:true,width:800}),
                    cel(X(nc.cp),{width:TW-800}),
                  ]}),
                  new TableRow({children:[
                    cel('Solução:',{bg:'EEF2FF',bold:true,width:800}),
                    cel(X(nc.solucaoNC||nc.cp),{width:TW-800}),
                  ]}),
                  new TableRow({children:[cel(`✓ Homologado — ${X(nc.chaveInspetor||chaveInspetor)}`,{span:2,bg:'D1FAE5',align:AlignmentType.CENTER})]}),
                ]})

                return [
                  ...(idx > 0 ? [new Paragraph({children:[new PageBreak()]})] : []),
                  tabIdent, par(''),
                  tabNC, par(''),
                  tabRisco, par(''),
                  tabFoto, par(''),
                  tabNCCP, par(''),
                ]
              })
          ),
          // ANEXO 3
          new Paragraph({children:[new PageBreak()]}),
          titulo('Anexo 3 – Anotações de Responsabilidade Técnica'),
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

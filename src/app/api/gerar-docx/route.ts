// src/app/api/gerar-docx/route.ts
// AIMÊ — Converte o HTML de um documento (proposta, plano, laudo) em .docx editável para download

import { NextRequest, NextResponse } from 'next/server'
import HTMLtoDOCX from 'html-to-docx'
import JSZip from 'jszip'

export const runtime = 'nodejs'

// 1 cm ≈ 566.929 twips (unidade usada pelo Word para margens)
const CM = 566.929

// O html-to-docx gera arquivos com dois problemas que fazem o Word (de verdade,
// não o LibreOffice) recusar o arquivo:
// 1) O word/document.xml às vezes traz <w:sectPr> logo no início do <w:body> —
//    inválido no formato Word (sectPr só pode ser o ÚLTIMO elemento de body).
// 2) O zip inclui entradas de diretório explícitas (ex: "word/", "word/theme/"),
//    o que arquivos .docx genuínos do Word nunca têm — só as partes de arquivo.
// Aqui reescrevemos o pacote inteiro corrigindo os dois pontos.
// Constrói o rodapé como uma tabela borderless de 2 colunas: texto à esquerda/centro
// e número de página à direita, na mesma linha. Tabela é mais compatível entre
// Word/WPS/LibreOffice do que tabulações customizadas.
function montarFooterXml(rodape: string, larguraUtilTwips: number): string {
  const larguraCol1 = Math.round(larguraUtilTwips * 0.75)
  const larguraCol2 = larguraUtilTwips - larguraCol1
  const textoEscapado = (rodape ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="${larguraUtilTwips}" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="8" w:space="4" w:color="999999"/>
      </w:tblBorders>
      <w:tblLayout w:type="fixed"/>
    </w:tblPr>
    <w:tblGrid>
      <w:gridCol w:w="${larguraCol1}"/>
      <w:gridCol w:w="${larguraCol2}"/>
    </w:tblGrid>
    <w:tr>
      <w:tc>
        <w:tcPr><w:tcW w:w="${larguraCol1}" w:type="dxa"/></w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="0" w:lineRule="auto"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${textoEscapado}</w:t></w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${larguraCol2}" w:type="dxa"/></w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="0" w:lineRule="auto"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">Pág. </w:t></w:r>
          <w:fldSimple w:instr="PAGE"><w:r/></w:fldSimple>
        </w:p>
      </w:tc>
    </w:tr>
  </w:tbl>
</w:ftr>`
}

async function corrigirDocx(buffer: Buffer, rodape: string, larguraUtilTwips: number): Promise<Buffer> {
  const zipOrigem = await JSZip.loadAsync(buffer)
  const zipNovo = new JSZip()

  for (const [caminho, entrada] of Object.entries(zipOrigem.files)) {
    if (entrada.dir) continue // não recria entradas de diretório
    let conteudo = await entrada.async('nodebuffer')

    if (caminho === 'word/document.xml') {
      let docXml = conteudo.toString('utf-8')
      const m = docXml.match(/(<w:body>)(\s*<w:sectPr>[\s\S]*?<\/w:sectPr>)/)
      if (m) {
        docXml = docXml.replace(m[0], m[1])
        docXml = docXml.replace('</w:body>', m[2].trim() + '</w:body>')
      }
      // A biblioteca ignora "text-align" em itens de lista (<li>) — força
      // justificado em todo parágrafo com numeração (marcador/número de lista).
      docXml = docXml.replace(/<w:pPr>(\s*<w:numPr>)/g, '<w:pPr><w:jc w:val="both"/>$1')
      // A biblioteca ignora "margin"/"margin-top"/"margin-bottom" do CSS por completo —
      // só line-height é respeitado. Onde usamos line-height:1 (blocos que devem ficar
      // "colados", como destinatário, assinatura e lema), forçamos também before/after
      // zero direto no XML, senão o espaçamento padrão do Word aparece mesmo assim.
      docXml = docXml.replace(/<w:spacing w:line="240" w:lineRule="auto"\/>/g, '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>')
      // Exceção: a última linha do "lema" (frase em itálico) precisa de 6pt de
      // espaço depois, separando do parágrafo seguinte — não fica em zero como o resto.
      docXml = docXml.replace(
        /(<w:jc w:val="center"\/>\s*<w:spacing w:before="0" w:after=")0(" w:line="240" w:lineRule="auto"\/>\s*<\/w:pPr>\s*<w:r>\s*<w:rPr>\s*<w:i\/>\s*<\/w:rPr>\s*<w:t[^>]*>e customização)/,
        '$1120$2'
      )
      // Reduz o espaçamento e a altura das linhas dentro de tabelas: dentro de cada
      // célula (<w:tc>...</w:tc>), força before/after zero nos parágrafos que ainda
      // usam o espaçamento padrão do Word (sem afetar o texto corrido fora de tabelas).
      docXml = docXml.replace(/<w:tc>[\s\S]*?<\/w:tc>/g, (celula) =>
        celula.replace(/<w:spacing w:lineRule="auto"\/>/g, '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>')
      )
      conteudo = Buffer.from(docXml, 'utf-8')
    }

    // A biblioteca não converte "border" do CSS em parágrafos — inserimos a borda
    // (linha delimitadora entre cabeçalho e o texto) direto no XML, com
    // namespace autocontida (mesma convenção usada pelo Word de verdade).
    if (caminho === 'word/header1.xml') {
      let xml = conteudo.toString('utf-8')
      xml = xml.replace('<pPr>', '<pPr><w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:bottom w:val="single" w:sz="12" w:space="4" w:color="1E3A8A"/></w:pBdr>')
      conteudo = Buffer.from(xml, 'utf-8')
    }
    // Rodapé: substituído por completo por uma tabela (texto centralizado +
    // número de página à direita, mesma linha).
    if (caminho === 'word/footer1.xml') {
      conteudo = Buffer.from(montarFooterXml(rodape, larguraUtilTwips), 'utf-8')
    }

    zipNovo.file(caminho, conteudo, { createFolders: false })
  }

  return zipNovo.generateAsync({ type: 'nodebuffer' })
}

export async function POST(request: NextRequest) {
  try {
    const { html, cabecalho, rodape } = await request.json()
    if (!html) {
      return NextResponse.json({ erro: 'html é obrigatório' }, { status: 400 })
    }

    // Escapa < > & do cabeçalho antes de embutir no HTML — sem isso, um texto
    // livre digitado pelo inspetor (ex: algo como "<email@dominio>") pode ser
    // interpretado como uma tag inválida pelo analisador de HTML da biblioteca,
    // derrubando a geração do documento.
    const cabecalhoEscapado = (cabecalho ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const headerHTML = cabecalho ? `<p style="text-align:center;font-size:12pt;font-weight:bold">${cabecalhoEscapado}</p>` : undefined
    // O rodapé (texto + numeração) é montado à parte, direto em XML — ver montarFooterXml.
    const footerHTML = '<p></p>'

    const margemEsquerda = Math.round(2.5 * CM)
    const margemDireita = Math.round(2 * CM)
    const larguraUtilTwips = 12240 - margemEsquerda - margemDireita // Letter, em twips

    let bufferBruto
    try {
      bufferBruto = await HTMLtoDOCX(html, headerHTML, {
        table: { row: { cantSplit: true } },
        header: !!headerHTML,
        footer: true,
        pageNumber: false,
        font: 'Calibri Light',
        fontSize: 22, // 22 HIP = 11pt
        lang: 'pt-BR',
        margins: {
          top: Math.round(2.5 * CM),
          bottom: Math.round(2 * CM),
          left: margemEsquerda,
          right: margemDireita,
          header: Math.round(1.2 * CM),
          footer: Math.round(1.2 * CM),
          gutter: 0,
        },
      }, footerHTML)
    } catch (errGeracao) {
      return NextResponse.json({ erro: `[etapa: geracao-inicial] ${String(errGeracao)}` }, { status: 500 })
    }

    let bufferCorrigido
    try {
      bufferCorrigido = await corrigirDocx(bufferBruto as Buffer, rodape ?? '', larguraUtilTwips)
    } catch (errCorrecao) {
      return NextResponse.json({ erro: `[etapa: pos-processamento] ${String(errCorrecao)}` }, { status: 500 })
    }

    // Cópia explícita do buffer: Buffer do Node pode referenciar um bloco de
    // memória maior (pool) do que o conteúdo real — sem copiar, o arquivo
    // devolvido pode sair com bytes a mais/errados.
    const bytes = new Uint8Array(bufferCorrigido)

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="documento.docx"',
      },
    })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

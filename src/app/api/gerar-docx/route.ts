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
// Constrói o rodapé com tabulações do Word: texto centralizado e número de
// página alinhado à direita, na mesma linha — a biblioteca não suporta isso
// via HTML/CSS, então montamos o XML do rodapé diretamente.
function montarFooterXml(rodape: string, margemEsquerdaTwips: number, margemDireitaTwips: number): string {
  const larguraPagina = 12240 // Letter, em twips
  const larguraUtil = larguraPagina - margemEsquerdaTwips - margemDireitaTwips
  const tabCentro = Math.round(larguraUtil / 2)
  const tabDireita = larguraUtil
  const textoEscapado = (rodape ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr><w:top w:val="single" w:sz="8" w:space="4" w:color="999999"/></w:pBdr>
      <w:tabs>
        <w:tab w:val="center" w:pos="${tabCentro}"/>
        <w:tab w:val="right" w:pos="${tabDireita}"/>
      </w:tabs>
      <w:spacing w:lineRule="auto"/>
    </w:pPr>
    <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:tab/><w:t xml:space="preserve">${textoEscapado}</w:t><w:tab/></w:r>
    <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">Pág. </w:t></w:r>
    <w:fldSimple w:instr="PAGE"><w:r/></w:fldSimple>
  </w:p>
</w:ftr>`
}

async function corrigirDocx(buffer: Buffer, rodape: string, margemEsquerdaTwips: number, margemDireitaTwips: number): Promise<Buffer> {
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
        conteudo = Buffer.from(docXml, 'utf-8')
      }
    }

    // A biblioteca não converte "border" do CSS em parágrafos — inserimos a borda
    // (linha delimitadora entre cabeçalho e o texto) direto no XML, com
    // namespace autocontida (mesma convenção usada pelo Word de verdade).
    if (caminho === 'word/header1.xml') {
      let xml = conteudo.toString('utf-8')
      xml = xml.replace('<pPr>', '<pPr><w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:bottom w:val="single" w:sz="12" w:space="4" w:color="1E3A8A"/></w:pBdr>')
      conteudo = Buffer.from(xml, 'utf-8')
    }
    // Rodapé: substituído por completo por um XML com tabulações (texto
    // centralizado + número de página à direita, mesma linha).
    if (caminho === 'word/footer1.xml') {
      conteudo = Buffer.from(montarFooterXml(rodape, margemEsquerdaTwips, margemDireitaTwips), 'utf-8')
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

    const headerHTML = cabecalho ? `<p style="text-align:center;font-size:12pt;font-weight:bold">${cabecalho}</p>` : undefined
    // O rodapé (texto + numeração) é montado à parte, direto em XML — ver montarFooterXml.
    const footerHTML = '<p></p>'

    const margemEsquerda = Math.round(2.5 * CM)
    const margemDireita = Math.round(2 * CM)

    const bufferBruto = await HTMLtoDOCX(html, headerHTML, {
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

    const bufferCorrigido = await corrigirDocx(bufferBruto as Buffer, rodape ?? '', margemEsquerda, margemDireita)

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

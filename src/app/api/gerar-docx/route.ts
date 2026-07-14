// src/app/api/gerar-docx/route.ts
// AIMÊ — Converte o HTML de um documento (proposta, plano, laudo) em .docx editável para download

import { NextRequest, NextResponse } from 'next/server'
import HTMLtoDOCX from 'html-to-docx'
import JSZip from 'jszip'

export const runtime = 'nodejs'

// 1 cm ≈ 566.929 twips (unidade usada pelo Word para margens)
const CM = 566.929

// O html-to-docx, para alguns conteúdos, gera o word/document.xml com o elemento
// <w:sectPr> logo no início do <w:body> — o que é inválido no formato Word (sectPr
// só pode ser o ÚLTIMO elemento de body) e faz o Word recusar o arquivo como
// "conteúdo ilegível". Aqui corrigimos isso reescrevendo o .docx: movemos o sectPr
// para o final do documento antes de devolver o arquivo.
async function corrigirPosicaoSectPr(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer)
  const arquivo = zip.file('word/document.xml')
  if (!arquivo) return buffer

  let docXml = await arquivo.async('string')
  const m = docXml.match(/(<w:body>)(\s*<w:sectPr>[\s\S]*?<\/w:sectPr>)/)
  if (m) {
    docXml = docXml.replace(m[0], m[1])
    docXml = docXml.replace('</w:body>', m[2].trim() + '</w:body>')
    zip.file('word/document.xml', docXml)
    return zip.generateAsync({ type: 'nodebuffer' })
  }
  return buffer
}

export async function POST(request: NextRequest) {
  try {
    const { html, cabecalho, rodape } = await request.json()
    if (!html) {
      return NextResponse.json({ erro: 'html é obrigatório' }, { status: 400 })
    }

    const headerHTML = cabecalho ? `<p style="text-align:center;font-size:12pt;font-weight:bold">${cabecalho}</p>` : undefined
    // Primeiro parágrafo (alinhado à direita) recebe o campo de número de página automático
    // do Word; o texto do rodapé vai num segundo parágrafo, centralizado, abaixo dele.
    const footerHTML =
      `<p style="text-align:right;font-size:10pt">Pág. </p>` +
      (rodape ? `<p style="text-align:center;font-size:10pt">${rodape}</p>` : '')

    const bufferBruto = await HTMLtoDOCX(html, headerHTML, {
      table: { row: { cantSplit: true } },
      header: !!headerHTML,
      footer: true,
      pageNumber: true,
      margins: {
        top: Math.round(2 * CM),
        bottom: Math.round(2 * CM),
        left: Math.round(2.5 * CM),
        right: Math.round(2 * CM),
        header: 200,
        footer: 200,
        gutter: 0,
      },
    }, footerHTML)

    const bufferCorrigido = await corrigirPosicaoSectPr(bufferBruto as Buffer)

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

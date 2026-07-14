// src/app/api/gerar-docx/route.ts
// AIMÊ — Converte o HTML de um documento (proposta, plano, laudo) em .docx editável para download

import { NextRequest, NextResponse } from 'next/server'
import HTMLtoDOCX from 'html-to-docx'

export const runtime = 'nodejs'

// 1 cm ≈ 566.929 twips (unidade usada pelo Word para margens)
const CM = 566.929

export async function POST(request: NextRequest) {
  try {
    const { html, cabecalho, rodape } = await request.json()
    if (!html) {
      return NextResponse.json({ erro: 'html é obrigatório' }, { status: 400 })
    }

    const headerHTML = cabecalho ? `<p style="text-align:center;font-size:10pt">${cabecalho}</p>` : undefined
    const footerHTML = rodape ? `<p style="text-align:center;font-size:10pt">${rodape}</p>` : undefined

    const buffer = await HTMLtoDOCX(html, headerHTML, {
      table: { row: { cantSplit: true } },
      header: !!headerHTML,
      footer: !!footerHTML,
      pageNumber: false,
      margins: {
        top: Math.round(2 * CM),
        bottom: Math.round(2 * CM),
        left: Math.round(2.5 * CM),
        right: Math.round(2 * CM),
        header: 480,
        footer: 480,
        gutter: 0,
      },
    }, footerHTML)

    // Cópia explícita do buffer: Buffer do Node pode referenciar um bloco de
    // memória maior (pool) do que o conteúdo real — sem copiar, o arquivo
    // devolvido pode sair com bytes a mais/errados (Word acusa "conteúdo ilegível").
    const bytes = new Uint8Array(buffer as Buffer)

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="documento.docx"',
        'Content-Length': String(bytes.byteLength),
      },
    })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

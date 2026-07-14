// src/app/api/gerar-docx/route.ts
// AIMÊ — Converte o HTML de um documento (proposta, plano, laudo) em .docx editável para download

import { NextRequest, NextResponse } from 'next/server'
import HTMLtoDOCX from 'html-to-docx'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { html } = await request.json()
    if (!html) {
      return NextResponse.json({ erro: 'html é obrigatório' }, { status: 400 })
    }

    const buffer = await HTMLtoDOCX(html, undefined, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    })

    return new NextResponse(buffer as Buffer, {
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

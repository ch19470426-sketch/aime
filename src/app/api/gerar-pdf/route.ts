// src/app/api/gerar-pdf/route.ts
// AIMÊ — Converte o HTML de um documento (proposta, plano, laudo) em PDF para download.
// Usa @sparticuz/chromium + puppeteer-core (Chromium empacotado para ambiente serverless).

import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  let browser
  try {
    const { html, nomeArquivo } = await request.json()
    if (!html) {
      return NextResponse.json({ erro: 'html é obrigatório' }, { status: 400 })
    }

    const executablePath = await chromium.executablePath()
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
    })

    const nome = (nomeArquivo ?? 'documento').replace(/\.(html|json)$/i, '')
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nome}.pdf"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  } finally {
    if (browser) await browser.close()
  }
}

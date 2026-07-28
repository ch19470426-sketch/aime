// src/app/api/gerar-laudo-pdf/route.ts
// AIMÊ — Converte HTML do laudo em PDF via Puppeteer + Chromium

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { nomeArquivo } = await request.json()

    if (!nomeArquivo)
      return NextResponse.json({ erro: 'nomeArquivo obrigatório.' }, { status: 400 })

    // Baixar o HTML do storage
    const { data: blob, error } = await supabase.storage
      .from('aime')
      .download(`documentos_inspetor/${nomeArquivo}`)

    if (error || !blob)
      return NextResponse.json({ erro: 'HTML não encontrado.' }, { status: 404 })

    const html = await blob.text()

    // Injetar CSS de impressão A4 antes de converter
    const htmlFinal = html.replace(
      '</head>',
      `<style>
        @page { size: A4; margin: 25mm 20mm 20mm 25mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      </style></head>`
    )

    // Inicializar Puppeteer com Chromium
    const chromium = (await import('@sparticuz/chromium-min')).default
    const puppeteer = (await import('puppeteer-core')).default

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
      ),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(htmlFinal, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '25mm', right: '20mm', bottom: '20mm', left: '25mm' },
    })

    await browser.close()

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo.replace('.html', '.pdf')}"`,
      },
    })

  } catch (err: any) {
    console.error('gerar-laudo-pdf:', err)
    return NextResponse.json({ erro: String(err?.message ?? err) }, { status: 500 })
  }
}

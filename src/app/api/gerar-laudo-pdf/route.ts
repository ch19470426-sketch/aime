// src/app/api/gerar-laudo-pdf/route.ts
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

    // Baixar HTML do storage
    const { data: blob, error } = await supabase.storage
      .from('aime')
      .download(`documentos_inspetor/${nomeArquivo}`)
    if (error || !blob)
      return NextResponse.json({ erro: 'HTML não encontrado.' }, { status: 404 })

    const html = await blob.text()

    // Garantir CSS A4 com margens corretas
    const htmlFinal = html.includes('@page')
      ? html
      : html.replace(
          '</head>',
          `<style>
            @page { size: A4; margin: 25mm 20mm 20mm 25mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          </style></head>`
        )

    // Chromium via @sparticuz/chromium (bundlado, sem dependências do sistema)
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default

    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    try {
      const page = await browser.newPage()
      await page.setContent(htmlFinal, { waitUntil: 'networkidle0', timeout: 30000 })
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        // Margens controladas pelo @page no CSS — não passar aqui para não sobrescrever
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${nomeArquivo.replace(/\.html$/i, '.pdf')}"`,
        },
      })
    } finally {
      await browser.close()
    }

  } catch (err: any) {
    console.error('gerar-laudo-pdf:', err)
    return NextResponse.json({ erro: String(err?.message ?? err) }, { status: 500 })
  }
}

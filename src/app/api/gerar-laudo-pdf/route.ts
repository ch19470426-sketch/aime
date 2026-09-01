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
    const { nomeArquivo, html: htmlDireto } = await request.json()
    if (!nomeArquivo)
      return NextResponse.json({ erro: 'nomeArquivo obrigatório.' }, { status: 400 })

    let html: string
    if (htmlDireto) {
      // HTML enviado diretamente (ex: com edições do usuário na tela) — usa sem buscar do Storage
      html = htmlDireto
    } else {
      // Baixar HTML do storage
      const { data: blob, error } = await supabase.storage
        .from('aime')
        .download(`documentos_inspetor/${nomeArquivo}`)
      if (error || !blob)
        return NextResponse.json({ erro: 'HTML não encontrado.' }, { status: 404 })
      html = await blob.text()
    }

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
      // @sparticuz/chromium v149+: headless e defaultViewport não são mais
      // propriedades expostas — o modo headless já vem embutido em chromium.args
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      executablePath: await chromium.executablePath(),
    })

    try {
      const page = await browser.newPage()
      await page.setContent(htmlFinal, { waitUntil: 'networkidle0', timeout: 30000 })
      const pdf = await page.pdf({
        // preferCSSPageSize: true é OBRIGATÓRIO para o Puppeteer respeitar as
        // regras @page do CSS (inclusive @page :first). Sem isso, TODAS as
        // regras @page são silenciosamente ignoradas e só valem format/margin
        // abaixo — foi isso que impediu todas as correções de capa até agora.
        preferCSSPageSize: true,
        format: 'A4',
        printBackground: true,
        // Sem margin aqui — o @page CSS do HTML controla tudo (agora que
        // preferCSSPageSize está ativado).
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

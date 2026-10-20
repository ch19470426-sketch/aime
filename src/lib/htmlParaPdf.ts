// src/lib/htmlParaPdf.ts
// AIMÊ — PDF A4 a partir de HTML, com o Chromium embutido (@sparticuz/chromium + puppeteer-core), o mesmo dos PDFs do laudo e do plano de manutenção.
// Só no servidor. O Chromium pode levar 20 a 40 s para acordar: quem chama não deve deixar o usuário esperando por isto.

export interface OpcoesPdf {
  /** texto fixo no alto de TODAS as páginas */
  cabecalho?: string
  /** texto fixo no pé de TODAS as páginas, com a numeração */
  rodape?: string
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function htmlParaPdf(html: string, opcoes: OpcoesPdf = {}): Promise<Buffer> {
  const chromium = (await import('@sparticuz/chromium')).default
  const puppeteer = (await import('puppeteer-core')).default
  let browser: any = null
  try {
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: await chromium.executablePath(),
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 })
    const comMoldura = !!(opcoes.cabecalho || opcoes.rodape)
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: comMoldura,
      headerTemplate: `<div style="width:100%;font:bold 8pt Arial,sans-serif;text-align:center;padding:0 20mm 2px;"><div style="border-bottom:1px solid #000;padding-bottom:3px">${escapar(opcoes.cabecalho ?? '')}</div></div>`,
      footerTemplate: `<div style="width:100%;font:7pt Arial,sans-serif;color:#333;text-align:center;padding:0 20mm;"><div style="border-top:1px solid #000;padding-top:3px">${escapar(opcoes.rodape ?? '')} &nbsp;|&nbsp; <span class="pageNumber"></span>/<span class="totalPages"></span></div></div>`,
      margin: { top: '22mm', bottom: '20mm', left: '20mm', right: '20mm' },
    })
    return Buffer.from(pdf)
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

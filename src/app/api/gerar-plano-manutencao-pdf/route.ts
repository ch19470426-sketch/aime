// src/app/api/gerar-plano-manutencao-pdf/route.ts
//
// Geração de PDF do plano de manutenção em DUAS PASSAGENS, para que o índice
// mostre o número de página REAL de cada seção, em vez do número fixo
// estimado (histórico) usado em todos os outros documentos.
//
// Como funciona:
//   1ª passagem — gera o HTML com os números estimados (mesmo comportamento
//   de sempre) e renderiza em PDF.
//   Extrai o texto de cada página do PDF gerado e localiza em qual página
//   cada seção do índice realmente começa (buscando pelo número da seção,
//   ex: "2.-", que é estável mesmo quando o texto do título varia levemente
//   entre índice e corpo — maiúsculas, pontuação, etc.).
//   2ª passagem — gera o HTML de novo, agora com os números REAIS, e
//   renderiza o PDF final. Reaproveita o MESMO navegador Chromium já aberto
//   (só a etapa de lançar o Chromium é lenta — as duas passagens de
//   renderização em si são rápidas), então o custo adicional é pequeno.
//
// SEGURANÇA: se a extração de página real falhar por qualquer motivo (seção
// não encontrada, erro ao ler o PDF, etc.), cai de volta para o resultado da
// 1ª passagem (números estimados) — o documento SEMPRE é gerado com sucesso,
// na pior das hipóteses com a mesma precisão que já existia antes.
//
// REVERSÃO: para voltar ao comportamento anterior (só uma passagem, número
// estimado), no cliente (src/app/plano-manutencao/inner.tsx) basta trocar a
// chamada de volta para '/api/gerar-laudo-pdf' como era antes — nenhuma
// outra mudança é necessária, esta rota é adicional e não substitui nada.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'

async function extrairTextoPorPagina(pdfBuffer: Uint8Array): Promise<string[]> {
  // pdf-parse@1.1.1 (versão fixa, testada) — versões mais novas mudaram a API
  // por completo, e pdfjs-dist puro exige um "worker" que não fica acessível
  // no bundle serverless da Vercel ("Cannot find module .../pdf.worker.mjs").
  // Essa versão usa pdfjs-dist internamente em modo compatível com Node.js
  // puro, sem essa dependência.
  // Importar do arquivo interno diretamente (não do índice do pacote) —
  // pdf-parse@1.1.1 tem um código de debug no index.js que roda incorretamente
  // ao ser importado em certos contextos, tentando ler um arquivo de teste
  // que não existe ("./test/data/05-versions-space.pdf"). Testado e
  // confirmado isoladamente antes de aplicar aqui.
  const pdfParseMod = await import('pdf-parse/lib/pdf-parse.js')
  const pdfParse = (pdfParseMod as any).default ?? pdfParseMod
  const paginas: string[] = []
  await (pdfParse as any)(Buffer.from(pdfBuffer), {
    pagerender: async (pageData: any) => {
      const content = await pageData.getTextContent()
      const texto = content.items.map((it: any) => it.str).join(' ')
      paginas.push(texto)
      return texto
    }
  })
  return paginas
}

// Índice espelhado do usado em gerar-plano-manutencao/route.ts — número e um
// trecho do título (mínimo de palavras suficiente para ser específico, sem
// depender de bater exatamente maiúsculas/pontuação com o corpo do
// documento). Precisa ficar em sincronia manualmente (lista pequena e
// estável, risco baixo).
const INDICE_ITENS = [
  { n: '1.',      t: 'Considerações Preliminares' },
  { n: '1.1.-',   t: 'Identificação da Edificação' },
  { n: '1.2.-',   t: 'Ativos para Manutenção' },
  { n: '2.',      t: 'Objetivos' },
  { n: '3.',      t: 'Base normativa' },
  { n: '4.',      t: 'Responsabilidade da Contratada' },
  { n: '5.',      t: 'Exigências Mínimas' },
  { n: '5.1.-',   t: 'Planejamento' },
  { n: '5.2.-',   t: 'Segurança' },
  { n: '5.3.-',   t: 'Recursos' },
  { n: '5.4.-',   t: 'Execução' },
  { n: '6.',      t: 'Recebimento dos Serviços' },
  { n: '7.',      t: 'Apresentação da Proposta' },
  { n: '8.',      t: 'Critérios para Priorização' },
  { n: '9.',      t: 'Controle da Execução' },
  { n: '10.',     t: 'Considerações Finais' },
  { n: 'Anexo 1', t: 'Plano Executivo' },
]
const INDICE_NUMEROS = INDICE_ITENS.map(it => it.n)

function descobrirPaginasReais(paginas: string[]): Record<string, string> {
  const pagsReais: Record<string, string> = {}
  // A própria página do índice lista todos os números das seções (ex: "1.
  // Considerações Preliminares 3") — buscando desde a página 1, a primeira
  // ocorrência encontrada era sempre essa listagem do índice, não a seção de
  // verdade. Pula a primeira página (onde fica o índice) antes de buscar.
  const primeiraPaginaDeConteudo = 1
  for (const { n: numero, t: titulo } of INDICE_ITENS) {
    const numEscapado = numero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Escapa o início do título e usa só as primeiras ~15 letras — específico
    // o bastante para não bater em texto aleatório, tolerante a diferenças de
    // pontuação/maiúsculas depois desse trecho.
    const tituloEscapado = titulo.slice(0, 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(numEscapado + '\\s*[-–]?\\s*' + tituloEscapado, 'i')
    for (let i = primeiraPaginaDeConteudo; i < paginas.length; i++) {
      if (re.test(paginas[i])) {
        pagsReais[numero] = String(i + 1)
        break
      }
    }
  }
  return pagsReais
}

// Reescreve, dentro do HTML já pronto, o número de página de cada linha do
// índice — localizando cada linha pelo número da seção (primeiro <span>,
// ex: "2."), que é estável, e substituindo só o conteúdo do último <span>
// daquela linha (o número da página) pelo valor real descoberto.
function corrigirIndiceNoHtml(html: string, pagsReais: Record<string, string>): string {
  let novoHtml = html
  for (const [numero, pagina] of Object.entries(pagsReais)) {
    const numeroEscapado = numero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(
      `(<span style="min-width:40pt;flex-shrink:0;color:#000">${numeroEscapado}</span><span style="flex:1;color:#000">[^<]*</span><span style="min-width:24pt;text-align:right;color:#000">)[^<]*(</span>)`
    )
    if (re.test(novoHtml)) {
      novoHtml = novoHtml.replace(re, `$1${pagina}$2`)
    }
  }
  return novoHtml
}

export async function POST(request: NextRequest) {
  const { nomeArquivo, html: htmlPass1 } = await request.json()
  if (!nomeArquivo || !htmlPass1)
    return NextResponse.json({ erro: 'nomeArquivo e html são obrigatórios.' }, { status: 400 })

  const chromium = (await import('@sparticuz/chromium')).default
  const puppeteer = (await import('puppeteer-core')).default

  let browser: any = null
  try {
    console.log('[gerar-plano-manutencao-pdf] iniciando browser...')
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: await chromium.executablePath(),
    })
    const page = await browser.newPage()

    // ── 1ª passagem: renderiza o HTML recebido tal como está (números
    //    estimados, mesmo comportamento de sempre) ─────────────────────────
    await page.setContent(htmlPass1, { waitUntil: 'load', timeout: 90000 })
    const pdfPass1 = await page.pdf({ preferCSSPageSize: true, format: 'A4', printBackground: true })
    console.log('[gerar-plano-manutencao-pdf] 1ª passagem ok, tamanho:', pdfPass1.length)

    // ── Descobrir páginas reais e regenerar só o índice, dentro do MESMO
    //    HTML recebido (preserva qualquer edição feita na tela) ────────────
    let pdfFinal = pdfPass1
    let indiceCorrigido = false
    let diagnostico = ''
    try {
      const paginas = await extrairTextoPorPagina(new Uint8Array(pdfPass1))
      const pagsReais = descobrirPaginasReais(paginas)
      const naoEncontrados = INDICE_NUMEROS.filter(n => !pagsReais[n])
      diagnostico = `total_paginas=${paginas.length}; encontrados=${JSON.stringify(pagsReais)}; nao_encontrados=${JSON.stringify(naoEncontrados)}`
      // Só prossegue para a 2ª passagem se TODAS as seções foram localizadas
      // — parcial poderia deixar o índice pior (mistura de números reais e
      // estimados de forma inconsistente) do que ficar só com o estimado.
      if (naoEncontrados.length === 0) {
        const htmlPass2 = corrigirIndiceNoHtml(htmlPass1, pagsReais)
        await page.setContent(htmlPass2, { waitUntil: 'load', timeout: 90000 })
        const pdfPass2 = await page.pdf({ preferCSSPageSize: true, format: 'A4', printBackground: true })
        pdfFinal = pdfPass2
        indiceCorrigido = true
        console.log('[gerar-plano-manutencao-pdf] 2ª passagem ok (índice corrigido), tamanho:', pdfPass2.length)
      } else {
        console.log('[gerar-plano-manutencao-pdf] nem todas as seções localizadas:', diagnostico)
      }
    } catch (e) {
      diagnostico = 'ERRO: ' + String(e)
      console.error('[gerar-plano-manutencao-pdf] falha ao tentar corrigir índice, mantendo estimativa:', e)
    }

    const assinaturaValida = pdfFinal.length > 1000 &&
      pdfFinal[0] === 0x25 && pdfFinal[1] === 0x50 && pdfFinal[2] === 0x44 && pdfFinal[3] === 0x46 && pdfFinal[4] === 0x2D
    if (!assinaturaValida) {
      return NextResponse.json({ erro: 'A geração do PDF falhou internamente (documento inválido/corrompido).' }, { status: 500 })
    }

    return new NextResponse(pdfFinal, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo.replace(/\.html$/i, '.pdf')}"`,
        'Content-Length': String(pdfFinal.length),
        'X-Indice-Corrigido': String(indiceCorrigido),
        'X-Indice-Diagnostico': encodeURIComponent(diagnostico),
      },
    })
  } catch (err: any) {
    console.error('gerar-plano-manutencao-pdf:', err)
    return NextResponse.json({ erro: String(err?.message ?? err) }, { status: 500 })
  } finally {
    if (browser) await browser.close()
  }
}

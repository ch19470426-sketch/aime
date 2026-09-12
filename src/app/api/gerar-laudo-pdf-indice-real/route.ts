// src/app/api/gerar-laudo-pdf-indice-real/route.ts
//
// Mesma técnica de duas passagens já validada em gerar-plano-manutencao-pdf,
// adaptada para o laudo (estrutura de índice mais complexa: dois caminhos —
// NR e predial — com títulos dinâmicos). Em vez de duplicar a lista de itens
// do índice (arriscado ficar desatualizado, já que os títulos mudam
// conforme o tipo de serviço), os itens são extraídos DIRETAMENTE do HTML
// recebido, que já contém a estrutura <div class="indice-item"> com o
// número e o título de cada seção — funciona para qualquer um dos dois
// caminhos, sem precisar saber qual foi usado.
//
// Aprendizados da tentativa anterior (plano de manutenção), já aplicados
// aqui desde o início:
//   - Pular capa E a página do índice em si (não só a capa) — a listagem do
//     índice contém todos os números de seção, confundindo a busca.
//   - O rodapé do documento numera as páginas com deslocamento -1 em
//     relação à posição no array de páginas extraídas.
//   - Buscar por número + início do título (não só o número sozinho) —
//     números soltos no meio do texto (datas, contagens) geram falsos
//     positivos.
//
// SEGURANÇA: se qualquer seção não for localizada, mantém o PDF da 1ª
// passagem (números estimados) — nunca quebra a geração por causa disso.
//
// REVERSÃO: no cliente (src/app/laudo/page.tsx ou similar), trocar a chamada
// de volta para '/api/gerar-laudo-pdf' — esta rota é adicional, não
// substitui nada.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 300s (5min), acima dos 120s da rota original de passagem unica — laudos
// grandes (ate ~200 fotos) processados em DUAS passagens (renderiza duas
// vezes) precisam de mais margem. O botao na tela continua mostrando "ate 2
// min" para o usuario (mensagem separada, nao ligada a este valor) — a
// maioria dos laudos deve terminar bem dentro disso; este e so o teto de
// seguranca para os casos maiores.
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function extrairTextoPorPagina(pdfBuffer: Uint8Array): Promise<string[]> {
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

interface ItemIndice { numero: string; titulo: string }

// Extrai os itens do índice diretamente do HTML recebido — número e título
// de cada <div class="indice-item">, na ordem em que aparecem.
function extrairItensIndiceDoHtml(html: string): ItemIndice[] {
  const itens: ItemIndice[] = []
  const re = /<span class="indice-num">([^<]*)<\/span><span[^>]*>([^<]*)<\/span>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const numero = m[1].trim()
    const titulo = m[2].trim()
    if (numero && titulo) itens.push({ numero, titulo })
  }
  return itens
}

function descobrirPaginasReais(paginas: string[], itens: ItemIndice[]): Record<string, string> {
  const pagsReais: Record<string, string> = {}
  // Página 1 = capa, página 2 = o índice em si (lista todos os números) —
  // pula as duas antes de buscar a seção de verdade.
  const primeiraPaginaDeConteudo = 2
  for (const { numero, titulo } of itens) {
    const numEscapado = numero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const tituloEscapado = titulo.slice(0, 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(numEscapado + '\\s*[-–]?\\s*' + tituloEscapado, 'i')
    // Itens "Anexo N" costumam ser citados antes, numa lista dentro da seção
    // 7.1 (ex: "Anexo 2 – Resultado da Vistoria;"), e só têm seu título real
    // (a seção em si) bem mais adiante — usar a ÚLTIMA ocorrência evita
    // pegar essa citação em vez do cabeçalho de verdade. Para as demais
    // seções numeradas (1., 2.1.-, etc.) a primeira ocorrência já é a certa.
    const usarUltimaOcorrencia = /^anexo\s/i.test(numero)
    let paginaEncontrada: number | null = null
    for (let i = primeiraPaginaDeConteudo; i < paginas.length; i++) {
      if (re.test(paginas[i])) {
        paginaEncontrada = i
        if (!usarUltimaOcorrencia) break
      }
    }
    if (paginaEncontrada !== null) {
      // Deslocamento -1 confirmado com dados reais no plano de manutenção
      // — o rodapé do documento numera a partir da 2ª página do array.
      pagsReais[numero] = String(paginaEncontrada)
    }
  }
  return pagsReais
}

// Reescreve, dentro do HTML já pronto, o número de página de cada linha do
// índice — pela estrutura específica do laudo (indice-num + título +
// indice-dots + página), diferente da estrutura do plano de manutenção.
function corrigirIndiceNoHtml(html: string, pagsReais: Record<string, string>): string {
  let novoHtml = html
  for (const [numero, pagina] of Object.entries(pagsReais)) {
    const numeroEscapado = numero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(
      `(<span class="indice-num">${numeroEscapado}</span><span[^>]*>[^<]*</span><span class="indice-dots"></span><span[^>]*>)[^<]*(</span>)`
    )
    if (re.test(novoHtml)) {
      novoHtml = novoHtml.replace(re, `$1${pagina}$2`)
    }
  }
  return novoHtml
}

export async function POST(request: NextRequest) {
  const { nomeArquivo, html: htmlDireto, htmlSemFotos } = await request.json()
  if (!nomeArquivo)
    return NextResponse.json({ erro: 'nomeArquivo obrigatório.' }, { status: 400 })

  let htmlPass1: string
  if (htmlSemFotos) {
    // Mesma lógica de gerar-laudo-pdf: o cliente remove as fotos (base64) do
    // HTML editado para não estourar o limite de tamanho da requisição — o
    // servidor busca o HTML original salvo no Storage, extrai as fotos na
    // ordem em que aparecem e reinsere nos placeholders.
    const { data: blobOriginal, error: errOriginal } = await supabase.storage
      .from('aime')
      .download(`documentos_inspetor/${nomeArquivo}`)
    if (errOriginal || !blobOriginal)
      return NextResponse.json({ erro: 'HTML original não encontrado para mesclar fotos.' }, { status: 404 })
    const htmlOriginal = await blobOriginal.text()
    const fotosOriginais = [...htmlOriginal.matchAll(/src="(data:image\/[^"]+)"/g)].map(m => m[1])
    htmlPass1 = htmlSemFotos.replace(/src="PLACEHOLDER_FOTO_(\d+)"/g, (_m: string, idxStr: string) => {
      const foto = fotosOriginais[Number(idxStr)]
      return foto ? `src="${foto}"` : `src=""`
    })
  } else if (htmlDireto) {
    htmlPass1 = htmlDireto
  } else {
    return NextResponse.json({ erro: 'html ou htmlSemFotos são obrigatórios.' }, { status: 400 })
  }

  const itens = extrairItensIndiceDoHtml(htmlPass1)

  // Garantir CSS A4 com margens corretas (mesma lógica de gerar-laudo-pdf)
  htmlPass1 = htmlPass1.includes('@page')
    ? htmlPass1
    : htmlPass1.replace(
        '</head>',
        `<style>
          @page { size: A4; margin: 25mm 20mm 20mm 25mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        </style></head>`
      )

  const chromium = (await import('@sparticuz/chromium')).default
  const puppeteer = (await import('puppeteer-core')).default

  let browser: any = null
  try {
    console.log('[gerar-laudo-pdf-indice-real] iniciando browser... itens do índice encontrados:', itens.length)
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: await chromium.executablePath(),
    })
    const page = await browser.newPage()

    await page.setContent(htmlPass1, { waitUntil: 'load', timeout: 90000 })
    const pdfPass1 = await page.pdf({ preferCSSPageSize: true, format: 'A4', printBackground: true })
    console.log('[gerar-laudo-pdf-indice-real] 1ª passagem ok, tamanho:', pdfPass1.length)

    let pdfFinal = pdfPass1
    let indiceCorrigido = false
    let diagnostico = ''
    try {
      if (itens.length > 0) {
        const paginas = await extrairTextoPorPagina(new Uint8Array(pdfPass1))
        const pagsReais = descobrirPaginasReais(paginas, itens)
        const naoEncontrados = itens.filter(it => !pagsReais[it.numero]).map(it => it.numero)
        diagnostico = `total_paginas=${paginas.length}; nao_encontrados=${JSON.stringify(naoEncontrados)}`
        // Só prossegue se TODAS as seções foram localizadas — parcial seria
        // pior (mistura inconsistente) do que manter só o estimado.
        if (naoEncontrados.length === 0) {
          const htmlPass2 = corrigirIndiceNoHtml(htmlPass1, pagsReais)
          await page.setContent(htmlPass2, { waitUntil: 'load', timeout: 90000 })
          const pdfPass2 = await page.pdf({ preferCSSPageSize: true, format: 'A4', printBackground: true })
          pdfFinal = pdfPass2
          indiceCorrigido = true
          console.log('[gerar-laudo-pdf-indice-real] 2ª passagem ok (índice corrigido), tamanho:', pdfPass2.length)
        } else {
          console.log('[gerar-laudo-pdf-indice-real] nem todas as seções localizadas:', JSON.stringify(naoEncontrados))
        }
      } else {
        console.log('[gerar-laudo-pdf-indice-real] nenhum item de índice encontrado no HTML — mantendo estimativa')
      }
    } catch (e) {
      console.error('[gerar-laudo-pdf-indice-real] falha ao tentar corrigir índice, mantendo estimativa:', e)
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
    console.error('gerar-laudo-pdf-indice-real:', err)
    return NextResponse.json({ erro: String(err?.message ?? err) }, { status: 500 })
  } finally {
    if (browser) await browser.close()
  }
}

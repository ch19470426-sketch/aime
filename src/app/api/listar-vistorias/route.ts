// src/app/api/listar-vistorias/route.ts
// Lista NCs — suporta AIME-NC-DATA (novo) e parsing HTML (arquivos antigos)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LAUDO_PARA_VISTORIA: Record<string,string> = {
  '41':'31','42':'32','43':'33','44':'34',
  '45':'35','46':'36','47':'37','48':'38',
}

// Extrai texto de <label>X</label><span>Y</span> no HTML do formulário homologado
function extrairCampo(html: string, label: string): string {
  const re = new RegExp(`<label[^>]*>[^<]*${label}[^<]*</label>\\s*<span[^>]*>([^<]*)</span>`, 'i')
  const m = html.match(re)
  return m?.[1]?.trim() ?? ''
}

// Extrai src da imagem (foto da NC)
function extrairFoto(html: string): string {
  const m = html.match(/<img[^>]+src="(data:image[^"]+)"/)
  return m?.[1] ?? ''
}

// Parseia HTML antigo do formulário homologado extraindo todos os campos
function parsearHtmlHomologado(html: string, arquivo: string): any {
  return {
    arquivo,
    sistema:    extrairCampo(html, 'Sistema'),
    subsistema: extrairCampo(html, 'Subsistema'),
    anomalia:   extrairCampo(html, 'Anomalia') || extrairCampo(html, 'Não conformidade') || extrairCampo(html, 'NC'),
    origem:     extrairCampo(html, 'Origem') || extrairCampo(html, 'Resultado'),
    local:      extrairCampo(html, 'Local'),
    complemento:extrairCampo(html, 'Complemento'),
    grauRisco:  extrairCampo(html, 'Grau de Risco') || extrairCampo(html, 'Grau Risco') || extrairCampo(html, 'GR'),
    prioridade: extrairCampo(html, 'Prioridade'),
    fotoNr:     extrairCampo(html, 'Foto') || extrairCampo(html, 'Nº Foto') || arquivo.match(/(\d+)\.html$/)?.[1] || '',
    dataVistoria:extrairCampo(html, 'Data'),
    nc:         extrairCampo(html, 'Descrição') || extrairCampo(html, 'NC'),
    cp:         extrairCampo(html, 'Causa') || extrairCampo(html, 'CP'),
    fotoBase64: extrairFoto(html),
    _fonte: 'html_parsed',
  }
}

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const chaveInspetor = p.get('chave_inspetor') ?? ''
  const cnpjoucpf     = p.get('cnpjoucpf')      ?? ''
  const tipoServico   = p.get('tipo_servico')    ?? ''
  const comFoto       = p.get('com_foto') === '1' // incluir fotoBase64

  if (!chaveInspetor || !cnpjoucpf || !tipoServico)
    return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes' }, { status: 400 })

  const tipoVistoria = LAUDO_PARA_VISTORIA[tipoServico] ?? tipoServico
  const ncs: any[] = []

  try {
    // ── 1. vistorias_homologadas/ ────────────────────────────────────────────
    const { data: homologados } = await supabase.storage
      .from('aime').list('vistorias_homologadas', { limit: 1000 })

    // Filtrar por chave e CNPJ no nome do arquivo
    // Padrão novo:  INS-001_12345678000190_31_001.html
    // Padrão antigo: INS-001003.html
    const prefixoNovo = `${chaveInspetor}_${cnpjoucpf}_${tipoVistoria}_`

    for (const arq of (homologados ?? [])) {
      if (!arq.name.endsWith('.html')) continue

      const isNovo = arq.name.startsWith(`${chaveInspetor}_${cnpjoucpf}_${tipoVistoria}_`) ||
                     arq.name.startsWith(`${chaveInspetor}_${cnpjoucpf}_${tipoServico}_`)
      const isAntigo = !isNovo && arq.name.startsWith(chaveInspetor) &&
                       /^[A-Z0-9\-]+\d{3,}\.html$/.test(arq.name)

      if (!isNovo && !isAntigo) continue

      try {
        const { data: blob } = await supabase.storage
          .from('aime').download(`vistorias_homologadas/${arq.name}`)
        if (!blob) continue
        const html = await blob.text()

        // Tentar AIME-NC-DATA primeiro (arquivos novos)
        const m = html.match(/<!--\s*AIME-NC-DATA:([\s\S]*?)\s*-->/)
        if (m) {
          try {
            const dados = JSON.parse(m[1])
            if (dados.cnpjoucpf !== cnpjoucpf) continue
            const tipoOk = String(dados.tipoServico) === String(tipoServico) ||
                           String(dados.tipoServico) === String(tipoVistoria)
            if (!tipoOk) continue
            const nc = comFoto ? dados : (({ fotoBase64: _, ...rest }) => rest)(dados)
            ncs.push({ ...nc, _arquivo: arq.name })
          } catch { /* JSON inválido, tentar parsing */ }
        } else {
          // Arquivos sem AIME-NC-DATA: parsear HTML
          // Para padrão novo, o CNPJ já está no nome — não precisa verificar dentro do HTML
          if (isNovo || html.includes(cnpjoucpf)) {
            // Verificar tipo de serviço no HTML
            const tipoNoHtml = html.match(/Tipo de serviço[^<]*<\/label>\s*<span[^>]*>([^<]*)</i)?.[1]?.trim()
            if (tipoNoHtml && tipoNoHtml !== tipoVistoria && tipoNoHtml !== tipoServico) continue
            const nc = parsearHtmlHomologado(html, arq.name)
            if (!comFoto) delete nc.fotoBase64
            ncs.push({ ...nc, cnpjoucpf, tipoServico: tipoVistoria })
          }
        }
      } catch { continue }
    }

    // ── 2. vistorias/ (JSONs pendentes) ─────────────────────────────────────
    const { data: pendentes } = await supabase.storage
      .from('aime').list('vistorias', { limit: 1000 })

    for (const arq of (pendentes ?? [])) {
      if (!arq.name.endsWith('.json') || arq.name.includes('emptyFolder')) continue

      const isNovo = arq.name.startsWith(`${chaveInspetor}_${cnpjoucpf}_${tipoServico}_`) ||
                     arq.name.startsWith(`${chaveInspetor}_${cnpjoucpf}_${tipoVistoria}_`)
      const isAntigo = !isNovo && arq.name.startsWith(chaveInspetor) &&
                       /^[A-Z0-9\-]+\d{3,}\.json$/.test(arq.name)
      if (!isNovo && !isAntigo) continue

      try {
        const { data: blob } = await supabase.storage
          .from('aime').download(`vistorias/${arq.name}`)
        if (!blob) continue
        const dados = JSON.parse(await blob.text())

        if (isAntigo) {
          if (dados.cnpjoucpf !== cnpjoucpf) continue
          if (String(dados.tipoServico) !== String(tipoServico) &&
              String(dados.tipoServico) !== String(tipoVistoria)) continue
        }
        const nc = comFoto ? dados : (({ fotoBase64: _, ...rest }) => rest)(dados)
        ncs.push({ ...nc, _arquivo: arq.name })
      } catch { continue }
    }

    // Ordenar por fotoNr
    ncs.sort((a, b) => String(a.fotoNr ?? '').localeCompare(String(b.fotoNr ?? ''), undefined, { numeric: true }))

    return NextResponse.json({ ncs, total: ncs.length })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

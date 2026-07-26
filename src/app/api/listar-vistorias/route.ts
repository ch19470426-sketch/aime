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

// Extrai campo de <div class="f"><label>X</label><span>VALOR</span></div>
function campo(html: string, label: string): string {
  const re = new RegExp(
    `<div class="f">\\s*<label[^>]*>[^<]*${label}[^<]*</label>\\s*<span[^>]*>([\\s\\S]*?)</span>`,
    'i'
  )
  return html.match(re)?.[1]?.trim().replace(/<[^>]+>/g,'') ?? ''
}

// Extrai Grau de Risco e Prioridade — estão em <div class="m"> com estrutura diferente
function campoM(html: string, label: string): string {
  // <span>Grau de Risco</span><span style="font-size:13pt...">76</span>
  // <span>Prioridade</span><span class="badge"...>Alta</span>
  const re = new RegExp(
    `<span[^>]*>[^<]*${label}[^<]*</span>\\s*<span[^>]*>([^<]*)</span>`,
    'i'
  )
  return html.match(re)?.[1]?.trim() ?? ''
}

// Parseia HTML do formulário homologado (sem AIME-NC-DATA)
function parsearHtml(html: string, nome: string): any {
  return {
    sistema:     campo(html, 'Sistema'),
    subsistema:  campo(html, 'Subsistema'),
    anomalia:    campo(html, 'Anomalia') || campo(html, 'Não conformidade \\(NC\\)'),
    local:       campo(html, 'Local'),
    complemento: campo(html, 'Complemento'),
    gravidade:   campo(html, 'Gravidade'),
    urgencia:    campo(html, 'Urgência') || campo(html, 'Urgencia'),
    abrangencia: campo(html, 'Abrangência') || campo(html, 'Abrangencia'),
    exposicao:   campo(html, 'Exposição') || campo(html, 'Exposicao'),
    grauRisco:   campoM(html, 'Grau de Risco'),
    prioridade:  campoM(html, 'Prioridade'),
    fotoNr:      campo(html, 'Foto Nº') || campo(html, 'Foto N') || nome.match(/_(\d+)\.html$/)?.[1] || '',
    dataVistoria:campo(html, 'Data Vistoria') || campo(html, 'Data'),
    nc:          campo(html, 'Não conformidade \\(NC\\)'),
    cp:          campo(html, 'Causa provável') || campo(html, 'Causa provavel'),
    fotoBase64:  html.match(/<img[^>]+src="(data:image[^"]+)"/)?.[1] ?? '',
    _fonte: 'html_parsed',
  }
}

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const chaveInspetor = p.get('chave_inspetor') ?? ''
  const cnpjoucpf     = p.get('cnpjoucpf')      ?? ''
  const tipoServico   = p.get('tipo_servico')    ?? ''
  const comFoto       = p.get('com_foto') === '1'

  if (!chaveInspetor || !cnpjoucpf || !tipoServico)
    return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes' }, { status: 400 })

  const tipoVistoria = LAUDO_PARA_VISTORIA[tipoServico] ?? tipoServico
  const ncs: any[] = []

  try {
    // ── 1. vistorias_homologadas/ ────────────────────────────────────────────
    const { data: homologados } = await supabase.storage
      .from('aime').list('vistorias_homologadas', { limit: 1000 })

    for (const arq of (homologados ?? [])) {
      if (!arq.name.endsWith('.html')) continue

      // Filtrar por padrão do nome:
      // Novo:   INS-001_12345678000190_31_001.html → chave_cnpj_tipo_nr
      // Antigo: INS-001003.html                   → chaveNr
      const isNovo   = arq.name.startsWith(`${chaveInspetor}_${cnpjoucpf}_${tipoVistoria}_`) ||
                       arq.name.startsWith(`${chaveInspetor}_${cnpjoucpf}_${tipoServico}_`)
      const isAntigo = !isNovo && arq.name.startsWith(chaveInspetor) &&
                       /^[A-Z0-9\-]+\d{3,}\.html$/.test(arq.name)

      if (!isNovo && !isAntigo) continue

      try {
        const { data: blob } = await supabase.storage
          .from('aime').download(`vistorias_homologadas/${arq.name}`)
        if (!blob) continue
        const html = await blob.text()

        // Tentar AIME-NC-DATA (arquivos homologados após 24/07)
        const mJson = html.match(/<!--\s*AIME-NC-DATA:([\s\S]*?)\s*-->/)
        if (mJson) {
          try {
            const dados = JSON.parse(mJson[1])
            if (dados.cnpjoucpf !== cnpjoucpf) continue
            const tipoOk = String(dados.tipoServico) === String(tipoServico) ||
                           String(dados.tipoServico) === String(tipoVistoria)
            if (!tipoOk) continue
            const nc: any = { ...dados, _arquivo: arq.name }
            if (!comFoto) delete nc.fotoBase64
            ncs.push(nc)
          } catch { /* fallthrough para parsing HTML */ }
        } else {
          // Arquivos antigos: parsear HTML diretamente
          if (isAntigo) {
            // Verificar se o CNPJ do arquivo corresponde
            if (!html.includes(cnpjoucpf)) continue
            // Verificar tipo de serviço
            const tipoHtml = campo(html, 'Tipo de serviço')
            if (tipoHtml && tipoHtml !== tipoVistoria && tipoHtml !== tipoServico) continue
          }
          const nc = parsearHtml(html, arq.name)
          nc.cnpjoucpf   = cnpjoucpf
          nc.tipoServico = tipoVistoria
          nc._arquivo    = arq.name
          if (!comFoto) delete nc.fotoBase64
          ncs.push(nc)
        }
      } catch { continue }
    }

    // ── 2. vistorias/ (JSONs pendentes) ─────────────────────────────────────
    const { data: pendentes } = await supabase.storage
      .from('aime').list('vistorias', { limit: 1000 })

    for (const arq of (pendentes ?? [])) {
      if (!arq.name.endsWith('.json') || arq.name.includes('emptyFolder')) continue

      const isNovo   = arq.name.startsWith(`${chaveInspetor}_${cnpjoucpf}_${tipoServico}_`) ||
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
        const nc: any = { ...dados, _arquivo: arq.name }
        if (!comFoto) delete nc.fotoBase64
        ncs.push(nc)
      } catch { continue }
    }

    // Ordenar por fotoNr
    ncs.sort((a, b) =>
      String(a.fotoNr ?? '').localeCompare(String(b.fotoNr ?? ''), undefined, { numeric: true })
    )

    return NextResponse.json({ ncs, total: ncs.length })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

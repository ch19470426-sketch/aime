// src/app/api/listar-vistorias/route.ts
// Lista NCs — abordagem híbrida: prioriza a tabela dados_vistoria (fonte
// robusta, com nomes de coluna e tipos corretos), e cai para os métodos
// antigos (AIME-NC-DATA embutido no HTML, ou parsing de HTML puro) apenas
// para itens homologados ANTES da correção de dados_vistoria (nomes de
// coluna, tamanho de campo e RLS) — evitando ter que re-homologar tudo.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Normaliza o número da foto para comparação — dados_vistoria guarda como
// número puro ("1"), mas nomes de arquivo/HTML usam zero à esquerda ("001").
// Sem isso, o mesmo item nunca era reconhecido como já coberto, e acabava
// sendo processado duas vezes (uma de cada fonte) — gerando NCs duplicadas.
function normFotoNr(v: any): string {
  const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10)
  return isNaN(n) ? String(v ?? '').trim() : String(n)
}

const LAUDO_PARA_VISTORIA: Record<string,string> = {
  '41':'31','42':'32','43':'33','44':'34',
  '45':'35','46':'36','47':'37','48':'38',
}

function campo(html: string, label: string): string {
  const re = new RegExp(
    `<div class="f">\\s*<label[^>]*>[^<]*${label}[^<]*</label>\\s*<span[^>]*>([\\s\\S]*?)</span>`,
    'i'
  )
  return html.match(re)?.[1]?.trim().replace(/<[^>]+>/g,'') ?? ''
}

function campoM(html: string, label: string): string {
  const re = new RegExp(
    `<span[^>]*>[^<]*${label}[^<]*</span>\\s*<span[^>]*>([^<]*)</span>`,
    'i'
  )
  return html.match(re)?.[1]?.trim() ?? ''
}

function extrairFoto(html: string): string {
  const mJson = html.match(/<!--\s*AIME-NC-DATA:([\s\S]*?)\s*-->/)
  if (mJson) {
    try { return JSON.parse(mJson[1])?.fotoBase64 ?? '' } catch {}
  }
  return html.match(/<img[^>]+src="(data:image[^"]+)"/)?.[1] ?? ''
}

function parsearHtml(html: string, nome: string): any {
  return {
    sistema:     campo(html, 'Sistema'),
    subsistema:  campo(html, 'Subsistema'),
    anomalia:    campo(html, 'Anomalia') || campo(html, 'Não conformidade \\(NC\\)'),
    local:       campo(html, 'Local'),
    complemento: campo(html, 'Complemento'),
    origem:      campo(html, 'Origem'),
    gravidade:   campo(html, 'Gravidade'),
    urgencia:    campo(html, 'Urgência') || campo(html, 'Urgencia'),
    abrangencia: campo(html, 'Abrangência') || campo(html, 'Abrangencia'),
    exposicao:   campo(html, 'Exposição') || campo(html, 'Exposicao'),
    grauRisco:   campoM(html, 'Grau de Risco'),
    prioridade:  campoM(html, 'Prioridade'),
    fotoNr:      campo(html, 'Foto Nº') || campo(html, 'Foto N') || nome.match(/_(\d+)\.html$/)?.[1] || '',
    dataVistoria:campo(html, 'Data Vistoria') || campo(html, 'Data da Vistoria') || campo(html, 'DATA DA VISTORIA') || campo(html, 'Data') || '',
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
  const ehNR = ['35','36','37','38'].includes(tipoVistoria)
  const ncs: any[] = []

  // ── 0. dados_vistoria — fonte preferencial (mais robusta) ──────────────
  const porFoto = new Map<string, any>()
  try {
    const { data: linhas } = await supabase
      .from('dados_vistoria')
      .select('*')
      .eq('cnpjoucpf', cnpjoucpf)
      .eq('tipo_servico', tipoVistoria)

    for (const d of (linhas ?? [])) {
      const fotoNrFmt = normFotoNr(d.numero_foto).padStart(3, '0')
      const nc: any = {
        chaveInspetor, cnpjoucpf, tipoServico: tipoVistoria,
        tipoAtivo: d.tipo_ativo, tagNrSerie: d.tag_ativo_nr_serie,
        sistema: d.sistema_vistoria, subsistema: d.subsistema_vistoria,
        anomalia: d.anomalia_requisito_vistoria,
        local: d.local_ocorrencia, complemento: d.complemento_local,
        grauRisco: d.grau_risco, prioridade: d.prioridade,
        fotoNr: fotoNrFmt, dataVistoria: d.data_vistoria,
        nc: d.descricao_nao_conformidade, cp: d.descricao_causa_provavel,
        fotoBase64: '', _fonte: 'dados_vistoria',
        // Nome de arquivo previsível — permite que o mecanismo de fallback em
        // gerar-laudo (que só busca a foto se _arquivo estiver preenchido)
        // também funcione para itens vindos desta tabela, não só do HTML.
        _arquivo: `${chaveInspetor}_${cnpjoucpf}_${tipoVistoria}_${fotoNrFmt}.html`,
      }
      if (ehNR) nc.resultado = d.origem_resultado
      else nc.origem = d.origem_resultado
      porFoto.set(normFotoNr(d.numero_foto), nc)
      ncs.push(nc)
    }
  } catch { /* segue para o método antigo se a consulta falhar */ }

  try {
    const { data: homologados } = await supabase.storage
      .from('aime').list('vistorias_homologadas', { limit: 1000 })

    for (const arq of (homologados ?? [])) {
      if (!arq.name.endsWith('.html')) continue

      const isNovo   = arq.name.startsWith(`${chaveInspetor}_${cnpjoucpf}_${tipoVistoria}_`) ||
                       arq.name.startsWith(`${chaveInspetor}_${cnpjoucpf}_${tipoServico}_`)
      const isAntigo = !isNovo && arq.name.startsWith(chaveInspetor) &&
                       /^[A-Z0-9\-]+\d{3,}\.html$/.test(arq.name)

      if (!isNovo && !isAntigo) continue

      const fotoDoNome = normFotoNr(arq.name.match(/_(\d+)\.html$/)?.[1] ?? '')
      const jaTemDados = fotoDoNome && porFoto.has(fotoDoNome)

      try {
        if (jaTemDados && !comFoto) continue
        if (jaTemDados && comFoto) {
          if (porFoto.get(fotoDoNome)!.fotoBase64) continue
          const { data: blob } = await supabase.storage
            .from('aime').download(`vistorias_homologadas/${arq.name}`)
          if (blob) porFoto.get(fotoDoNome)!.fotoBase64 = extrairFoto(await blob.text())
          continue
        }

        const { data: blob } = await supabase.storage
          .from('aime').download(`vistorias_homologadas/${arq.name}`)
        if (!blob) continue
        const html = await blob.text()

        const mJson = html.match(/<!--\s*AIME-NC-DATA:([\s\S]*?)\s*-->/)
        if (mJson) {
          try {
            const dados = JSON.parse(mJson[1])
            if (dados.cnpjoucpf !== cnpjoucpf) continue
            const tipoOk = String(dados.tipoServico) === String(tipoServico) ||
                           String(dados.tipoServico) === String(tipoVistoria)
            if (!tipoOk) continue
            const nc: any = { ...dados, _arquivo: arq.name, _fonte: 'aime_nc_data' }
            if (!comFoto) delete nc.fotoBase64
            ncs.push(nc)
          } catch { /* fallthrough para parsing HTML */ }
        } else {
          if (isAntigo) {
            if (!html.includes(cnpjoucpf)) continue
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
        const nc: any = { ...dados, _arquivo: arq.name, _fonte: 'pendente' }
        if (!comFoto) delete nc.fotoBase64
        ncs.push(nc)
      } catch { continue }
    }

    ncs.sort((a, b) =>
      String(a.fotoNr ?? '').localeCompare(String(b.fotoNr ?? ''), undefined, { numeric: true })
    )

    return NextResponse.json({ ncs, total: ncs.length })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

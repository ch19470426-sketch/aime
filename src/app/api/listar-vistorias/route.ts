// src/app/api/listar-vistorias/route.ts
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

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const chaveInspetor = p.get('chave_inspetor') ?? ''
  const cnpjoucpf     = p.get('cnpjoucpf')      ?? ''
  const tipoServico   = p.get('tipo_servico')    ?? ''
  const debug         = p.get('debug') === '1'

  if (!chaveInspetor || !cnpjoucpf || !tipoServico) {
    return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  const tipoVistoria = LAUDO_PARA_VISTORIA[tipoServico] ?? tipoServico
  const ncs: any[] = []
  const debugInfo: any[] = []

  try {
    // ── 1. Buscar em vistorias_homologadas/ ──────────────────────────────────
    const { data: homologados, error: errHom } = await supabase.storage
      .from('aime').list('vistorias_homologadas', { limit: 1000 })

    if (debug) debugInfo.push({
      pasta: 'vistorias_homologadas',
      total: homologados?.length ?? 0,
      erro: errHom?.message,
      arquivos: (homologados ?? []).map(f => f.name).slice(0, 20),
    })

    for (const arquivo of (homologados ?? [])) {
      if (!arquivo.name.endsWith('.html')) continue

      // Aceitar tanto INS-001_xxx quanto INS-001001 (antigo)
      if (!arquivo.name.startsWith(chaveInspetor)) continue

      try {
        const { data: blob } = await supabase.storage
          .from('aime').download(`vistorias_homologadas/${arquivo.name}`)
        if (!blob) continue
        const html = await blob.text()

        // Tentar extrair JSON embutido
        const m = html.match(/<!--\s*AIME-NC-DATA:([\s\S]*?)\s*-->/)
        if (m) {
          try {
            const dados = JSON.parse(m[1])
            // Filtrar por cnpjoucpf e tipo
            if (dados.cnpjoucpf !== cnpjoucpf) continue
            const tipoOk = String(dados.tipoServico) === String(tipoServico) ||
                           String(dados.tipoServico) === String(tipoVistoria)
            if (!tipoOk) continue
            const { fotoBase64: _, ...semFoto } = dados
            ncs.push({ ...semFoto, _fonte: 'homologadas_json' })
          } catch { if (debug) debugInfo.push({ arquivo: arquivo.name, erro: 'JSON parse failed' }) }
        } else {
          // Sem JSON embutido — tentar extrair dados do HTML via regex
          const getSel = (label: string) => {
            const m = html.match(new RegExp(`${label}[^<]*<[^>]*>([^<]{1,200})<`, 'i'))
            return m?.[1]?.trim() ?? ''
          }

          // Verificar se pertence ao cnpjoucpf correto
          if (!html.includes(cnpjoucpf) && !html.includes(
            cnpjoucpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
          )) continue

          // Extrair dados básicos do HTML antigo
          const nc: any = {
            chaveInspetor, cnpjoucpf, _fonte: 'homologadas_html_antigo',
            arquivo: arquivo.name,
          }
          ncs.push(nc)
          if (debug) debugInfo.push({ arquivo: arquivo.name, aviso: 'sem AIME-NC-DATA, dados parciais' })
        }
      } catch (e) {
        if (debug) debugInfo.push({ arquivo: arquivo.name, erro: String(e) })
        continue
      }
    }

    // ── 2. Buscar em vistorias/ (JSONs pendentes) ────────────────────────────
    const { data: pendentes, error: errPend } = await supabase.storage
      .from('aime').list('vistorias', { limit: 1000 })

    if (debug) debugInfo.push({
      pasta: 'vistorias',
      total: pendentes?.length ?? 0,
      erro: errPend?.message,
      arquivos: (pendentes ?? []).map(f => f.name).slice(0, 20),
    })

    const prefixoNovo = `${chaveInspetor}_${cnpjoucpf}_${tipoServico}_`
    const prefixoVist = `${chaveInspetor}_${cnpjoucpf}_${tipoVistoria}_`

    for (const arquivo of (pendentes ?? [])) {
      if (!arquivo.name.endsWith('.json')) continue
      const isNovo = arquivo.name.startsWith(prefixoNovo) || arquivo.name.startsWith(prefixoVist)
      const isAntigo = !isNovo && arquivo.name.startsWith(chaveInspetor) &&
        /^[A-Z0-9\-]+\d{3,}\.json$/.test(arquivo.name)
      if (!isNovo && !isAntigo) continue

      try {
        const { data: blob } = await supabase.storage
          .from('aime').download(`vistorias/${arquivo.name}`)
        if (!blob) continue
        const dados = JSON.parse(await blob.text())

        if (isAntigo) {
          if (dados.cnpjoucpf !== cnpjoucpf) continue
          if (String(dados.tipoServico) !== String(tipoServico) &&
              String(dados.tipoServico) !== String(tipoVistoria)) continue
        }

        const { fotoBase64: _, ...semFoto } = dados
        ncs.push({ ...semFoto, _fonte: 'vistorias_json' })
      } catch { continue }
    }

    return NextResponse.json({
      ncs,
      total: ncs.length,
      ...(debug ? { debug: debugInfo } : {}),
    })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

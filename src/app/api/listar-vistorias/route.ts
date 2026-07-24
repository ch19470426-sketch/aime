// src/app/api/listar-vistorias/route.ts
// Lista NCs das vistorias — busca em vistorias/ (JSONs) e vistorias_homologadas/ (HTMLs)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mapeamento tipo laudo → tipo vistoria
const LAUDO_PARA_VISTORIA: Record<string,string> = {
  '41':'31','42':'32','43':'33','44':'34',
  '45':'35','46':'36','47':'37','48':'38',
}

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const chaveInspetor = p.get('chave_inspetor') ?? ''
  const cnpjoucpf     = p.get('cnpjoucpf')      ?? ''
  const tipoServico   = p.get('tipo_servico')    ?? ''

  if (!chaveInspetor || !cnpjoucpf || !tipoServico) {
    return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  const tipoVistoria = LAUDO_PARA_VISTORIA[tipoServico] ?? tipoServico
  const ncs: any[] = []

  try {
    // ── 1. Buscar em vistorias_homologadas/ (HTMLs com JSON embutido) ──────────
    const { data: homologados } = await supabase.storage
      .from('aime')
      .list('vistorias_homologadas', { limit: 1000 })

    for (const arquivo of (homologados ?? [])) {
      if (!arquivo.name.endsWith('.html')) continue
      if (!arquivo.name.startsWith(chaveInspetor)) continue

      try {
        const { data: blob } = await supabase.storage
          .from('aime')
          .download(`vistorias_homologadas/${arquivo.name}`)
        if (!blob) continue

        const html = await blob.text()

        // Extrair JSON embutido no comentário <!-- AIME-NC-DATA:{...} -->
        const m = html.match(/<!--\s*AIME-NC-DATA:([\s\S]*?)\s*-->/)
        if (m) {
          const dados = JSON.parse(m[1])
          if (dados.cnpjoucpf !== cnpjoucpf) continue
          if (String(dados.tipoServico) !== String(tipoServico) &&
              String(dados.tipoServico) !== String(tipoVistoria)) continue
          const { fotoBase64: _, ...semFoto } = dados
          ncs.push(semFoto)
        } else {
          // HTML antigo sem JSON embutido — extrair dados via nome do arquivo
          // Padrão novo: {chave}_{cnpj}_{tipo}_{nr}.html
          const partes = arquivo.name.replace('.html','').split('_')
          if (partes.length >= 4) {
            const tipoArq = partes[2]
            const cnpjArq = partes[1]
            if (cnpjArq !== cnpjoucpf) continue
            if (tipoArq !== tipoServico && tipoArq !== tipoVistoria) continue
            ncs.push({ chaveInspetor, cnpjoucpf, tipoServico: tipoArq, fotoNr: partes[3] })
          }
        }
      } catch { continue }
    }

    // ── 2. Buscar em vistorias/ (JSONs ainda não homologados) ──────────────────
    const { data: pendentes } = await supabase.storage
      .from('aime')
      .list('vistorias', { limit: 1000 })

    const prefixoNovo = `${chaveInspetor}_${cnpjoucpf}_${tipoServico}_`

    for (const arquivo of (pendentes ?? [])) {
      if (!arquivo.name.endsWith('.json')) continue

      const isNovo = arquivo.name.startsWith(prefixoNovo)
      const isAntigo = !isNovo && arquivo.name.startsWith(chaveInspetor) &&
        /^[A-Z0-9\-]+\d{3,}\.json$/.test(arquivo.name)

      if (!isNovo && !isAntigo) continue

      try {
        const { data: blob } = await supabase.storage
          .from('aime')
          .download(`vistorias/${arquivo.name}`)
        if (!blob) continue

        const dados = JSON.parse(await blob.text())

        if (!isNovo) {
          if (dados.cnpjoucpf !== cnpjoucpf) continue
          if (String(dados.tipoServico) !== String(tipoServico) &&
              String(dados.tipoServico) !== String(tipoVistoria)) continue
        }

        const { fotoBase64: _, ...semFoto } = dados
        ncs.push(semFoto)
      } catch { continue }
    }

    return NextResponse.json({ ncs, total: ncs.length })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

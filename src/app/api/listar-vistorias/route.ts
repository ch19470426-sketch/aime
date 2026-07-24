// src/app/api/listar-vistorias/route.ts
// AIMÊ — Lista NCs das vistorias — suporta nome novo ({chave}_{cnpj}_{tipo}_{nr}.json)
// e nome antigo ({chave}{nr}.json) para compatibilidade

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const chaveInspetor = p.get('chave_inspetor') ?? ''
  const cnpjoucpf     = p.get('cnpjoucpf')      ?? ''
  const tipoServico   = p.get('tipo_servico')    ?? ''

  if (!chaveInspetor || !cnpjoucpf || !tipoServico) {
    return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  try {
    const { data: arquivos, error } = await supabase.storage
      .from('aime')
      .list('vistorias', { limit: 1000 })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    // Mapeamento laudo → vistoria (para arquivos antigos que gravam o tipo da vistoria)
    const LAUDO_PARA_VISTORIA: Record<string,string> = {
      '41':'31','42':'32','43':'33','44':'34',
      '45':'35','46':'36','47':'37','48':'38',
    }
    const tipoVistoria = LAUDO_PARA_VISTORIA[tipoServico] ?? tipoServico

    // Padrão novo:  {chave}_{cnpj}_{tipo}_{nr}.json
    const prefixoNovo  = `${chaveInspetor}_${cnpjoucpf}_${tipoServico}_`
    // Padrão antigo: {chave}{nr}.json  (nr = 3 dígitos)
    const prefixoAntigo = chaveInspetor

    const arquivosFiltrados = (arquivos ?? [])
      .filter(f => {
        const nome = f.name
        if (!nome.endsWith('.json')) return false
        // Padrão novo
        if (nome.startsWith(prefixoNovo)) return true
        // Padrão antigo: começa com chave seguido direto de dígitos
        if (nome.startsWith(prefixoAntigo) && /^[A-Z0-9\-]+\d{3,}\.json$/.test(nome)) {
          // Precisa abrir para filtrar por cnpjoucpf e tipoServico
          return true
        }
        return false
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    if (arquivosFiltrados.length === 0) {
      return NextResponse.json({ ncs: [], total: 0 })
    }

    const ncs = await Promise.all(
      arquivosFiltrados.map(async (arquivo) => {
        try {
          const { data: blob } = await supabase.storage
            .from('aime')
            .download(`vistorias/${arquivo.name}`)
          if (!blob) return null
          const text = await blob.text()
          const json = JSON.parse(text)

          // Para arquivos antigos: filtrar por cnpjoucpf e tipoServico dentro do JSON
          const isNovo = arquivo.name.startsWith(prefixoNovo)
          if (!isNovo) {
            if (json.cnpjoucpf !== cnpjoucpf) return null
            if (String(json.tipoServico) !== String(tipoServico) && String(json.tipoServico) !== String(tipoVistoria)) return null
          }

          const { fotoBase64: _, ...semFoto } = json
          return semFoto
        } catch { return null }
      })
    )

    const ncsValidas = ncs.filter(Boolean)
    return NextResponse.json({ ncs: ncsValidas, total: ncsValidas.length })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

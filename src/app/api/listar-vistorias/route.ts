// src/app/api/listar-vistorias/route.ts
// AIMÊ — Lista todas as NCs das vistorias de um inspetor+estabelecimento+serviço

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
    return NextResponse.json({ erro: 'Parâmetros obrigatórios: chave_inspetor, cnpjoucpf, tipo_servico' }, { status: 400 })
  }

  try {
    // Listar todos os arquivos em vistorias/ que começam com a chave do inspetor
    const { data: arquivos, error } = await supabase.storage
      .from('aime')
      .list('vistorias', { limit: 1000 })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    // Filtrar pelo padrão: {chave}_{cnpjoucpf}_{tipoServico}_{nr}.json
    const prefixo = `${chaveInspetor}_${cnpjoucpf}_${tipoServico}_`
    const arquivosFiltrados = (arquivos ?? [])
      .filter(f => f.name.startsWith(prefixo) && f.name.endsWith('.json'))
      .sort((a, b) => a.name.localeCompare(b.name))

    if (arquivosFiltrados.length === 0) {
      return NextResponse.json({ ncs: [] })
    }

    // Baixar e parsear cada JSON
    const ncs = await Promise.all(
      arquivosFiltrados.map(async (arquivo) => {
        try {
          const { data: blob } = await supabase.storage
            .from('aime')
            .download(`vistorias/${arquivo.name}`)
          if (!blob) return null
          const text = await blob.text()
          const json = JSON.parse(text)
          // Retornar sem a foto base64 para não sobrecarregar
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

// src/app/api/listar-documentos/route.ts
// AIMÊ — Lista os documentos disponíveis para download de uma chave+cnpjoucpf

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chaveInspetor = searchParams.get('chave_inspetor') ?? ''
    const cnpjoucpf     = searchParams.get('cnpjoucpf') ?? ''

    if (!chaveInspetor || !cnpjoucpf) {
      return NextResponse.json({ erro: 'chave_inspetor e cnpjoucpf são obrigatórios' }, { status: 400 })
    }

    // Listamos todos os arquivos da pasta documentos_inspetor
    const { data, error } = await supabase.storage
      .from('aime')
      .list('documentos_inspetor', { limit: 500, offset: 0 })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    // Filtrar: arquivo deve conter chaveInspetor E cnpjoucpf no nome
    const arquivos = (data ?? [])
      .filter(f => {
        const nome = f.name
        console.log('[AIME-61] arquivo:', nome, '| chave match:', nome.startsWith(chaveInspetor), '| cnpj match:', nome.includes(cnpjoucpf))
        if (!nome.startsWith(chaveInspetor)) return false
        if (!nome.includes(cnpjoucpf)) return false
        // Aceita PDFs assinados, PDFs, HTMLs de documentos e termo de aceite
        const ehPdf   = nome.endsWith('.pdf')
        const ehHtml  = nome.endsWith('.html')
        return ehPdf || ehHtml
      })

    console.log('[AIME-61] total arquivos storage:', data?.length, '| filtrados:', arquivos.length, '| chave:', chaveInspetor, '| cnpj:', cnpjoucpf)

    // Gerar URLs assinadas para cada arquivo encontrado
    const docs = await Promise.all(
      arquivos.map(async (f) => {
        const nome = f.name
        const { data: urlData } = await supabase.storage
          .from('aime')
          .createSignedUrl(`documentos_inspetor/${nome}`, 3600)

        // Rótulo amigável para exibição
        let label = nome
          .replace(chaveInspetor + '_', '')
          .replace(cnpjoucpf, '')
          .replace(/_+/g, ' ')
          .replace(/\.pdf$/i, '')
          .replace(/\.html$/i, '')
          .replace(/\bassinado\b/i, '— PDF assinado')
          .trim()

        if (nome.includes('termo_de_aceite')) label = 'Termo de Aceite dos Serviços'
        if (nome.endsWith('_assinado.pdf'))   label = label.replace('— PDF assinado', '') + ' — PDF assinado'

        // Capitalizar primeira letra
        label = label.charAt(0).toUpperCase() + label.slice(1)

        return { nome, label, url: urlData?.signedUrl ?? null }
      })
    )

    return NextResponse.json({ docs: docs.filter(d => d.url) })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

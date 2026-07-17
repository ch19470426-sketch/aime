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
    // e ser PDF assinado ou termo de aceite
    const prefixo = `${chaveInspetor}_${cnpjoucpf}`
    const arquivos = (data ?? [])
      .filter(f => {
        const nome = f.name
        if (!nome.startsWith(chaveInspetor)) return false
        if (!nome.includes(cnpjoucpf)) return false
        const ehPdfAssinado = nome.endsWith('_assinado.pdf')
        const ehPdf         = nome.endsWith('.pdf')
        const ehTermo       = nome.includes('termo_de_aceite')
        return ehPdfAssinado || ehPdf || ehTermo
      })
      .map(f => {
        const nome = f.name
        // Gera URL pública assinada (válida por 1 hora)
        return { nome, prefixo }
      })

    // Gerar URLs assinadas para cada arquivo encontrado
    const docs = await Promise.all(
      arquivos.map(async ({ nome }) => {
        const { data: urlData } = await supabase.storage
          .from('aime')
          .createSignedUrl(`documentos_inspetor/${nome}`, 3600)

        // Rótulo amigável para exibição
        let label = nome
          .replace(`${chaveInspetor}_${cnpjoucpf}_`, '')
          .replace(`${chaveInspetor}_`, '')
          .replace(/_assinado\.pdf$/i, ' — PDF assinado')
          .replace(/\.pdf$/i, ' — PDF')
          .replace(/\.html$/i, '')
          .replace(/_/g, ' ')
          .trim()

        if (nome.includes('termo_de_aceite')) label = 'Termo de Aceite dos Serviços'

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

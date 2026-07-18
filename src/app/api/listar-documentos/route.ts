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
    // Exclui fotos de vistoria (nome termina com _foto_NNN.jpg ou _NNN.jpg)
    const arquivos = (data ?? [])
      .filter(f => {
        const nome = f.name
        if (!nome.startsWith(chaveInspetor)) return false
        // Termo de aceite: documento do inspetor, sem cnpjoucpf no nome — sempre aparece
        const ehTermo = nome.includes('termo_de_aceite')
        // Demais documentos: devem conter o cnpjoucpf no nome
        if (!ehTermo && !nome.includes(cnpjoucpf)) return false
        // Excluir fotos de vistoria (terminam com número antes da extensão)
        if (/\d+\.(jpg|jpeg|png|webp)$/i.test(nome)) return false
        const ehPdf  = nome.endsWith('.pdf')
        const ehHtml = nome.endsWith('.html')
        return ehPdf || ehHtml
      })

    // Gerar URLs assinadas e rótulos para cada arquivo
    const docs = await Promise.all(
      arquivos.map(async (f) => {
        const nome = f.name
        const { data: urlData } = await supabase.storage
          .from('aime')
          .createSignedUrl(`documentos_inspetor/${nome}`, 3600)

        // Rótulo amigável
        let label = nome
          .replace(new RegExp('^' + chaveInspetor + '_'), '')
          .replace(new RegExp('_?' + cnpjoucpf + '_?'), '_')
          .replace(/^_|_$/g, '')
          .replace(/_/g, ' ')
          .replace(/\.pdf$/i, '')
          .replace(/\.html$/i, '')
          .trim()

        // Casos especiais
        if (nome.includes('termo_de_aceite'))    label = 'Termo de Aceite dos Serviços'
        else if (nome.endsWith('_assinado.pdf')) label = label.replace(/\s*assinado\s*/i, '').trim() + ' — PDF assinado'
        else if (nome.endsWith('.pdf'))          label = label + ' — PDF'

        return { nome, label: label.charAt(0).toUpperCase() + label.slice(1), url: urlData?.signedUrl ?? null }
      })
    )

    return NextResponse.json({ docs: docs.filter(d => d.url) })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

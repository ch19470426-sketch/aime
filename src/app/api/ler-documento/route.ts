export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// src/app/api/ler-documento/route.ts
// Lê documento do Storage usando Service Role

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao, exigirArquivoDoProprio } from '@/lib/autorizacao'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // PORTEIRO (AUTH_API_ATIVA): exige sessão válida. Inerte enquanto a variável não for exatamente "true".
  const acessoApi = await exigirSessao(request)
  if (acessoApi.ok === false) return acessoApi.resposta
  const { searchParams } = new URL(request.url)
  const nome  = searchParams.get('nome')
  const pasta = searchParams.get('pasta') ?? 'documentos_inspetor'
  // Só as pastas de documentos que as telas usam: antes lia qualquer arquivo do armazenamento.
  if (!['documentos_inspetor'].includes(pasta)) return NextResponse.json({ erro: 'pasta inválida' }, { status: 400 })
  // DONO (AUTH_API_ATIVA): o documento (nome começa com a chave do usuário) é do usuário logado.
  const acessoDono = await exigirArquivoDoProprio(request, nome)
  if (acessoDono.ok === false) return acessoDono.resposta

  if (!nome) return NextResponse.json({ erro: 'Nome obrigatório' }, { status: 400 })

  try {
    const { data, error } = await supabase.storage
      .from('aime')
      .download(`${pasta}/${nome}`)

    if (error || !data) return NextResponse.json({ existe: false }, { status: 404 })

    const html = await data.text()
    return NextResponse.json({ existe: true, html })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

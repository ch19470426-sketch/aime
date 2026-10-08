// src/app/api/vistorias/[nome]/route.ts
// AIMÊ — API para ler formulário específico com foto

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao } from '@/lib/autorizacao'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nome: string }> }
) {
  // PORTEIRO (AUTH_API_ATIVA): exige sessão válida. Inerte enquanto a variável não for exatamente "true".
  const acessoApi = await exigirSessao(request)
  if (acessoApi.ok === false) return acessoApi.resposta
  const { nome } = await params

  try {
    const { data, error } = await supabase.storage
      .from('aime')
      .download(`vistorias/${nome}`)

    if (error || !data) return NextResponse.json({ erro: error?.message ?? 'Não encontrado' }, { status: 404 })

    const text = await data.text()
    const json = JSON.parse(text)
    return NextResponse.json(json)
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Endpoint temporário — serve HTML puro para visualização direta no browser (diagnóstico)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const nome  = request.nextUrl.searchParams.get('nome')
  const pasta = request.nextUrl.searchParams.get('pasta') ?? 'documentos_inspetor'
  if (!nome) return new NextResponse('nome obrigatório', { status: 400 })

  const { data, error } = await supabase.storage.from('aime').download(`${pasta}/${nome}`)
  if (error || !data) return new NextResponse('não encontrado: ' + (error?.message ?? ''), { status: 404 })

  const html = await data.text()
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

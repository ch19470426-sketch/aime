import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const nome = request.nextUrl.searchParams.get('nome') || ''
  const { data: blob } = await supabase.storage.from('aime')
    .download(`documentos_inspetor/${nome}`)
  if (!blob) return NextResponse.json({ erro: 'arquivo nao encontrado', nome })
  const html = await blob.text()
  // Encontrar tbDocs
  const tbIdx = html.indexOf('id="tbDocs"')
  const tbHtml = tbIdx >= 0 ? html.slice(tbIdx, tbIdx+3000) : 'id tbDocs nao encontrado'
  // Procurar <td style=
  const samples: string[] = []
  let s = tbHtml
  for (let i=0; i<10; i++) {
    const a = s.indexOf('<td')
    if (a<0) break
    const b = s.indexOf('>', a)
    const e = s.indexOf('</td>', b)
    if (e<0) break
    samples.push(s.slice(a, Math.min(b+50, e)))
    s = s.slice(e+5)
  }
  return NextResponse.json({ nome, tbIdx, samples, tbPreview: tbHtml.slice(0,500) })
}

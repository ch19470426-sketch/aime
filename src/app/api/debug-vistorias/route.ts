export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const chave = searchParams.get('chave') ?? ''
  const cnpj  = searchParams.get('cnpj')  ?? ''

  const { data: files, error } = await supabase.storage
    .from('aime')
    .list('vistorias', { search: chave, sortBy: { column: 'name', order: 'asc' } })

  if (error) return NextResponse.json({ erro: error.message })
  if (!files || files.length === 0) return NextResponse.json({ arquivos: [], msg: 'nenhum arquivo' })

  const resultado = []
  for (const file of files) {
    const { data, error: e2 } = await supabase.storage.from('aime').download(`vistorias/${file.name}`)
    if (e2 || !data) { resultado.push({ nome: file.name, erro: e2?.message }); continue }
    const json = JSON.parse(await data.text())
    resultado.push({
      nome: file.name,
      cnpjoucpf: json.cnpjoucpf,
      sistema: json.sistema,
      tipoServico: json.tipoServico,
      bate_cnpj: json.cnpjoucpf === cnpj,
    })
  }
  return NextResponse.json({ total: resultado.length, arquivos: resultado })
}

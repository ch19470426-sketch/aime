export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const cpf  = p.get('cpf')  ?? '05491239704'
  const cnpj = p.get('cnpj') ?? '12345678000190'
  const chave = p.get('chave') ?? `${cpf}_${cnpj}_37 Vistoria nr-12`
  const tipo  = p.get('tipo')  ?? '37'

  // Chamar listar-vistorias internamente
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aime-7h4a.vercel.app'
  const url = `${baseUrl}/api/listar-vistorias?chave_inspetor=${encodeURIComponent(chave)}&cnpjoucpf=${cnpj}&tipo_servico=${tipo}`
  const res  = await fetch(url)
  const data = await res.json()
  const ncs  = data.ncs ?? []

  // Mostrar campos da primeira NC
  const amostra = ncs.slice(0,3).map((nc:any) => {
    const { fotoBase64: _, ...rest } = nc
    return rest
  })

  // Listar arquivos homologados
  const { data: arqs } = await supabase.storage
    .from('aime').list('vistorias_homologadas', { limit: 50 })
  const arqs37 = (arqs??[]).filter(a => a.name.includes('37') || a.name.includes(cnpj))
    .map(a => a.name).slice(0,10)

  return NextResponse.json({ total_ncs: ncs.length, amostra, arqs37, url })
}

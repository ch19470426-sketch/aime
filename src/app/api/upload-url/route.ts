// Gera URL assinada para upload direto do navegador ao Storage.
// Evita trafegar o arquivo pelo servidor, que tem limite de corpo (~4,5 MB).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao, exigirCaminhoDoProprio } from '@/lib/autorizacao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  // PORTEIRO (AUTH_API_ATIVA): exige sessão válida. Inerte enquanto a variável não for exatamente "true".
  const acessoApi = await exigirSessao(request)
  if (acessoApi.ok === false) return acessoApi.resposta
  try {
    const { path } = await request.json()
    // Só a pasta de imagens do laudo (antes: URL assinada com upsert para QUALQUER caminho do armazenamento).
    if (typeof path !== 'string' || !path.startsWith('laudos_imagens/')) return NextResponse.json({ erro: 'caminho inválido' }, { status: 400 })
    // DONO (AUTH_API_ATIVA): o nome do arquivo começa com a chave do usuário logado.
    const acessoDono = await exigirCaminhoDoProprio(request, path, ['laudos_imagens'])
    if (acessoDono.ok === false) return acessoDono.resposta
    if (!path) return NextResponse.json({ erro: 'path ausente' }, { status: 400 })

    const { data, error } = await supabase.storage
      .from('aime')
      .createSignedUploadUrl(path, { upsert: true })

    if (error || !data) {
      return NextResponse.json({ erro: error?.message ?? 'falha ao assinar' }, { status: 500 })
    }
    return NextResponse.json({ signedUrl: data.signedUrl, path })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

// Gera URL assinada para upload direto do navegador ao Storage.
// Evita trafegar o arquivo pelo servidor, que tem limite de corpo (~4,5 MB).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json()
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

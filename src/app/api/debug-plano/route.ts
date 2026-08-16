export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // Listar TUDO sem filtro
  const { data: arqs } = await sb.storage.from('aime')
    .list('vistorias_homologadas', { limit: 500 })

  const nomes = (arqs??[]).map(a => a.name).slice(0, 30)

  // Ler primeiro arquivo
  let campos: any = {}
  if (nomes.length > 0) {
    const { data: blob } = await sb.storage.from('aime')
      .download(`vistorias_homologadas/${nomes[0]}`)
    if (blob) {
      const txt = await blob.text()
      const m = txt.match(/<!--\s*AIME-NC-DATA:([\s\S]*?)\s*-->/)
      if (m) {
        try {
          const d = JSON.parse(m[1])
          const { fotoBase64: _, ...r } = d
          campos = { fonte: 'AIME-NC-DATA', arquivo: nomes[0], ...r }
        } catch { campos = { fonte: 'JSON_ERRO' } }
      } else {
        campos = { fonte: 'HTML_ANTIGO', arquivo: nomes[0] }
      }
    }
  }

  return NextResponse.json({ total: arqs?.length ?? 0, nomes, campos })
}

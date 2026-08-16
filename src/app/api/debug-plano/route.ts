export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // Ler primeiro arquivo tipo 37
  const arq = 'INS-003_12345678000190_37_001.html'
  const { data: blob } = await sb.storage.from('aime')
    .download(`vistorias_homologadas/${arq}`)

  let html = ''
  let campos: any = {}
  if (blob) {
    html = await blob.text()
    // Ver se tem AIME-NC-DATA
    const m = html.match(/<!--\s*AIME-NC-DATA:([\s\S]*?)\s*-->/)
    if (m) {
      const d = JSON.parse(m[1])
      const { fotoBase64: _, ...r } = d
      campos = { fonte: 'AIME-NC-DATA', ...r }
    } else {
      // Extrair campos do HTML antigo
      const campo = (label: string) => {
        const rx = new RegExp(label + '[^:]*:[\\s\\S]{0,20}?<[^>]+>([^<]{1,80})', 'i')
        return html.match(rx)?.[1]?.trim() || ''
      }
      // Ver primeiros 2000 chars do HTML para entender estrutura
      campos = {
        fonte: 'HTML_ANTIGO',
        preview: html.substring(0, 500).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
      }
    }
  }

  return NextResponse.json({ arq, campos })
}

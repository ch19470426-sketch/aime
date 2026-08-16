export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const cpf  = '05491239704'
  const cnpj = '12345678000190'

  // Listar TODOS os arquivos homologados deste inspetor
  const { data: arqs } = await sb.storage.from('aime')
    .list('vistorias_homologadas', { limit: 500 })

  const meus = (arqs??[])
    .filter(a => a.name.includes(cpf))
    .map(a => a.name)
    .slice(0, 20)

  // Ler primeiro arquivo para ver campos
  let campos: any = {}
  if (meus.length > 0) {
    const { data: blob } = await sb.storage.from('aime')
      .download(`vistorias_homologadas/${meus[0]}`)
    if (blob) {
      const txt = await blob.text()
      const m = txt.match(/<!--\s*AIME-NC-DATA:([\s\S]*?)\s*-->/)
      if (m) {
        try {
          const d = JSON.parse(m[1])
          const { fotoBase64: _, ...r } = d
          campos = { fonte: 'AIME-NC-DATA', arquivo: meus[0], ...r }
        } catch { campos = { fonte: 'JSON_ERRO', arquivo: meus[0] } }
      } else {
        campos = { fonte: 'HTML_ANTIGO', arquivo: meus[0] }
      }
    }
  }

  return NextResponse.json({ total: meus.length, meus, campos })
}

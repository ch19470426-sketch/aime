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
  const chave = `${cpf}_${cnpj}_37 Vistoria nr-12`

  // Listar arquivos homologados
  const { data: arqs } = await sb.storage.from('aime')
    .list('vistorias_homologadas', { limit: 200 })

  const meus = (arqs??[]).filter(a =>
    a.name.includes(cpf) && a.name.includes(cnpj) &&
    (a.name.includes('_37_') || a.name.includes('37 Vistoria'))
  ).map(a => a.name)

  // Ler primeiro arquivo e mostrar campos
  let campos: any = {}
  if (meus.length > 0) {
    const { data: blob } = await sb.storage.from('aime')
      .download(`vistorias_homologadas/${meus[0]}`)
    if (blob) {
      const txt = await blob.text()
      const m = txt.match(/<!--\s*AIME-NC-DATA:([\s\S]*?)\s*-->/)
      if (m) {
        const dados = JSON.parse(m[1])
        const { fotoBase64: _, ...resto } = dados
        campos = { fonte: 'AIME-NC-DATA', arquivo: meus[0], ...resto }
      } else {
        campos = { fonte: 'HTML_ANTIGO', arquivo: meus[0] }
      }
    }
  }

  // Ativos cadastrados
  const { data: ativos } = await sb.from('ativos_a_vistoriar')
    .select('tipo_ativo,tag_ativo_nr_serie')
    .eq('cpf_inspetor', cpf).eq('cnpjoucpf', cnpj)

  return NextResponse.json({ meus, campos, ativos })
}

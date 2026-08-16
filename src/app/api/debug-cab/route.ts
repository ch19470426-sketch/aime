export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function GET() {
  const { data } = await sb.from('inspetor').select('nome_inspetor,cabecalho_documentos,rodape_documentos').eq('cpf_inspetor','05491239704').limit(1)
  return NextResponse.json(data?.[0] ?? {})
}

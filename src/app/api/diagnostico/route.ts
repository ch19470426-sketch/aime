import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const cpf = p.get('cpf') ?? ''
  const cnpj = p.get('cnpj') ?? ''

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Buscar todos os ativos do inspetor
  const { data, error } = await supabase
    .from('ativos_a_vistoriar')
    .select('*')
    .eq('cpf_inspetor', cpf)
    .limit(5)

  // Também tentar com cnpj formatado e sem formatação
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  const { data: data2 } = await supabase
    .from('ativos_a_vistoriar')
    .select('cnpjoucpf, nome_responsavel, whatsapp, email, tipo_ativo, uso_ativo')
    .or(`cnpjoucpf.eq.${cnpj},cnpjoucpf.eq.${cnpjLimpo}`)
    .limit(5)

  return NextResponse.json({
    todos: data,
    erro: error?.message,
    porCnpj: data2,
    cnpjOriginal: cnpj,
    cnpjLimpo,
  })
}

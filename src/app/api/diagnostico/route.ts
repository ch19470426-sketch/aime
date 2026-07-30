import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const cpf  = '15158500053'
  const cnpj = '12345678000190'
  const { data: todos } = await supabase.from('ativos_a_vistoriar')
    .select('cpf_inspetor,cnpjoucpf,tipo_servico,nome_responsavel,funcao_responsavel,whatsapp,email,tipo_ativo,uso_ativo')
    .eq('cpf_inspetor', cpf).limit(10)
  const { data: porCnpj } = await supabase.from('ativos_a_vistoriar')
    .select('cpf_inspetor,cnpjoucpf,tipo_servico,nome_responsavel,funcao_responsavel,whatsapp,email,tipo_ativo,uso_ativo')
    .eq('cpf_inspetor', cpf).eq('cnpjoucpf', cnpj).limit(5)
  const cnpjLimpo = cnpj.replace(/\D/g,'')
  const { data: porCnpjLimpo } = await supabase.from('ativos_a_vistoriar')
    .select('cpf_inspetor,cnpjoucpf,tipo_servico,nome_responsavel,funcao_responsavel,whatsapp,email,tipo_ativo,uso_ativo')
    .eq('cpf_inspetor', cpf).eq('cnpjoucpf', cnpjLimpo).limit(5)
  return NextResponse.json({ todos, porCnpj, porCnpjLimpo, cnpjLimpo })
}

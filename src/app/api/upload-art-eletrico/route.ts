export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { cpfEletrico, cnpjoucpf, cpfInspetor, tipoServico } = await request.json()
    if (!cpfEletrico || !cnpjoucpf || !cpfInspetor) {
      return NextResponse.json({ erro: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    // ART nao e mais anexada aqui — passou a ser inserida direto no laudo 42
    // pelo civil/arquiteto (Anexo 3). Esse registro serve so como vinculo
    // ("o que precisa de revisao eletrica"), sem arquivo.
    // Remover registro anterior se existir (mesmo cpf_eletrico+cnpjoucpf+cpf_inspetor)
    await supabase.from('art_profissional')
      .delete()
      .eq('cpf_eletrico', cpfEletrico)
      .eq('cnpjoucpf', cnpjoucpf)
      .eq('cpf_inspetor', cpfInspetor)

    const { error: errDb } = await supabase
      .from('art_profissional')
      .insert({
        cpf_inspetor:  cpfInspetor,
        cnpjoucpf:     cnpjoucpf,
        tipo_servico:  tipoServico || '32 Vistoria inspeção',
        cpf_eletrico:  cpfEletrico,
        data_cadastro: new Date().toISOString().split('T')[0],
      })

    if (errDb) return NextResponse.json({ erro: errDb.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

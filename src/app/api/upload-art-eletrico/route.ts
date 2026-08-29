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
    const { nomeArquivo, base64, contentType, cpfEletrico, cnpjoucpf, cpfInspetor, tipoServico } = await request.json()
    if (!nomeArquivo || !base64) {
      return NextResponse.json({ erro: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    // Upload do arquivo no Storage
    const buffer = Buffer.from(base64, 'base64')
    const { error: errUp } = await supabase.storage
      .from('aime')
      .upload(`arts/${nomeArquivo}`, buffer, {
        contentType: contentType || 'application/pdf',
        upsert: true,
      })
    if (errUp) return NextResponse.json({ erro: errUp.message }, { status: 500 })

    // Salvar referência em art_profissional
    const { error: errDb } = await supabase
      .from('art_profissional')
      .upsert({
        cpf_inspetor:  cpfInspetor,
        cnpjoucpf:     cnpjoucpf,
        tipo_servico:  tipoServico || '32 Vistoria inspeção',
        cpf_eletrico:  cpfEletrico,
        arquivo_art:   `arts/${nomeArquivo}`,
        data_cadastro: new Date().toISOString().split('T')[0],
      }, { onConflict: 'cpf_eletrico,cnpjoucpf,cpf_inspetor' })

    if (errDb) return NextResponse.json({ erro: errDb.message }, { status: 500 })

    return NextResponse.json({ ok: true, arquivo: `arts/${nomeArquivo}` })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

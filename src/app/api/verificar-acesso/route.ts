export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Verificação de acesso pós-prazo de homologação (30/09/2026).
//
// REGRA DE SEGURANÇA (ponto crítico do desenho): NA DÚVIDA, LIBERA.
// Qualquer falha aqui (banco fora do ar, erro de rede, bug de código,
// exceção não prevista) resulta em "liberado: true" — nunca no contrário.
// Um bug nesta rota pode, na pior hipótese, deixar alguém acessar além do
// prazo — nunca pode travar a própria equipe para fora do sistema.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BETA_EXPIRA = new Date('2026-09-30T23:59:59-03:00') // 30/09/2026 meia-noite horário de Brasília

export async function GET(request: NextRequest) {
  try {
    // Antes do prazo: libera todo mundo, sem nem consultar o banco
    if (new Date() <= BETA_EXPIRA) {
      return NextResponse.json({ liberado: true })
    }

    const cpfInspetor = request.nextUrl.searchParams.get('cpf_inspetor')
    if (!cpfInspetor) {
      // Sem CPF para verificar — não temos como negar com segurança
      return NextResponse.json({ liberado: true })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('inspetor')
      .select('is_gestor')
      .eq('cpf_inspetor', cpfInspetor)
      .limit(1)

    // Erro de consulta ou CPF não encontrado: não temos certeza — libera
    if (error || !data || data.length === 0) {
      return NextResponse.json({ liberado: true })
    }

    // Só nega quando temos CERTEZA de que não é gestor
    const liberado = data[0].is_gestor === true
    return NextResponse.json({ liberado })

  } catch {
    // Qualquer exceção não prevista: libera
    return NextResponse.json({ liberado: true })
  }
}

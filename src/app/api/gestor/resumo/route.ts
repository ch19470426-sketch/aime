import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const hoje = new Date().toISOString().slice(0,10)

    // Total de inspetores
    const { data: inspetores } = await supabase
      .from('inspetor')
      .select('cpf_inspetor, nome_inspetor')

    // Contratos vigentes (data_fim_contrato >= hoje)
    const { data: contratos } = await supabase
      .from('contratos_inspetor')
      .select('cpf_inspetor, saldo_quantidade_plano, saldo_quantidade_avulso, data_fim_contrato')
      .gte('data_fim_contrato', hoje)

    const cpfsComContrato = new Set((contratos ?? []).map((c: any) => c.cpf_inspetor))
    const totalCrPlano  = (contratos ?? []).reduce((s: number, c: any) => s + (c.saldo_quantidade_plano  ?? 0), 0)
    const totalCrAvulso = (contratos ?? []).reduce((s: number, c: any) => s + (c.saldo_quantidade_avulso ?? 0), 0)

    const inspetoresSemContrato = (inspetores ?? [])
      .filter((i: any) => !cpfsComContrato.has(i.cpf_inspetor))
      .map((i: any) => i.nome_inspetor)

    return NextResponse.json({
      totalInspetores:      inspetores?.length ?? 0,
      inspetoresAtivos:     cpfsComContrato.size,
      contratosVigentes:    cpfsComContrato.size,
      totalCrPlano,
      totalCrAvulso,
      totalCrConsumo:       0,
      inspetoresSemContrato,
    })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

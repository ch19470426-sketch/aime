import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cobrancaAtiva } from '@/lib/creditos'
import { exigirProprio } from '@/lib/autorizacao'
import { bloqueioMigracaoParaCortesia } from '@/lib/regrasPlano'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLANO_CR: Record<string,number> = {
  'PLANO CORTESIA': 600, 'PLANO SERVIÇO': 600,
  'PLANO MENSAL': 1200, 'PLANO ESCRITÓRIO': 3000
}

export async function POST(request: NextRequest) {
  try {
    const { cpf, planoDesejado } = await request.json()
    const acesso = await exigirProprio(request, cpf)
    if (acesso.ok === false) return acesso.resposta
    if (!cpf || !planoDesejado) return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    const qde = PLANO_CR[planoDesejado]
    if (!qde) return NextResponse.json({ erro: 'Tipo de plano inválido.' }, { status: 400 })

    // Com a cobrança de créditos LIGADA (COBRANCA_CREDITOS_ATIVA=true), plano
    // pago não pode mais ser obtido por troca direta — senão qualquer usuário
    // ganharia os créditos sem pagar. A contratação passa a ser feita pelo
    // pedido em /api/creditos/pedido (e concedida após o pagamento).
    // Desligada (padrão), este endpoint se comporta exatamente como antes.
    if (cobrancaAtiva() && planoDesejado !== 'PLANO CORTESIA') {
      return NextResponse.json(
        { erro: 'A contratação de planos pagos é feita em "Contratar créditos".' },
        { status: 402 }
      )
    }

    // Regra: não pode migrar de plano pago para Cortesia
    if (planoDesejado === 'PLANO CORTESIA') {
      const bloqueio = await bloqueioMigracaoParaCortesia(supabase, cpf)
      if (bloqueio) return NextResponse.json({ erro: bloqueio }, { status: 422 })
    }

    // Regra: não pode migrar para Cortesia se já teve
    if (planoDesejado === 'PLANO CORTESIA') {
      const { data: jaTemCortesia } = await supabase
        .from('contratos_inspetor').select('cpf_inspetor')
        .eq('cpf_inspetor', cpf).eq('tipo_assinatura', 'PLANO CORTESIA').maybeSingle()
      if (jaTemCortesia) return NextResponse.json({ erro: 'O Plano Cortesia já foi utilizado e não pode ser concedido novamente.' }, { status: 422 })
    }

    // Inserir novo contrato
    const { error } = await supabase.from('contratos_inspetor').insert({
      cpf_inspetor: cpf,
      tipo_assinatura: planoDesejado,
      data_inicio_contrato: new Date().toISOString().slice(0,10),
      qde_contratada_plano: qde,
      saldo_quantidade_plano: qde,
      qde_contratada_avulso: 0,
      saldo_quantidade_avulso: 0,
    })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

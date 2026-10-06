// src/app/api/creditos/conferir-pagamento/route.ts
// AIMÊ — "Já paguei": o AIMÊ pergunta ao Asaas, por conta própria, se os pedidos pendentes do
// usuário logado já foram pagos, e libera os créditos pelo MESMO caminho seguro do webhook
// (src/lib/pagamentos.ts: consulta direta ao Asaas, reserva atômica, idempotente). Assim a
// liberação não depende de o aviso do Asaas chegar a tempo (em 06/10/2026 um PIX confirmado no
// Asaas deixou a tela esperando — Celso). O navegador não decide nada: só dispara a conferência.
// O CPF vem da sessão validada no servidor, e só pedidos dele são conferidos.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cpfDaSessao } from '@/lib/sessaoServidor'
import { temAlgumContrato } from '@/lib/creditos'
import { processarCobranca } from '@/lib/pagamentos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const cpf = await cpfDaSessao(request)
    if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: pendentes, error } = await supabase
      .from('pedidos_credito').select('id,asaas_payment_id')
      .eq('cpf_inspetor', cpf).eq('status', 'aguardando_pagamento')
      .order('criado_em', { ascending: false }).limit(10)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    let concedidos = 0
    let falhas = 0
    for (const p of (pendentes ?? []).filter(x => x.asaas_payment_id)) {
      try {
        const r = await processarCobranca(p.asaas_payment_id as string, 'CONFERENCIA')
        if (r.status >= 500) falhas++
        else if (r.corpo.creditosConcedidos) concedidos++
      } catch { falhas++ }
    }

    return NextResponse.json({ ok: true, concedidos, falhas, temContrato: await temAlgumContrato(cpf) })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

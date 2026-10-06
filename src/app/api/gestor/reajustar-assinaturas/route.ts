// src/app/api/gestor/reajustar-assinaturas/route.ts
// AIMÊ — Reajuste das assinaturas JÁ ativas quando o salário mínimo de referência muda.
//
// Os preços são percentuais do salário mínimo (src/lib/precos.ts). Depois de trocar
// SALARIO_MINIMO_REFERENCIA_CENTAVOS e fazer o deploy, as compras novas já saem com o preço
// novo; esta rotina leva o novo valor às assinaturas em andamento, no Asaas (cobranças futuras
// e pendentes) e na nossa base, e avisa cada inspetor por e-mail.
//
//   POST { simular?: boolean }   simular=true (PADRÃO) só relata o que mudaria;
//                                simular=false executa.
//
// SEGURANÇA: só gestor, com checagem PRÓPRIA e sempre ativa (não depende de AUTH_API_ATIVA):
// esta rota muda o que é cobrado de cada assinante. Idempotente: rodar de novo não altera nada
// que já esteja no valor certo; se a base falhar depois do Asaas, a próxima rodada conserta.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { ehGestor } from '@/lib/creditos'
import { atualizarValorAssinaturaNoAsaas } from '@/lib/asaas'
import { precoPlanoCentavos, formatarReais, SALARIO_MINIMO_REFERENCIA_CENTAVOS } from '@/lib/precos'
import { STATUS_EM_ANDAMENTO, avisarInspetor, dataBR } from '@/lib/assinaturas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NOMES: Record<string, string> = { 'PLANO MENSAL': 'Plano Mensal', 'PLANO ESCRITÓRIO': 'Plano Escritório' }

export async function POST(request: NextRequest) {
  try {
    const sessao = await sessaoDaRequisicao(request)
    if (!sessao) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
    if ((await ehGestor(sessao.cpf)) !== true) return NextResponse.json({ erro: 'Acesso restrito a gestores.' }, { status: 403 })

    const { simular } = await request.json().catch(() => ({} as { simular?: boolean }))
    const simulacao = simular !== false     // padrão: só simula

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await supabase.from('assinaturas')
      .select('id,cpf_inspetor,tipo,asaas_subscription_id,valor,proxima_cobranca,status')
      .in('status', STATUS_EM_ANDAMENTO)
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ erro: 'Recurso de assinatura ainda não habilitado neste ambiente.' }, { status: 503 })
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    const aReajustar: Array<{ id: number; tipo: string; de: string; para: string }> = []
    const reajustadas: number[] = []
    const falhas: string[] = []
    let inalteradas = 0
    let semVinculo = 0

    for (const a of data ?? []) {
      const novo = precoPlanoCentavos(a.tipo)
      const atual = Math.round(Number(a.valor) * 100)
      if (novo === null) continue
      if (novo === atual) { inalteradas++; continue }
      if (!a.asaas_subscription_id) { semVinculo++; continue }      // ainda sendo criada: nada a reajustar no Asaas
      aReajustar.push({ id: a.id, tipo: a.tipo, de: formatarReais(atual), para: formatarReais(novo) })
      if (simulacao) continue

      try {
        await atualizarValorAssinaturaNoAsaas(a.asaas_subscription_id, novo)
        const { error: errBase } = await supabase.from('assinaturas').update({ valor: novo / 100 }).eq('id', a.id)
        if (errBase) throw new Error(`Asaas atualizado, mas a base não: ${errBase.message} (rode de novo para conferir)`)
        reajustadas.push(a.id)
        await avisarInspetor(a.cpf_inspetor, 'AIMÊ — Novo valor da sua assinatura', [
          { tipo: 'p', texto: `O valor da sua assinatura do ${NOMES[a.tipo] ?? a.tipo} passa de ${formatarReais(atual)} para ${formatarReais(novo)} por mês. Os valores dos planos do AIMÊ acompanham o salário mínimo.` },
          { tipo: 'p', texto: `${a.proxima_cobranca ? `O novo valor vale a partir da próxima cobrança, em ${dataBR(a.proxima_cobranca)}. ` : ''}Se preferir não continuar, cancele a assinatura em Meu Plano e Créditos, no aplicativo.` },
        ])
      } catch (e) {
        falhas.push(`#${a.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    return NextResponse.json({
      simulado: simulacao,
      salarioMinimoReferencia: formatarReais(SALARIO_MINIMO_REFERENCIA_CENTAVOS),
      total: (data ?? []).length, inalteradas, semVinculo,
      aReajustar,
      ...(simulacao ? {} : { reajustadas: reajustadas.length, falhas }),
    })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}

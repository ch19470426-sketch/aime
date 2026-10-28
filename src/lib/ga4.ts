// src/lib/ga4.ts
// AIMÊ — Envio das compras ao Google Analytics 4 pelo SERVIDOR (Measurement Protocol). Marketing, 28/10/2026.
//
// REGRAS
//   * A liberação de créditos NUNCA depende do GA4. Quem libera só ENFILEIRA (enfileirarGa4: uma linha em ga4_envios,
//     única por cobrança+evento); o envio de verdade (processarFilaGa4) roda DEPOIS da resposta ao Asaas e, se falhar,
//     a linha continua 'pendente' para nova tentativa (próximo webhook ou cron diário).
//   * Variáveis (só servidor, sem NEXT_PUBLIC_): GA4_MEASUREMENT_ID e GA4_API_SECRET. Ausentes = nada é enviado e tudo
//     fica pendente. Os valores NUNCA vão para log, banco, teste ou commit (o payload gravado não tem chave nem id).
//   * Log: só "transaction_id + situação". Sem URL completa, sem CPF, sem dados de cartão.
//   * Consentimento: se não for 'granted' ou não houver client_id do GA, vai um client_id aleatório, sem session_id e com
//     consent ad_user_data/ad_personalization = DENIED.

import { createClient } from '@supabase/supabase-js'
import type { Atribuicao } from '@/lib/atribuicao'

export type EventoGa4 = 'purchase' | 'renovacao' | 'refund'

const ITENS: Record<string, { item_id: string; item_name: string }> = {
  'PLANO SERVIÇO': { item_id: 'servico', item_name: 'Plano Serviço' },
  'PLANO MENSAL': { item_id: 'mensal', item_name: 'Plano Mensal' },
  'PLANO ESCRITÓRIO': { item_id: 'escritorio', item_name: 'Plano Escritório' },
  'AVULSO': { item_id: 'creditos_avulsos', item_name: 'Créditos avulsos' },
}

const MAX_TENTATIVAS = 8
const TEMPO_LIMITE_MS = 4000

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/** billingType do Asaas -> payment_type do GA4. */
export function tipoDePagamento(billingType: string | null | undefined): string {
  const b = String(billingType ?? '').toUpperCase()
  return b === 'PIX' ? 'pix' : b === 'BOLETO' ? 'boleto' : b === 'CREDIT_CARD' ? 'cartao' : 'outro'
}

function clientIdAleatorio(): string {
  const n = Math.floor(Math.random() * 2_000_000_000) + 1
  return `${n}.${Math.floor(Date.now() / 1000)}`
}

/** Corpo do Measurement Protocol (sem measurement_id nem api_secret, que vão só na URL, na hora de enviar). */
export function montarCorpoGa4(p: {
  evento: EventoGa4
  transactionId: string
  valor: number                       // em reais, o realmente cobrado
  tipoPagamento?: string | null       // 'pix' | 'boleto' | 'cartao'
  plano: string                       // 'PLANO MENSAL', 'AVULSO'…
  atribuicao?: Atribuicao | null
}): Record<string, unknown> {
  const a = p.atribuicao
  const consentido = a?.consentimento === 'granted' && !!a.ga_client_id
  const item = ITENS[p.plano] ?? { item_id: 'outro', item_name: p.plano }
  const valor = Math.round(Number(p.valor) * 100) / 100
  const params: Record<string, unknown> = {
    ...(consentido && a?.ga_session_id ? { session_id: a.ga_session_id } : {}),
    engagement_time_msec: 1,
    transaction_id: p.transactionId,
    currency: 'BRL',
    value: valor,
    ...(p.tipoPagamento ? { payment_type: p.tipoPagamento } : {}),
    items: [{ item_id: item.item_id, item_name: item.item_name, price: valor, quantity: 1 }],
  }
  return {
    client_id: consentido ? a!.ga_client_id : clientIdAleatorio(),
    ...(consentido ? {} : { consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' } }),
    events: [{ name: p.evento === 'refund' ? 'refund' : p.evento, params }],
  }
}

function log(transactionId: string, situacao: 'enviado' | 'pendente' | 'falhou') {
  console.log('[ga4] transaction_id=%s situacao=%s', transactionId, situacao)
}

/** Põe o envio na fila (uma linha por cobrança+evento; repetir não duplica). Nunca lança erro. */
export async function enfileirarGa4(transactionId: string, evento: EventoGa4, corpo: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await admin().from('ga4_envios')
      .upsert({ transaction_id: transactionId, evento, payload: corpo }, { onConflict: 'transaction_id,evento', ignoreDuplicates: true })
    if (error) console.error('[ga4] não consegui enfileirar transaction_id=%s: %s', transactionId, error.message)
  } catch (e) {
    console.error('[ga4] não consegui enfileirar transaction_id=%s: %s', transactionId, e instanceof Error ? e.message : String(e))
  }
}

/**
 * Envia os pendentes (do mais antigo para o mais novo). Chamada DEPOIS da resposta ao Asaas (after) e pelo cron de
 * reprocessamento. Sem as variáveis do GA4, não envia: tudo continua pendente. Nunca lança erro.
 */
export async function processarFilaGa4(limite = 10): Promise<{ enviados: number; pendentes: number; falhas: number }> {
  const resumo = { enviados: 0, pendentes: 0, falhas: 0 }
  try {
    const id = (process.env.GA4_MEASUREMENT_ID ?? '').trim()
    const segredo = (process.env.GA4_API_SECRET ?? '').trim()
    const supabase = admin()
    const { data: fila, error } = await supabase.from('ga4_envios')
      .select('id,transaction_id,evento,payload,tentativas')
      .eq('status', 'pendente').order('criado_em', { ascending: true }).limit(limite)
    if (error || !fila) return resumo
    if (!id || !segredo) {
      for (const l of fila) log(l.transaction_id, 'pendente')
      resumo.pendentes = fila.length
      return resumo
    }
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(id)}&api_secret=${encodeURIComponent(segredo)}`
    for (const l of fila) {
      // Reserva atômica (trava otimista em "tentativas"): se dois processamentos pegarem a mesma linha ao mesmo tempo, só um
      // consegue reservá-la e envia; o outro pula. Evita purchase em dobro quando dois avisos chegam juntos.
      const { data: reservada } = await supabase.from('ga4_envios')
        .update({ tentativas: l.tentativas + 1 }).eq('id', l.id).eq('tentativas', l.tentativas).eq('status', 'pendente').select('id')
      if (!reservada || reservada.length === 0) continue
      let erro = ''
      try {
        const res = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(l.payload), signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
        })
        if (!res.ok) erro = `HTTP ${res.status}`
      } catch (e) {
        erro = e instanceof Error ? e.name : 'erro'   // só o tipo do erro: a mensagem pode trazer a URL com a chave
      }
      if (!erro) {
        await supabase.from('ga4_envios').update({ status: 'enviado', enviado_em: new Date().toISOString(), ultimo_erro: null }).eq('id', l.id)
        log(l.transaction_id, 'enviado'); resumo.enviados++
      } else {
        const tentativas = l.tentativas + 1
        const desiste = tentativas >= MAX_TENTATIVAS
        await supabase.from('ga4_envios').update({ status: desiste ? 'falhou' : 'pendente', ultimo_erro: erro }).eq('id', l.id)
        log(l.transaction_id, desiste ? 'falhou' : 'pendente')
        if (desiste) resumo.falhas++; else resumo.pendentes++
      }
    }
  } catch (e) {
    console.error('[ga4] fila: %s', e instanceof Error ? e.name : 'erro')
  }
  return resumo
}

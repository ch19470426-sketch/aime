// src/lib/eventosAsaas.ts
// AIMÊ — Registro dos eventos recebidos do Asaas (tabela eventos_asaas) e reprocessamento dos que falharam.
//
// POR QUE: o Asaas pode entregar o MESMO evento mais de uma vez, e uma falha de infraestrutura (banco fora do ar) não deve
// virar 500 para o Asaas (15 falhas seguidas PAUSAM a fila do webhook). Então o evento é gravado ANTES de processar; se o
// processamento falhar, a linha fica 'erro' e é reprocessada depois (próximo webhook ou cron diário), sem perder o pagamento.
// A idempotência dos CRÉDITOS continua sendo a reserva atômica do pedido (src/lib/pagamentos.ts): reprocessar é seguro.
//
// Tolerante: se a tabela não existir (SQL ainda não aplicado), nada aqui lança erro e o webhook segue como antes.
import { createClient } from '@supabase/supabase-js'
import { processarCobranca } from '@/lib/pagamentos'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/** registrado=false: não deu para gravar (sem id, ou tabela ausente) — o chamador usa o caminho antigo (500 para o Asaas reentregar). */
export async function registrarEvento(e: { eventoId?: string; evento: string; paymentId?: string; statusNoAviso?: string }):
  Promise<{ registrado: boolean; jaProcessado: boolean }> {
  if (!e.eventoId) return { registrado: false, jaProcessado: false }
  try {
    const supabase = admin()
    const { error } = await supabase.from('eventos_asaas').insert({
      evento_id: e.eventoId, evento: e.evento, payment_id: e.paymentId ?? null, status_no_aviso: e.statusNoAviso ?? null,
    })
    if (!error) return { registrado: true, jaProcessado: false }
    if (error.code === '23505') {   // o mesmo evento chegou de novo
      const { data } = await supabase.from('eventos_asaas').select('situacao').eq('evento_id', e.eventoId).maybeSingle()
      return { registrado: true, jaProcessado: data?.situacao === 'processado' }
    }
    return { registrado: false, jaProcessado: false }
  } catch { return { registrado: false, jaProcessado: false } }
}

export async function concluirEvento(eventoId: string | undefined, situacao: 'processado' | 'erro', erro?: string): Promise<void> {
  if (!eventoId) return
  try {
    await admin().from('eventos_asaas').update({
      situacao, erro: erro ? erro.slice(0, 300) : null, processado_em: new Date().toISOString(),
    }).eq('evento_id', eventoId)
  } catch { /* melhor esforço */ }
}

/** Reprocessa eventos que falharam (mais antigos primeiro). Seguro repetir: a concessão de créditos é idempotente. */
export async function reprocessarEventosComErro(limite = 5): Promise<{ tentados: number; resolvidos: number }> {
  const r = { tentados: 0, resolvidos: 0 }
  try {
    const supabase = admin()
    const { data } = await supabase.from('eventos_asaas')
      .select('evento_id,evento,payment_id,status_no_aviso').eq('situacao', 'erro')
      .order('recebido_em', { ascending: true }).limit(limite)
    for (const ev of data ?? []) {
      if (!ev.payment_id) { await concluirEvento(ev.evento_id, 'processado'); continue }
      r.tentados++
      try {
        const res = await processarCobranca(ev.payment_id, ev.evento, ev.status_no_aviso ?? '', null)
        if (res.status < 500) { await concluirEvento(ev.evento_id, 'processado'); r.resolvidos++ }
        else await concluirEvento(ev.evento_id, 'erro', String(res.corpo?.erro ?? 'erro'))
      } catch (e) {
        await concluirEvento(ev.evento_id, 'erro', e instanceof Error ? e.message : String(e))
      }
    }
  } catch { /* melhor esforço */ }
  return r
}

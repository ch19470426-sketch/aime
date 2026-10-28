// src/lib/atribuicaoServidor.ts
// AIMÊ — Grava a origem da venda (tabela atribuicao_compra) quando o pedido ou a assinatura é criado.
// Melhor esforço: se a tabela ainda não existir ou der erro, a compra segue normalmente (só some a atribuição).
import { createClient } from '@supabase/supabase-js'
import { sanitizarAtribuicao, type Atribuicao } from '@/lib/atribuicao'

export async function guardarAtribuicao(p: {
  pedidoId?: number; assinaturaId?: number
  plano: string; valor: number
  atribuicaoBruta: unknown
}): Promise<void> {
  try {
    const a = sanitizarAtribuicao(p.atribuicaoBruta)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const chave = p.pedidoId ? 'pedido_id' : 'assinatura_id'
    const { error } = await supabase.from('atribuicao_compra').upsert({
      ...(p.pedidoId ? { pedido_id: p.pedidoId } : { assinatura_id: p.assinaturaId }),
      ga_client_id: a.ga_client_id, ga_session_id: a.ga_session_id, origem: a.origem, consentimento: a.consentimento,
      plano: p.plano, valor: p.valor, tipo: 'nova',
    }, { onConflict: chave, ignoreDuplicates: true })
    if (error && error.code !== '42P01') console.error('[atribuicao] não consegui gravar:', error.message)
  } catch (e) {
    console.error('[atribuicao] não consegui gravar:', e instanceof Error ? e.message : String(e))
  }
}

/** Lê a origem ligada a um pedido (compra única) ou, na falta, à assinatura dele (renovações reaproveitam a 1ª cobrança). */
export async function lerAtribuicao(pedidoId: number, assinaturaId?: number | null): Promise<Atribuicao | null> {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    let linha: Record<string, unknown> | null = (await supabase.from('atribuicao_compra').select('*').eq('pedido_id', pedidoId).maybeSingle()).data
    if (!linha && assinaturaId) linha = (await supabase.from('atribuicao_compra').select('*').eq('assinatura_id', assinaturaId).maybeSingle()).data
    return linha ? sanitizarAtribuicao(linha) : null
  } catch { return null }
}

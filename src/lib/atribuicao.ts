// src/lib/atribuicao.ts
// AIMÊ — Origem da venda (marketing, 28/10/2026). Funções PURAS, usadas no navegador (ao comprar) e no servidor
// (ao validar o que o navegador mandou). Nada aqui lê cookie nem sessionStorage por conta própria.
//
// O que guardamos por compra, para o envio ao Google Analytics 4 ligar a venda à visita que a gerou:
//   * ga_client_id   — do cookie _ga:  GA1.1.XXXXXXXXXX.YYYYYYYYYY  ->  XXXXXXXXXX.YYYYYYYYYY
//   * ga_session_id  — do cookie _ga_<ID>: GS1.1.<sessao>.…  ou  GS2.1.s<sessao>$…
//   * origem         — gclid, gbraid, wbraid, fbclid e utm_* da URL de entrada
//   * consentimento  — valor do cookie aime_consent_v1 ('granted' ou 'denied')

export const CHAVES_ORIGEM = [
  'gclid', 'gbraid', 'wbraid', 'fbclid',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
] as const

export type Atribuicao = {
  ga_client_id: string | null
  ga_session_id: string | null
  origem: Record<string, string>
  consentimento: 'granted' | 'denied' | null
}

export const ATRIBUICAO_VAZIA: Atribuicao = { ga_client_id: null, ga_session_id: null, origem: {}, consentimento: null }

/** 'GA1.1.123456789.1700000000' -> '123456789.1700000000'; qualquer outro formato -> null. */
export function gaClientIdDoCookie(valor: string | null | undefined): string | null {
  const m = /^GA\d+\.\d+\.(\d{1,12}\.\d{1,12})$/.exec(String(valor ?? '').trim())
  return m ? m[1] : null
}

/** 'GS1.1.1700000000.1.1.…' ou 'GS2.1.s1700000000$o1$g1…' -> '1700000000'; senão null. */
export function gaSessionIdDoCookie(valor: string | null | undefined): string | null {
  const v = String(valor ?? '').trim()
  const gs1 = /^GS1\.\d+\.(\d{1,15})(?:\.|$)/.exec(v)
  if (gs1) return gs1[1]
  const gs2 = /^GS2\.\d+\.s(\d{1,15})(?:\$|$)/.exec(v)
  return gs2 ? gs2[1] : null
}

/** Valor de um cookie pelo nome (texto de document.cookie). */
export function valorDoCookie(cookies: string, nome: string): string | null {
  for (const parte of cookies.split(';')) {
    const i = parte.indexOf('=')
    if (i < 0) continue
    if (parte.slice(0, i).trim() === nome) {
      try { return decodeURIComponent(parte.slice(i + 1).trim()) } catch { return parte.slice(i + 1).trim() }
    }
  }
  return null
}

/** Primeiro cookie _ga_<ID> (o do fluxo do GA4 deste site), sem fixar o ID no código do navegador. */
export function cookieDeSessaoGa(cookies: string): string | null {
  for (const parte of cookies.split(';')) {
    const nome = parte.slice(0, Math.max(parte.indexOf('='), 0)).trim()
    if (/^_ga_[A-Za-z0-9]+$/.test(nome)) return valorDoCookie(cookies, nome)
  }
  return null
}

/** Pega, da query string, só as chaves de origem permitidas (valor curto e sem caracteres de controle). */
export function origemDaUrl(busca: string): Record<string, string> {
  const params = new URLSearchParams(busca)
  const achado: Record<string, string> = {}
  for (const k of CHAVES_ORIGEM) {
    const v = limparTexto(params.get(k))
    if (v) achado[k] = v
  }
  return achado
}

function limparTexto(v: unknown): string {
  return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200) : ''
}

/** O QUE O SERVIDOR ACEITA do navegador: formato estrito, chaves conhecidas, tamanhos limitados. Nunca lança erro. */
export function sanitizarAtribuicao(bruto: unknown): Atribuicao {
  const b = (bruto && typeof bruto === 'object' ? bruto : {}) as Record<string, unknown>
  const cid = typeof b.ga_client_id === 'string' && /^\d{1,12}\.\d{1,12}$/.test(b.ga_client_id) ? b.ga_client_id : null
  const sid = typeof b.ga_session_id === 'string' && /^\d{1,15}$/.test(b.ga_session_id) ? b.ga_session_id : null
  const origem: Record<string, string> = {}
  const o = (b.origem && typeof b.origem === 'object' ? b.origem : {}) as Record<string, unknown>
  for (const k of CHAVES_ORIGEM) {
    const v = limparTexto(o[k])
    if (v) origem[k] = v
  }
  const c = b.consentimento === 'granted' ? 'granted' : b.consentimento === 'denied' ? 'denied' : null
  return { ga_client_id: cid, ga_session_id: sid, origem, consentimento: c }
}

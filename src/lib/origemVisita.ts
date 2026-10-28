// src/lib/origemVisita.ts
// AIMÊ — Origem da visita, NO NAVEGADOR (marketing, 28/10/2026).
//   guardarOrigemDaUrl(): na 1ª carga, guarda em sessionStorage (chave aime_origem) os parâmetros de campanha da URL,
//                         sem sobrescrever o que já foi guardado nesta sessão.
//   atribuicaoAtual():    monta o que vai junto com o pedido de compra (cookies do Google Analytics + origem + consentimento).
// Tudo em try/catch: sessionStorage ou cookies bloqueados nunca podem atrapalhar a compra.
import {
  type Atribuicao, ATRIBUICAO_VAZIA, origemDaUrl, sanitizarAtribuicao,
  valorDoCookie, cookieDeSessaoGa, gaClientIdDoCookie, gaSessionIdDoCookie,
} from '@/lib/atribuicao'

const CHAVE = 'aime_origem'

function lerGuardada(): Record<string, string> {
  try { return sanitizarAtribuicao({ origem: JSON.parse(sessionStorage.getItem(CHAVE) ?? '{}') }).origem } catch { return {} }
}

export function guardarOrigemDaUrl(): void {
  try {
    const novos = origemDaUrl(window.location.search)
    if (Object.keys(novos).length === 0) return
    const guardados = lerGuardada()
    const mesclado = { ...novos, ...guardados }   // o que já estava guardado vence (não sobrescreve)
    sessionStorage.setItem(CHAVE, JSON.stringify(mesclado))
  } catch { /* storage indisponível: segue sem origem */ }
}

export function atribuicaoAtual(): Atribuicao {
  try {
    const cookies = document.cookie
    const consent = valorDoCookie(cookies, 'aime_consent_v1')
    return {
      ga_client_id: gaClientIdDoCookie(valorDoCookie(cookies, '_ga')),
      ga_session_id: gaSessionIdDoCookie(cookieDeSessaoGa(cookies)),
      origem: lerGuardada(),
      consentimento: consent === 'granted' ? 'granted' : consent === 'denied' ? 'denied' : null,
    }
  } catch { return ATRIBUICAO_VAZIA }
}

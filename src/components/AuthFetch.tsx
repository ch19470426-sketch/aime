'use client'
// AIMÊ — Envia o token de sessão automaticamente nas chamadas fetch para a
// própria API (/api/...). Assim as páginas continuam chamando fetch('/api/...')
// exatamente como antes e o servidor consegue saber quem está chamando.
//
// Regras de segurança do wrapper:
//   * só mexe em requisições para /api/ do próprio site (nunca no Supabase,
//     nunca em domínios externos — evita vazar o token e evita recursão);
//   * nunca sobrescreve um Authorization que a chamada já tenha;
//   * nunca impede a requisição original: qualquer falha ao obter o token
//     (ou demora > 1,5 s) e a chamada segue sem o cabeçalho — o cookie de
//     sessão continua valendo no servidor como segunda via.

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const LIMITE_MS = 1500

function urlDe(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

export default function AuthFetch() {
  useEffect(() => {
    const w = window as unknown as { __aimeAuthFetch?: boolean }
    if (w.__aimeAuthFetch) return
    w.__aimeAuthFetch = true

    const original = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url = urlDe(input)
        const ehApiPropria = url.startsWith('/api/') || url.startsWith(window.location.origin + '/api/')
        if (ehApiPropria) {
          const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
          if (!headers.has('Authorization')) {
            const sessao = await Promise.race([
              createClient().auth.getSession(),
              new Promise<null>(r => setTimeout(() => r(null), LIMITE_MS)),
            ])
            const token = sessao && 'data' in sessao ? sessao.data.session?.access_token : undefined
            if (token) {
              headers.set('Authorization', `Bearer ${token}`)
              return original(input, { ...init, headers })
            }
          }
        }
      } catch { /* nunca impede a requisição original */ }
      return original(input, init)
    }
  }, [])
  return null
}

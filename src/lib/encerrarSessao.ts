// src/lib/encerrarSessao.ts
// AIMÊ — Saída da sessão (cliente) À PROVA DE FALHA.
//
// PROBLEMA (08/10/2026): "Sair do Aplicativo" chamava só auth.signOut() e ia para "/". Se o pedido de saída ao
// Supabase falhasse com um erro diferente de 401/403/404 (rede lenta, erro do servidor), a biblioteca devolvia o
// erro ANTES de apagar a sessão local; a tela inicial via que ainda havia sessão e mandava de volta ao Dashboard
// (o Macro Fluxo), em vez do login.
//
// AGORA: tenta sair pelo servidor (com limite de tempo), e DEPOIS apaga à força tudo o que o Supabase guarda no
// navegador (cookies e armazenamento com prefixo "sb-"), com ou sem sucesso na chamada ao servidor.

import { createClient } from '@/utils/supabase/client'

/** Apaga cookies, localStorage e sessionStorage cujo nome começa com "sb-" (sessão do Supabase). Nunca lança erro. */
export function limparSessaoDoNavegador(): void {
  try { Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k)) } catch { /* sem localStorage */ }
  try { Object.keys(sessionStorage).filter(k => k.startsWith('sb-')).forEach(k => sessionStorage.removeItem(k)) } catch { /* sem sessionStorage */ }
  try {
    document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => n.startsWith('sb-')).forEach(nome => {
      document.cookie = `${nome}=; Max-Age=0; path=/`   // inclui as partes ".0", ".1" de sessões grandes
    })
  } catch { /* sem cookies */ }
}

export async function encerrarSessao(limiteMs = 5000): Promise<void> {
  try {
    await Promise.race([
      createClient().auth.signOut(),
      new Promise<void>(resolve => setTimeout(resolve, limiteMs)),
    ])
  } catch { /* se a saída pelo servidor falhar, a limpeza abaixo resolve */ }
  limparSessaoDoNavegador()
}

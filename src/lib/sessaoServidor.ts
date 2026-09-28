// src/lib/sessaoServidor.ts
// AIMÊ — Identifica QUEM está chamando uma rota de API, validando a sessão no
// Supabase Auth (nunca confia em CPF enviado no corpo da requisição).
//
// A sessão pode chegar de DUAS formas, e as duas são aceitas:
//   1. Cabeçalho `Authorization: Bearer <access_token>` — enviado
//      automaticamente pelo app (components/AuthFetch.tsx) nas chamadas fetch.
//   2. Cookie de sessão do Supabase — enviado sozinho pelo navegador em
//      qualquer requisição do mesmo site: navegações (abrir um documento em
//      nova aba) e também o service worker (sincronização offline), que não
//      passa pelo AuthFetch.
//
// Contexto: o login do app cria usuários com e-mail técnico
// "<cpf>@aime-app.com.br" (ver app/page.tsx), e todas as telas derivam o CPF
// da sessão por email.split('@')[0] — aqui fazemos o mesmo, só que validado
// no servidor de autenticação.

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const DOMINIO_TECNICO = '@aime-app.com.br'

export type SessaoServidor = { cpf: string; via: 'bearer' | 'cookie' }

function cpfDoEmail(email: string | undefined | null): string | null {
  const e = (email ?? '').toLowerCase()
  if (!e.endsWith(DOMINIO_TECNICO)) return null
  const cpf = e.split('@')[0].replace(/\D/g, '')
  return cpf || null
}

async function viaBearer(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization') ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  const token = auth.slice(7).trim()
  if (!token) return null
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await supabase.auth.getUser(token)
    if (error) return null
    return cpfDoEmail(data?.user?.email)
  } catch { return null }
}

async function viaCookie(request: NextRequest): Promise<string | null> {
  const todos = request.cookies.getAll()
  // Atalho: sem nenhum cookie de sessão do Supabase, nem consulta o servidor.
  if (!todos.some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'))) return null
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => todos, setAll: () => { /* somente leitura */ } } }
    )
    const { data, error } = await supabase.auth.getUser()
    if (error) return null
    return cpfDoEmail(data?.user?.email)
  } catch { return null }
}

/**
 * Sessão válida do chamador, ou null. Tenta o cabeçalho primeiro e depois o
 * cookie. O token é sempre validado no servidor de autenticação do Supabase.
 */
export async function sessaoDaRequisicao(request: NextRequest): Promise<SessaoServidor | null> {
  const b = await viaBearer(request)
  if (b) return { cpf: b, via: 'bearer' }
  const c = await viaCookie(request)
  if (c) return { cpf: c, via: 'cookie' }
  return null
}

/** Atalho: só o CPF (dígitos) da sessão, ou null. */
export async function cpfDaSessao(request: NextRequest): Promise<string | null> {
  return (await sessaoDaRequisicao(request))?.cpf ?? null
}

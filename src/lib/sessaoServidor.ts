// src/lib/sessaoServidor.ts
// AIMÊ — Identifica QUEM está chamando uma rota de API, validando o token
// de sessão no Supabase Auth (não confia em CPF enviado no corpo).
//
// Contexto: a maior parte das rotas antigas do app aceita o CPF no corpo
// da requisição e usa a chave de serviço — quem souber a URL consegue agir
// em nome de qualquer CPF. Rotas que mexem com créditos/dinheiro devem usar
// este helper. O login do app cria usuários com e-mail técnico
// "<cpf>@aime-app.com.br" (ver app/page.tsx), e todas as telas derivam o CPF
// da sessão por email.split('@')[0] — aqui fazemos o mesmo, só que validado.

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DOMINIO_TECNICO = '@aime-app.com.br'

/**
 * Lê o header `Authorization: Bearer <access_token>`, valida o token no
 * Supabase Auth e devolve o CPF (só dígitos) do usuário logado.
 * Retorna null se não houver token, se for inválido/expirado, ou se o
 * usuário não for do domínio técnico do app.
 */
export async function cpfDaSessao(request: NextRequest): Promise<string | null> {
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
    const email = data?.user?.email ?? ''
    if (error || !email.endsWith(DOMINIO_TECNICO)) return null
    const cpf = email.split('@')[0].replace(/\D/g, '')
    return cpf || null
  } catch {
    return null
  }
}

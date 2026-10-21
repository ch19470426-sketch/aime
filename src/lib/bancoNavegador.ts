// src/lib/bancoNavegador.ts
// AIMÊ — Credencial das chamadas ao banco feitas pelo NAVEGADOR: o LOGIN do usuário (token da sessão), e não a chave pública. Com o login, as políticas de
// proteção por linha do banco sabem quem está lendo (cada inspetor lê o que é dele); com a chave pública, qualquer pessoa, logada ou não, passa por anônima.
// Sem sessão (usuário não logado) cai na chave pública, que as políticas não deixam ler nada de sensível.
import { createClient } from '@/utils/supabase/client'

export async function credencialDoBanco(): Promise<string> {
  const publica = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  try {
    const { data } = await createClient().auth.getSession()
    return data.session?.access_token ?? publica
  } catch {
    return publica
  }
}

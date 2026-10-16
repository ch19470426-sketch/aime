// src/lib/perfilApoioServidor.ts
// AIMÊ — Perfil de apoio (Eng Elétrico / Eng Mecânico) de um CPF, pelo título profissional do cadastro. SÓ no servidor: usa a chave de serviço.
import { createClient } from '@supabase/supabase-js'
import { perfilDoTitulo, type PerfilApoio } from './profissionaisDeApoio'

/** null se o CPF não existe, se o título não é de apoio ou se a consulta falha (quem chama decide o que fazer sem o perfil). */
export async function perfilDoProfissional(cpf: unknown): Promise<PerfilApoio | null> {
  const limpo = String(cpf ?? '').replace(/\D/g, '')
  if (!limpo) return null
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await sb.from('inspetor').select('titulo_profissional').eq('cpf_inspetor', limpo).single()
    if (error || !data) return null
    return perfilDoTitulo((data as { titulo_profissional?: string | null }).titulo_profissional)
  } catch (e) {
    console.error('[perfil-apoio] consulta falhou:', e)
    return null
  }
}

// src/lib/chaveInspetor.ts
// AIMÊ — Chave de inspetor (INS-001, INS-002, ... INS-999, INS-1000...), SEMPRE decidida no servidor.
//
// Por que importa: os arquivos de vistoria e de documentos têm o nome começando pela chave ("INS-001_<cnpj>_..."), e a
// auditoria de dono (src/lib/autorizacao.ts) só deixa o usuário mexer em arquivo cujo nome começa com a chave dele. Se duas
// pessoas tivessem a mesma chave, ou se alguém pudesse gravar no próprio cadastro a chave de outro, veriam os arquivos uma
// da outra. Por isso:
//  - a chave nasce de uma SEQUÊNCIA do Postgres (função proxima_chave_inspetor, sql/2026-10-13_sequencia_chave_inspetor.sql):
//    nunca volta atrás, não reaproveita número de inspetor apagado e não tem corrida entre dois cadastros simultâneos;
//  - o banco tem índice único em inspetor.chave_inspetor;
//  - nenhuma rota grava uma chave vinda do navegador.
import type { SupabaseClient } from '@supabase/supabase-js'

/** INS-001 ... INS-999 (com zeros à esquerda até 3 dígitos); a partir do milésimo, INS-1000 (sem cortar dígitos). */
export const formatarChave = (n: number): string => 'INS-' + String(n).padStart(3, '0')

/** Maior número entre as chaves existentes, comparando como NÚMERO (pela ordem do texto, INS-999 viria depois de INS-1000). */
async function maiorNumeroExistente(sb: SupabaseClient): Promise<number> {
  const { data, error } = await sb.from('inspetor').select('chave_inspetor').like('chave_inspetor', 'INS-%')
  if (error) throw new Error(error.message)
  let maior = 0
  for (const linha of data ?? []) {
    const m = /^INS-(\d+)$/.exec(String(linha.chave_inspetor ?? ''))
    if (m) maior = Math.max(maior, parseInt(m[1], 10))
  }
  return maior
}

/**
 * Próxima chave livre. Usa a sequência do banco; se a função ainda não existir (o SQL não foi executado), cai no maior
 * número existente mais um, que é o comportamento antigo já corrigido para comparar números (menos seguro: não evita
 * a corrida entre dois cadastros simultâneos, que o índice único então barra).
 */
export async function proximaChaveInspetor(sb: SupabaseClient): Promise<string> {
  const { data, error } = await sb.rpc('proxima_chave_inspetor')
  if (!error && typeof data === 'string' && /^INS-\d+$/.test(data)) return data
  console.warn('[chaveInspetor] sequência indisponível, usando o maior número existente:', error?.message ?? 'resposta inesperada')
  return formatarChave((await maiorNumeroExistente(sb)) + 1)
}

/**
 * A chave do inspetor `cpf`: devolve a que ele já tem ou, se o cadastro for antigo e estiver sem chave, atribui uma nova.
 * Só grava onde a chave está vazia (se outra chamada gravar primeiro, devolve a gravada). Null se o cadastro não existe.
 */
export async function garantirChaveDoInspetor(sb: SupabaseClient, cpf: string): Promise<string | null> {
  const { data: atual, error } = await sb.from('inspetor').select('chave_inspetor').eq('cpf_inspetor', cpf).maybeSingle()
  if (error || !atual) return null
  if (atual.chave_inspetor) return String(atual.chave_inspetor)

  const nova = await proximaChaveInspetor(sb)
  const { data: gravada } = await sb.from('inspetor').update({ chave_inspetor: nova })
    .eq('cpf_inspetor', cpf).is('chave_inspetor', null).select('chave_inspetor')
  if (gravada && gravada.length > 0) return nova

  const { data: depois } = await sb.from('inspetor').select('chave_inspetor').eq('cpf_inspetor', cpf).maybeSingle()
  return depois?.chave_inspetor ? String(depois.chave_inspetor) : null
}

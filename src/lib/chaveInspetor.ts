// src/lib/chaveInspetor.ts
// AIMÊ — A chave do inspetor é o CPF (somente dígitos), decidida no servidor.
//
// Histórico: a chave já foi o CPF, depois virou um código sequencial (INS-001, INS-002...). O código sequencial não atendia: era
// uma segunda identidade a manter além do CPF (que é a chave do cadastro, do contrato, do login e das cobranças), não dava
// segurança (sequencial e fácil de adivinhar), tinha limite e defeitos de contagem (INS-999 x INS-1000, reaproveitamento de número
// de inspetor apagado, cadastros simultâneos com a mesma chave). Em 13/10/2026 Celso decidiu voltar ao CPF.
//
// Os arquivos de vistoria e de documentos têm o nome começando pela chave ("<cpf>_<cnpj>_<serviço>_<nº>.json"), e a auditoria
// de dono (src/lib/autorizacao.ts) só deixa o usuário mexer em arquivo cujo nome começa com a chave dele. Por isso:
//  - nenhuma rota grava uma chave vinda do navegador (antes, quem tivesse a chave vazia podia gravar a de outro inspetor);
//  - cadastros que ainda têm uma chave INS-nnn (de antes da migração, ver sql/2026-10-13_chave_inspetor_igual_cpf.sql e
//    /api/gestor/migrar-chave-para-cpf) mantêm essa chave até a migração; depois dela, a chave de todos é o CPF.
import type { SupabaseClient } from '@supabase/supabase-js'

/** A chave de um CPF: o próprio CPF, só dígitos. */
export const chaveDoCpf = (cpf: unknown): string => String(cpf ?? '').replace(/\D/g, '')

/**
 * A chave do inspetor `cpf`: devolve a que o cadastro já tem (que pode ser uma INS-nnn antiga, até a migração) ou, se o cadastro
 * antigo estiver sem chave, grava o CPF como chave. Só grava onde a chave está vazia (se outra chamada gravar primeiro, devolve a
 * gravada). Null se o cadastro não existe.
 */
export async function garantirChaveDoInspetor(sb: SupabaseClient, cpf: string): Promise<string | null> {
  const { data: atual, error } = await sb.from('inspetor').select('chave_inspetor').eq('cpf_inspetor', cpf).maybeSingle()
  if (error || !atual) return null
  if (atual.chave_inspetor) return String(atual.chave_inspetor)

  const nova = chaveDoCpf(cpf)
  const { data: gravada } = await sb.from('inspetor').update({ chave_inspetor: nova })
    .eq('cpf_inspetor', cpf).is('chave_inspetor', null).select('chave_inspetor')
  if (gravada && gravada.length > 0) return nova

  const { data: depois } = await sb.from('inspetor').select('chave_inspetor').eq('cpf_inspetor', cpf).maybeSingle()
  return depois?.chave_inspetor ? String(depois.chave_inspetor) : null
}

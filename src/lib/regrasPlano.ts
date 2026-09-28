// src/lib/regrasPlano.ts
// AIMÊ — Regras de negócio de troca de plano.
//
// Regra: NÃO é permitido migrar de PLANO MENSAL, PLANO SERVIÇO ou PLANO
// ESCRITÓRIO para PLANO CORTESIA. (Cortesia é a porta de entrada, concedida
// uma única vez; quem já tem plano pago não pode "voltar" a ela, senão
// ganharia os créditos de Cortesia de graça.)
//
// Este helper é usado por trocar-plano e gestor/atribuir-plano. A rota
// salvar-contrato tem a mesma checagem embutida (já testada e aprovada).

import type { SupabaseClient } from '@supabase/supabase-js'

export const PLANOS_PAGOS = ['PLANO MENSAL', 'PLANO SERVIÇO', 'PLANO ESCRITÓRIO']

/**
 * Devolve a mensagem de bloqueio se o plano ATUAL (contrato mais recente) do
 * CPF for pago; null se puder prosseguir para Cortesia.
 *
 * Diferente do acesso ao app, aqui a falha de leitura BLOQUEIA: liberar por
 * engano significaria conceder créditos de graça.
 */
export async function bloqueioMigracaoParaCortesia(
  supabase: SupabaseClient,
  cpf: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('contratos_inspetor')
    .select('tipo_assinatura')
    .eq('cpf_inspetor', cpf)
    .order('data_inicio_contrato', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return 'Não foi possível verificar o plano atual. Tente novamente.'

  const atual = data?.tipo_assinatura ?? ''
  if (PLANOS_PAGOS.includes(atual)) {
    return `Não é permitido migrar de ${atual} para PLANO CORTESIA.`
  }
  return null
}

// src/lib/higienizacao.ts
// AIMÊ — Higienização de diretórios (especificação de projeto, item 3.7).
//
// Exclui, com mais de N dias (185 por padrão):
//   a) Storage "vistorias/"           — pelo created_at do próprio arquivo
//   b) Storage "documentos_inspetor/" — idem, EXCETO o Termo de Aceite AIMÊ
//   c) Tabela dados_vistoria          — pelo campo data_homologacao
//   d) Tabela ativos_a_vistoriar      — pelo campo data_cadastro
//
// Definições confirmadas com Celso em 29/09/2026:
//   - Prazo: 185 dias (não 365 — a especificação original continha as duas
//     grafias, contraditórias entre si)
//   - dados_vistoria usa data_homologacao (não data_vistoria)
//   - ativos_a_vistoriar usa data_cadastro (não existe campo de "fim de
//     vistoria" nessa tabela — foi a definição mais próxima disponível)
//
// Este módulo só SELECIONA o que deveria ser excluído — não toca no banco
// nem no Storage. A rota (route.ts) decide o que fazer com a seleção
// (excluir de verdade, ou só relatar em modo simulação).

export const PRAZO_PADRAO_DIAS = 185
/** Pedidos de crédito nunca pagos: cancelados após este prazo (bem mais
 *  curto que o dos diretórios — decisão de Celso, 29/09/2026). */
export const PRAZO_PEDIDOS_NAO_PAGOS_DIAS = 15

/** Padrão de nome que NUNCA deve ser excluído de documentos_inspetor. */
const PRESERVAR_SEMPRE = /_termo_de_aceite\.html$/i

export type ArquivoStorage = { name: string; created_at: string | null }
export type LinhaComData = { [chave: string]: unknown }

/** Data de corte: tudo com data ANTERIOR a esta é elegível para exclusão. */
export function dataCorte(hoje: Date, prazoDias: number): Date {
  const corte = new Date(hoje)
  corte.setUTCDate(corte.getUTCDate() - prazoDias)
  return corte
}

/**
 * Arquivos de "vistorias/" elegíveis para exclusão: created_at mais antigo
 * que a data de corte. Arquivos sem created_at (nunca deveria acontecer,
 * mas por segurança) NÃO são selecionados — na dúvida, preserva.
 */
export function selecionarArquivosVistorias(arquivos: ArquivoStorage[], corte: Date): ArquivoStorage[] {
  return arquivos.filter(a => a.created_at && new Date(a.created_at) < corte)
}

/**
 * Arquivos de "documentos_inspetor/" elegíveis: mesma regra, MENOS o Termo
 * de Aceite AIMÊ, que nunca é excluído (exigência explícita da especificação).
 */
export function selecionarArquivosDocumentos(arquivos: ArquivoStorage[], corte: Date): ArquivoStorage[] {
  return arquivos.filter(a => !PRESERVAR_SEMPRE.test(a.name) && a.created_at && new Date(a.created_at) < corte)
}

/**
 * Linhas de tabela elegíveis: campo de data (string 'AAAA-MM-DD' ou null)
 * anterior à data de corte. Linha com o campo NULO não é selecionada — na
 * dúvida, preserva (ex.: vistoria ainda não homologada não pode ser
 * excluída só porque é antiga).
 */
export function selecionarLinhasPorData<T extends LinhaComData>(
  linhas: T[], campo: string, corte: Date
): T[] {
  const corteISO = corte.toISOString().slice(0, 10)
  return linhas.filter(l => {
    const v = l[campo]
    return typeof v === 'string' && v.length >= 10 && v.slice(0, 10) < corteISO
  })
}

/**
 * Pedidos de contratação (pedidos_credito) elegíveis para cancelamento:
 * status ainda 'aguardando_pagamento' E criados antes da data de corte.
 * Pedidos já pagos ou já cancelados nunca são selecionados aqui — só a
 * "sujeira" de carrinho abandonado.
 */
export function selecionarPedidosNaoPagos<T extends LinhaComData & { status?: unknown }>(
  pedidos: T[], corte: Date
): T[] {
  const corteISO = corte.toISOString().slice(0, 10)
  return pedidos.filter(p => {
    if (p.status !== 'aguardando_pagamento') return false
    const v = p['criado_em']
    return typeof v === 'string' && v.length >= 10 && v.slice(0, 10) < corteISO
  })
}

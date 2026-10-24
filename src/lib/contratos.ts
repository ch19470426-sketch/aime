// src/lib/contratos.ts
// AIMÊ — Qual é o contrato "corrente" de um inspetor (sem dependência de servidor: a tela e o servidor
// usam o mesmo critério).
//
// Por que existe (07/10/2026, achado de Celso): o avulso era gravado no "contrato vigente com a data de
// início mais recente". Nos testes todos os contratos começam no MESMO dia, então havia empate, e o
// banco podia devolver o plano já ENCERRADO pela troca de plano em vez do atual — o avulso ia parar
// num contrato antigo, que a tela ainda mostrava como plano em aberto.
//
// Critério, em ordem: (1) só contratos vigentes; (2) se algum tem plano contratado, só esses (o contrato
// de "só avulso" é o último recurso); (3) quem tem crédito primeiro — um plano encerrado pela troca está
// zerado, o atual não; (4) início mais recente; (5) fim mais tarde.

export type ContratoBasico = {
  data_inicio_contrato: string
  data_fim_contrato: string
  qde_contratada_plano: number
  saldo_quantidade_plano: number
  qde_contratada_avulso: number
  saldo_quantidade_avulso: number
}

export function contratoCorrente<T extends ContratoBasico>(lista: T[], hoje: string): T | null {
  const vigentes = lista.filter(c => c.data_fim_contrato >= hoje)
  if (vigentes.length === 0) return null
  const comPlano = vigentes.filter(c => c.qde_contratada_plano > 0)
  const candidatos = comPlano.length > 0 ? comPlano : vigentes
  const temCredito = (c: T) => (c.saldo_quantidade_plano > 0 || c.saldo_quantidade_avulso > 0 ? 1 : 0)
  const maisNovoPrimeiro = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0)
  return [...candidatos].sort((a, b) =>
    temCredito(b) - temCredito(a)
    || maisNovoPrimeiro(a.data_inicio_contrato, b.data_inicio_contrato)
    || maisNovoPrimeiro(a.data_fim_contrato, b.data_fim_contrato))[0]
}

/**
 * Saldo de PLANO do inspetor: a SOMA dos saldos de todos os contratos VIGENTES (data_fim_contrato >= hoje), e não só o do mais recente. É a mesma
 * regra das funções saldo_creditos e consumir_creditos do banco (sql/2026-10-14_saldo_soma_planos_vigentes.sql): um inspetor com Cortesia (66 CR)
 * e Serviço (50 CR) vigentes ao mesmo tempo dispõe de 116. As telas do gestor usam esta função para mostrar o mesmo número que a cobrança usa.
 */
export function saldoPlanoVigente(lista: { data_fim_contrato: string | null; saldo_quantidade_plano: number | null }[], hoje: string): number {
  return lista.reduce((soma, c) => ((c.data_fim_contrato ?? '') >= hoje ? soma + (c.saldo_quantidade_plano ?? 0) : soma), 0)
}

/**
 * Data de hoje em Brasília somada de N dias, 'AAAA-MM-DD'. Usada na validade do avulso (90 dias): antes era
 * `new Date(Date.now() + 90d).toISOString()`, que dá a data em UTC, e uma compra feita depois das 21h em Brasília
 * (já "amanhã" em UTC) ganhava um dia a mais. Aqui a data de partida é a de Brasília e a soma é só de calendário.
 */
export function dataBrasiliaMaisDias(dias: number, agora: Date = new Date()): string {
  const hoje = agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })   // 'AAAA-MM-DD'
  const [a, m, d] = hoje.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

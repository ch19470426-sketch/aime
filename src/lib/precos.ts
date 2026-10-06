// src/lib/precos.ts
// AIMÊ — Preços dos planos: UMA fonte só, sem dependência de servidor (a tela de escolha de
// plano e o servidor usam o mesmo código).
//
// Decisão de Celso (05/10/2026): os preços são percentuais do salário mínimo de referência —
// Serviço 5%, Mensal 8,5% e Escritório 20%. Os valores de hoje (R$ 81,00 / 137,70 / 324,00)
// saem exatamente dessa conta sobre R$ 1.620,00.
//
// COMO REAJUSTAR quando o salário mínimo mudar:
//   1. trocar SALARIO_MINIMO_REFERENCIA_CENTAVOS abaixo e fazer o deploy (preços de novas
//      compras e cartões da tela mudam sozinhos);
//   2. rodar a rotina POST /api/gestor/reajustar-assinaturas (primeiro como simulação) para
//      atualizar as assinaturas JÁ ativas no Asaas e na base.

export const SALARIO_MINIMO_REFERENCIA_CENTAVOS = 162000 // R$ 1.620,00

/** Percentual do salário mínimo de cada plano, em pontos-base (1% = 100): evita erro de ponto flutuante. */
export const PERCENTUAL_PLANO_PB: Record<string, number> = {
  'PLANO SERVIÇO': 500,       // 5%
  'PLANO MENSAL': 850,        // 8,5%
  'PLANO ESCRITÓRIO': 2000,   // 20%
}

/** Preço do plano em centavos para um salário mínimo; null se o plano não for vendável (Cortesia). */
export function precoPlanoCentavos(tipo: string, salarioMinimoCentavos = SALARIO_MINIMO_REFERENCIA_CENTAVOS): number | null {
  const pb = PERCENTUAL_PLANO_PB[tipo]
  return pb ? Math.round(salarioMinimoCentavos * pb / 10000) : null
}

/** Pacote de 600 CR avulsos custa o mesmo que o Plano Serviço (mesma taxa). */
export function precoAvulsoPacoteCentavos(salarioMinimoCentavos = SALARIO_MINIMO_REFERENCIA_CENTAVOS): number {
  return precoPlanoCentavos('PLANO SERVIÇO', salarioMinimoCentavos)!
}

/** 32400 -> 'R$ 324,00' (espaço comum, não o espaço sem quebra do Intl). */
export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ')
}

// Dosagem da solução da IA pelo grau de risco: especialista só acima de 80; baixo e médio ficam em reparo localizado.
import { describe, it, expect } from 'vitest'
import { dosagemDaSolucao } from '@/lib/dosagemSolucao'

describe('dosagemDaSolucao', () => {
  it('baixo e médio proíbem especialista; alto de 60 a 80 também; só acima de 80 permite', () => {
    expect(dosagemDaSolucao(20)).toMatch(/mínima e localizada.*NÃO proponha/)
    expect(dosagemDaSolucao(45)).toMatch(/reparo localizado.*NÃO proponha avaliação por especialista/)
    expect(dosagemDaSolucao(60)).toMatch(/especialista NÃO é necessária/)
    expect(dosagemDaSolucao(80)).toMatch(/especialista NÃO é necessária/)
    expect(dosagemDaSolucao(81)).toMatch(/especialista é permitida/)
  })
  it('NR usa as faixas da NR (50 a 80 é Alta; 30 a 49 é Média)', () => {
    expect(dosagemDaSolucao(55, true)).toMatch(/especialista NÃO é necessária/)
    expect(dosagemDaSolucao(40, true)).toMatch(/reparo localizado/)
  })
  it('sem grau de risco: só a regra geral, sem faixa', () => {
    for (const g of [0, '', null, undefined, 'x']) expect(dosagemDaSolucao(g)).not.toMatch(/escala de 0 a 100/)
  })
})

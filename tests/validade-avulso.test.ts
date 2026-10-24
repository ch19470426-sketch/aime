// Validade do avulso: 90 dias contados a partir de HOJE EM BRASÍLIA (não em UTC).
import { describe, it, expect } from 'vitest'
import { dataBrasiliaMaisDias } from '@/lib/contratos'

describe('dataBrasiliaMaisDias', () => {
  it('compra às 22h30 de Brasília (já é dia seguinte em UTC) NÃO ganha um dia a mais', () => {
    // 21/10/2026 22:30 em Brasília = 22/10/2026 01:30 UTC
    expect(dataBrasiliaMaisDias(90, new Date('2026-10-22T01:30:00Z'))).toBe('2027-01-19')
  })
  it('compra de manhã dá o mesmo resultado do mesmo dia', () => {
    expect(dataBrasiliaMaisDias(90, new Date('2026-10-21T12:00:00Z'))).toBe('2027-01-19')
  })
  it('vira o ano e o mês corretamente', () => {
    expect(dataBrasiliaMaisDias(90, new Date('2026-12-31T15:00:00Z'))).toBe('2027-03-31')
  })
})

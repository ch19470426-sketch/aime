import { describe, it, expect } from 'vitest'
import { copiasParaApagar } from '../src/lib/copiaSeguranca'

// Exclusão de cópias: só pastas AAAA-MM-DD, mantendo as mais recentes.
describe('copiasParaApagar', () => {
  it('mantém as 4 mais recentes e apaga as anteriores', () => {
    const nomes = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-09-28']
    expect(copiasParaApagar(nomes, 4)).toEqual(['2026-09-28', '2026-10-05'])
  })
  it('nunca apaga nome fora do formato de data', () => {
    expect(copiasParaApagar(['leia-me', 'teste', '2026-10-05'], 1)).toEqual([])
  })
  it('com poucas cópias não apaga nada e "manter" inválido não apaga tudo', () => {
    expect(copiasParaApagar(['2026-10-05', '2026-10-12'], 4)).toEqual([])
    expect(copiasParaApagar(['2026-10-05', '2026-10-12'], 0)).toEqual([])
  })
})

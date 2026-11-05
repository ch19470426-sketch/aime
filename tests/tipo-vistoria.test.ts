// O laudo 41 usa as vistorias do serviço 31 (e assim por diante); outros valores não mudam.
import { describe, it, expect } from 'vitest'
import { tipoDeVistoriaDoLaudo } from '@/lib/tipoVistoria'

describe('tipoDeVistoriaDoLaudo', () => {
  it('converte os laudos 41 a 48 nas vistorias 31 a 38 e mantém o resto', () => {
    expect(['41', '42', '43', '44', '45', '46', '47', '48'].map(tipoDeVistoriaDoLaudo)).toEqual(['31', '32', '33', '34', '35', '36', '37', '38'])
    expect(tipoDeVistoriaDoLaudo('31')).toBe('31')
    expect(tipoDeVistoriaDoLaudo(null)).toBe('')
  })
})

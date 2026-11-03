// Vistorias de terceiros fora do laudo e limpeza das pendentes antigas só da combinação certa.
import { describe, it, expect } from 'vitest'
import { apenasDosCpfs, pendentesDaCombinacao } from '@/lib/pendentes'

describe('laudo só com as vistorias de quem pede', () => {
  const linhas = [{ cpf_inspetor: '05491239704', numero_foto: 1 }, { cpf_inspetor: '15158500053', numero_foto: 1 }]
  it('deixa passar só os CPFs permitidos', () => {
    expect(apenasDosCpfs(linhas, new Set(['15158500053']))).toEqual([linhas[1]])
    expect(apenasDosCpfs(linhas, new Set(['15158500053', '05491239704']))).toHaveLength(2)
  })
  it('sem quem pede identificado, não traz nada de terceiros', () => {
    expect(apenasDosCpfs(linhas, new Set())).toEqual([])
    expect(apenasDosCpfs(null, new Set(['1']))).toEqual([])
  })
})

describe('pendentes removidas no reinício da numeração', () => {
  it('pega só a combinação (chave, CNPJ/CPF e serviço) e só arquivos .json numerados', () => {
    const nomes = ['AB12_111_31_001.json', 'AB12_111_31_002.json', 'AB12_111_32_001.json', 'AB12_222_31_001.json', 'AB123_111_31_001.json', 'AB12_111_31_001.html', 'AB12_111_31_x.json']
    expect(pendentesDaCombinacao(nomes, 'AB12', '111', '31')).toEqual(['AB12_111_31_001.json', 'AB12_111_31_002.json'])
  })
})

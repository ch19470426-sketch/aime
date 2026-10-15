// Tela de login (src/app/page.tsx), primeira sugestão de melhoria recebida (14/10/2026): título "Efetue Login e Cadastro" no cabeçalho, informação
// sobre a composição da senha mais visível e botão "Acessar Conta".
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const codigo = readFileSync('src/app/page.tsx', 'utf-8')

describe('tela de login', () => {
  it('cabeçalho: "Efetue Login e Cadastro" logo ABAIXO do texto Mapeamento Inteligente, centralizado e um pouco maior', () => {
    const mapeamento = codigo.indexOf('Mapeamento Inteligente de Edificacoes e Equipamentos')
    const efetue = codigo.indexOf('Efetue Login e Cadastro')
    expect(mapeamento).toBeGreaterThan(-1)
    expect(efetue).toBeGreaterThan(mapeamento)                                         // vem depois (abaixo) do texto do cabeçalho
    const bloco = codigo.slice(codigo.lastIndexOf('<div style={{ flex: 1, textAlign: "center" }}>', mapeamento), efetue + 40)
    expect(bloco).toMatch(/textAlign: "center"/)                                        // centralizado
    expect(bloco).toMatch(/fontSize: "12px"[\s\S]*Efetue|Mapeamento[\s\S]*fontSize: "14px"/)
    expect(codigo.match(/fontSize: "14px"[^}]*marginTop: "4px"[^>]*>\s*Efetue Login e Cadastro/)).not.toBeNull()   // 14px, maior que os 12px do texto de cima
  })
  it('composição da senha: centralizada, um pouco maior (13px) e em negrito', () => {
    const m = codigo.match(/<p style=\{\{([^}]*)\}\}>\s*Ao criar uma conta nova: mínimo 8 caracteres/)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/fontSize: "13px"/)
    expect(m![1]).toMatch(/fontWeight: "bold"/)
    expect(m![1]).toMatch(/textAlign: "center"/)
  })
  it('o botão se chama "Acessar Conta" (e não mais "Entrar"); o texto de espera continua', () => {
    expect(codigo).toMatch(/\{loading \? "Aguarde\.\.\." : "Acessar Conta"\}/)
    expect(codigo).not.toMatch(/: "Entrar"\}/)
  })
})

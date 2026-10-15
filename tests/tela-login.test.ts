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
    expect(codigo.match(/fontSize: "16px"[^}]*marginTop: "14px"[^>]*>\s*Efetue Login e Cadastro/)).not.toBeNull()   // 16px (maior que os 12px do texto de cima) e com 14px de espaço acima
  })
  it('o título fica CENTRALIZADO entre o texto Mapeamento e a borda inferior do cabeçalho: espaço acima = espaço abaixo', () => {
    const acima = Number(codigo.match(/fontSize: "16px"[^}]*marginTop: "(\d+)px"[^>]*>\s*Efetue Login e Cadastro/)![1])
    const abaixo = Number(codigo.match(/backgroundColor: "#1E3A8A", padding: "\d+px \d+px (\d+)px", display: "flex"/)![1])
    expect(acima).toBe(abaixo)
    expect(acima).toBeGreaterThan(10)                                                   // um pouco mais abaixo do que antes (eram 10 e 8)
  })
  it('composição da senha: centralizada, um pouco maior (13px) e em negrito', () => {
    const m = codigo.match(/<p style=\{\{([^}]*)\}\}>\s*Ao criar uma conta nova: senha com o mínimo de 8 caracteres/)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/fontSize: "13px"/)
    expect(m![1]).toMatch(/fontWeight: "bold"/)
    expect(m![1]).toMatch(/textAlign: "center"/)
  })
  it('o texto da composição da senha é exatamente o pedido', () => {
    expect(codigo).toContain('Ao criar uma conta nova: senha com o mínimo de 8 caracteres, mínimo de uma letra, um número e um caractere especial.')
    expect(codigo).not.toContain('mínimo 8 caracteres, com letra, número e caractere especial')
  })
  it('o botão se chama "Acessar Conta" (e não mais "Entrar"); o texto de espera continua', () => {
    expect(codigo).toMatch(/\{loading \? "Aguarde\.\.\." : "Acessar Conta"\}/)
    expect(codigo).not.toMatch(/: "Entrar"\}/)
  })
})

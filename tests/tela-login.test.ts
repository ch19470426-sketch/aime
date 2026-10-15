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
    expect(codigo.match(/fontSize: "16px"[^}]*marginTop: "14px"[^>]*>\s*Efetue Login e Cadastro/)).not.toBeNull()   // 16px (maior que os 12px do texto de cima) e com 14px de espaço acima (o espaço não muda)
  })
  it('o título foi BAIXADO sem aumentar nenhum espaço: margem e padding ficam em 14px e só o texto é deslocado 8px para baixo', () => {
    const acima = Number(codigo.match(/fontSize: "16px"[^}]*marginTop: "(\d+)px"[^>]*>\s*Efetue Login e Cadastro/)![1])
    const abaixo = Number(codigo.match(/backgroundColor: "#1E3A8A", padding: "\d+px \d+px (\d+)px", display: "flex"/)![1])
    expect(acima).toBe(14)                                                              // os espaços não aumentaram
    expect(abaixo).toBe(14)
    expect(codigo).toMatch(/fontSize: "16px", lineHeight: "1\.3", marginTop: "14px", position: "relative", top: "8px"/)   // o texto desce 8px
  })
  it('composição da senha: centralizada, um pouco maior (13px) e em negrito', () => {
    const m = codigo.match(/<p style=\{\{([^}]*)\}\}>\s*Ao criar uma conta: senha com o mínimo de 8 caracteres/)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/fontSize: "13px"/)
    expect(m![1]).toMatch(/fontWeight: "bold"/)
    expect(m![1]).toMatch(/textAlign: "center"/)
  })
  it('o texto da composição da senha é exatamente o pedido', () => {
    expect(codigo).toContain('Ao criar uma conta: senha com o mínimo de 8 caracteres, mínimo de uma letra, um número e um caractere especial.')
    expect(codigo).not.toContain('mínimo 8 caracteres, com letra, número e caractere especial')
    expect(codigo).not.toContain('Ao criar uma conta nova')
  })
  it('o botão se chama "Acessar Conta" (e não mais "Entrar"); o texto de espera continua', () => {
    expect(codigo).toMatch(/\{loading \? "Aguarde\.\.\." : "Acessar Conta"\}/)
    expect(codigo).not.toMatch(/: "Entrar"\}/)
  })
})

describe('tela de nova senha', () => {
  const nova = readFileSync('src/app/nova-senha/page.tsx', 'utf-8')
  it('usa o mesmo texto da composição da senha do login, centralizado e em negrito', () => {
    const m = nova.match(/<p style=\{\{([^}]*)\}\}>\s*Digite sua nova senha: senha com o mínimo de 8 caracteres, mínimo de uma letra, um número e um caractere especial\./)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/fontWeight:'bold'/)
    expect(m![1]).toMatch(/textAlign:'center'/)
    expect(nova).not.toContain('Mínimo 8 caracteres, com letra, número e caractere especial')
  })
})

// Termo de Aceite: texto único (src/lib/termoAceite.ts), data do aceite no horário de Brasília e arquivo gerado no aceite.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { A, estado, reiniciar, sessao, req, status, quantas } from './helpers'
import { dataDoAceite, termoEmHtml, TERMO_BLOCOS, partesComNegrito, VERSAO_TERMO } from '@/lib/termoAceite'
import * as gerar from '@/app/api/gerar-termo-aceite/route'

beforeEach(reiniciar)

describe('data do aceite', () => {
  it('é dd/mm/aaaa no horário de BRASÍLIA: às 23h30 de 16/10 em Brasília (02h30 UTC de 17/10) ainda é 16/10', () => {
    expect(dataDoAceite(new Date('2026-10-17T02:30:00Z'))).toBe('16/10/2026')
    expect(dataDoAceite(new Date('2026-10-17T03:00:00Z'))).toBe('17/10/2026')     // meia-noite em Brasília
    expect(dataDoAceite(new Date('2026-01-05T12:00:00Z'))).toBe('05/01/2026')     // dia e mês com zero à esquerda
  })
})

describe('o arquivo do aceite', () => {
  const html = termoEmHtml(dataDoAceite(new Date('2026-10-16T15:00:00Z')))
  it('traz as 9 cláusulas do termo novo, em ordem, inclusive a de créditos e pagamento e a eliminação dos dados', () => {
    const titulos = [...html.matchAll(/<h2>([^<]+)<\/h2>/g)].map(m => m[1])
    expect(titulos).toEqual(['1. OBJETO.', '2. CONDIÇÕES DE USO E RESPONSABILIDADE PROFISSIONAL.', '3. CONTRATAÇÃO, CRÉDITOS E PAGAMENTO.', '4. ÉTICA E CONFORMIDADE.',
      '5. PROPRIEDADE DOS DADOS.', '6. PROTEÇÃO DE DADOS.', '7. LIMITAÇÃO DE RESPONSABILIDADE.', '8. ACEITE.', '9. DISPOSIÇÕES GERAIS'])
    expect(html).toContain('após o prazo de 6 (seis) meses')
  })
  it('termina com a data do aceite JÁ preenchida: nenhum marcador sobra', () => {
    expect(html).toContain('<p class="data">Data do aceite: 16/10/2026.</p>')
    for (const lixo of ['dd/mm/aaaa', '&lt;', 'undefined', '${', '**']) expect(html).not.toContain(lixo)
  })
  it('mantém o cabeçalho e o rodapé do documento, os negritos e a versão do termo', () => {
    expect(html).toContain('SAAS – ENGENHARIA DIAGNÓSTICA INOVA SIMPLES (IS)')
    expect(html).toContain('Rua Francisco Rubim, 188/102')
    expect(html).toContain('<strong>Software as a Service (SaaS)</strong>')
    expect(html).toContain(`<meta name="versao-termo" content="${VERSAO_TERMO}">`)
  })
  it('o negrito é lido da marcação do texto', () => {
    expect(partesComNegrito('a **b** c')).toEqual([{ t: 'a ', b: false }, { t: 'b', b: true }, { t: ' c', b: false }])
    expect(TERMO_BLOCOS.filter(b => b.t === 'clausula')).toHaveLength(9)
  })
})

describe('POST /api/gerar-termo-aceite', () => {
  it('o próprio usuário registra o aceite: o arquivo <chave>_termo_de_aceite.html é gravado', async () => {
    const r = await gerar.POST(req('/api/gerar-termo-aceite', 'POST', { cpfInspetor: A, chaveInspetor: 'INS-001' }))
    expect(r.status).toBe(200)
    expect((await r.json()).nomeArquivo).toBe('INS-001_termo_de_aceite.html')
    expect(quantas(/storage\/v1\/object\//)).toBe(1)
  })
  it('em nome de outra pessoa é barrado e nada é gravado', async () => {
    expect(await status(gerar.POST(req('/api/gerar-termo-aceite', 'POST', { cpfInspetor: '99999999999', chaveInspetor: 'INS-999' })))).toBe(403)
    expect(quantas(/storage\/v1\/object\//)).toBe(0)
  })
})

describe('fonte única', () => {
  it('a tela e a rota usam o texto de src/lib/termoAceite.ts, e nenhuma das duas guarda o texto por conta própria', () => {
    const tela = readFileSync('src/app/termo-aceite/page.tsx', 'utf-8'), rota = readFileSync('src/app/api/gerar-termo-aceite/route.ts', 'utf-8')
    expect(tela).toContain('TERMO_BLOCOS'); expect(rota).toContain('termoEmHtml(dataDoAceite())')
    for (const f of [tela, rota]) expect(f).not.toContain('O presente Termo tem por objeto')
  })
})

// Termo de Aceite: texto único (src/lib/termoAceite.ts), data do aceite no horário de Brasília e arquivo gerado no aceite.
import { describe, it, expect, beforeEach } from 'vitest'
import { A, estado, reiniciar, sessao, req, status, quantas, chamadas } from './helpers'
import { htmlParaPdf } from '@/lib/htmlParaPdf'
import * as listdoc from '@/app/api/listar-documentos/route'
import { vi } from 'vitest'
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
  const aceitar = () => gerar.POST(req('/api/gerar-termo-aceite', 'POST', { cpfInspetor: A, chaveInspetor: 'INS-001' }))
  const gravados = () => chamadas().filter(c => /storage\/v1\/object\//.test(c.p)).map(c => c.p.split('/').pop())

  it('o próprio usuário registra o aceite: grava o HTML (o registro) e o PDF (o comprovante que ele baixa)', async () => {
    const r = await aceitar()
    expect(r.status).toBe(200)
    expect((await r.json()).nomeArquivo).toBe('INS-001_termo_de_aceite.html')
    expect(gravados().sort()).toEqual(['INS-001_termo_de_aceite.html', 'INS-001_termo_de_aceite.pdf'])
  })
  it('o PDF leva a MESMA data do HTML e o cabeçalho e o rodapé do termo', async () => {
    await aceitar()
    const [html, opcoes] = vi.mocked(htmlParaPdf).mock.calls.at(-1)!
    expect(html).toContain(`Data do aceite: ${dataDoAceite()}.`)
    expect(opcoes?.cabecalho).toContain('INOVA SIMPLES')
    expect(opcoes?.rodape).toContain('CNPJ 69.190.214/0001-74')
  })
  it('se o PDF falhar, o aceite continua válido: responde 200 e o HTML está gravado', async () => {
    vi.mocked(htmlParaPdf).mockRejectedValueOnce(new Error('chromium indisponível'))
    const r = await aceitar()
    expect(r.status).toBe(200)
    expect((await r.json()).ok).toBe(true)
    expect(gravados()).toEqual(['INS-001_termo_de_aceite.html'])
  })
  it('em nome de outra pessoa é barrado e nada é gravado', async () => {
    expect(await status(gerar.POST(req('/api/gerar-termo-aceite', 'POST', { cpfInspetor: '99999999999', chaveInspetor: 'INS-999' })))).toBe(403)
    expect(quantas(/storage\/v1\/object\//)).toBe(0)
  })
})

describe('Baixar Documentos mostra um termo só', () => {
  const listar = async () => (await listdoc.GET(req(`/api/listar-documentos?chave_inspetor=${A}&cnpjoucpf=39262886000187`))).json()
  beforeEach(() => { estado.chaves[A] = A })
  it('com o PDF gravado, aparece só o PDF (o HTML do termo, que o painel usa, fica escondido)', async () => {
    estado.arquivos.documentos_inspetor = [`${A}_termo_de_aceite.html`, `${A}_termo_de_aceite.pdf`]
    expect((await listar()).docs.map((d: any) => d.nome)).toEqual([`${A}_termo_de_aceite.pdf`])
  })
  it('termo aceito antes do PDF existir continua aparecendo, em HTML', async () => {
    estado.arquivos.documentos_inspetor = [`${A}_termo_de_aceite.html`]
    expect((await listar()).docs.map((d: any) => d.nome)).toEqual([`${A}_termo_de_aceite.html`])
  })
})

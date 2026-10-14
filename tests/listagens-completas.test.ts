// Listagens do armazenamento que cortavam arquivos em silêncio. As pastas (documentos_inspetor, vistorias_homologadas) são COMPARTILHADAS por todos os
// inspetores e as listagens liam só as primeiras 500 ou 1000 entradas da pasta INTEIRA, em ordem de nome: passado o limite, os arquivos de alguns
// inspetores sumiam sem erro (e o laudo saía sem as não conformidades). Aqui as pastas têm MAIS arquivos de outros inspetores, ordenados ANTES do
// inspetor testado, do que o limite antigo: com o código antigo, nada do inspetor A aparecia.
import { describe, it, expect, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { A, estado, reiniciar, req, status, chamadas, quantas } from './helpers'
import { listarArquivosComPrefixo } from '@/lib/armazenamento'
import * as listdoc from '@/app/api/listar-documentos/route'
import * as meus from '@/app/api/meus-estabelecimentos/route'
import * as listvis from '@/app/api/listar-vistorias/route'

beforeEach(() => { reiniciar(); estado.chaves[A] = A })    // depois da migração, a chave do inspetor é o CPF

const OUTROS = '00000000000'                                // CPF que fica ANTES de A na ordem de nome
const lote = (n: number, prefixo: string, sufixo: (i: number) => string) => Array.from({ length: n }, (_, i) => `${prefixo}_${sufixo(i)}`)
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

describe('listarArquivosComPrefixo', () => {
  it('lê TODAS as páginas: 2500 arquivos do inspetor no meio de 3000 de outros', async () => {
    estado.arquivos.documentos_inspetor = [...lote(3000, OUTROS, i => `x_${i}.pdf`), ...lote(2500, A, i => `123_doc_${i}.pdf`)]
    const achados = await listarArquivosComPrefixo(sb(), 'documentos_inspetor', `${A}_`)
    expect(achados).toHaveLength(2500)
    expect(achados.every(a => a.name.startsWith(`${A}_`))).toBe(true)
    expect(quantas(/storage\/v1\/object\/list/)).toBeGreaterThanOrEqual(3)        // várias páginas
  })
  it('só devolve nome que COMEÇA pelo prefixo (o trecho no meio do nome não vale)', async () => {
    estado.arquivos.documentos_inspetor = [`${A}_123_a.pdf`, `outro_${A}_b.pdf`, `${A}9_123_c.pdf`]
    expect((await listarArquivosComPrefixo(sb(), 'documentos_inspetor', `${A}_`)).map(a => a.name)).toEqual([`${A}_123_a.pdf`])
  })
  it('prefixo vazio não lista a pasta inteira', async () => {
    estado.arquivos.documentos_inspetor = [`${A}_123_a.pdf`]
    expect(await listarArquivosComPrefixo(sb(), 'documentos_inspetor', '')).toEqual([])
  })
  it('erro do armazenamento é propagado (a rota decide o que fazer)', async () => {
    estado.falhaChave = false
    estado.arquivos.documentos_inspetor = []
    const cliente = createClient('https://fake.supabase.co', 'k', { global: { fetch: async () => new Response(JSON.stringify({ message: 'boom' }), { status: 500 }) } })
    await expect(listarArquivosComPrefixo(cliente, 'documentos_inspetor', `${A}_`)).rejects.toThrow()
  })
})

describe('listar-documentos (Baixar documentos)', () => {
  const listar = async () => (await listdoc.GET(req(`/api/listar-documentos?chave_inspetor=${A}&cnpjoucpf=123`))).json()

  it('mostra os documentos do inspetor mesmo com 1200 arquivos de outros ordenados antes (o limite antigo era 500)', async () => {
    estado.arquivos.documentos_inspetor = [...lote(1200, OUTROS, i => `999_laudo_${i}.pdf`), `${A}_123_laudo.pdf`, `${A}_123_proposta_assinado.pdf`]
    const j = await listar()
    expect(j.docs.map((d: any) => d.nome).sort()).toEqual([`${A}_123_laudo.pdf`, `${A}_123_proposta_assinado.pdf`])
  })
  it('um inspetor com 1500 documentos recebe os 1500 (várias páginas)', async () => {
    estado.arquivos.documentos_inspetor = [...lote(600, OUTROS, i => `999_x_${i}.pdf`), ...lote(1500, A, i => `123_laudo_${i}.pdf`)]
    expect((await listar()).docs).toHaveLength(1500)
  })
  it('não mistura documentos de outro inspetor', async () => {
    estado.arquivos.documentos_inspetor = [`${OUTROS}_123_laudo.pdf`, `${A}_123_laudo.pdf`]
    expect((await listar()).docs.map((d: any) => d.nome)).toEqual([`${A}_123_laudo.pdf`])
  })
})

describe('meus-estabelecimentos', () => {
  it('acha os estabelecimentos do inspetor mesmo com 1500 arquivos de outros ordenados antes (o limite antigo era 1000)', async () => {
    estado.arquivos.documentos_inspetor = [...lote(1500, OUTROS, i => `99999999999999_p_${i}.html`), `${A}_12345678000190_proposta.html`]
    await meus.GET(req(`/api/meus-estabelecimentos?cpf=${A}`))
    expect(chamadas().some(c => /rest\/v1\/estabelecimento/.test(c.p) && c.q.includes('12345678000190'))).toBe(true)
  })
})

describe('listar-vistorias (alimenta o laudo)', () => {
  it('lê as vistorias homologadas do inspetor mesmo com 1500 arquivos de outros ordenados antes (o limite antigo era 1000)', async () => {
    estado.arquivos.vistorias_homologadas = [...lote(1500, OUTROS, i => `123_33_${i}.html`), `${A}_123_33_1.html`, `${A}_123_33_2.html`]
    await listvis.GET(req(`/api/listar-vistorias?chave_inspetor=${A}&cnpjoucpf=123&tipo_servico=33`))
    expect(quantas(new RegExp(`GET .*vistorias_homologadas/${A}_123_33_1\\.html`))).toBeGreaterThanOrEqual(1)
    expect(quantas(new RegExp(`GET .*vistorias_homologadas/${A}_123_33_2\\.html`))).toBeGreaterThanOrEqual(1)
  })
  it('não baixa nenhum arquivo de outro inspetor', async () => {
    estado.arquivos.vistorias_homologadas = [`${OUTROS}_123_33_1.html`, `${A}_123_33_1.html`]
    await listvis.GET(req(`/api/listar-vistorias?chave_inspetor=${A}&cnpjoucpf=123&tipo_servico=33`))
    expect(quantas(new RegExp(`GET .*${OUTROS}_`))).toBe(0)
  })
  it('vistorias pendentes: também lê todas as páginas', async () => {
    estado.arquivos.vistorias = [...lote(1500, OUTROS, i => `123_33_${i}.json`), `${A}_123_33_7.json`]
    await listvis.GET(req(`/api/listar-vistorias?chave_inspetor=${A}&cnpjoucpf=123&tipo_servico=33`))
    expect(quantas(new RegExp(`GET .*vistorias/${A}_123_33_7\\.json`))).toBeGreaterThanOrEqual(1)
  })
})

describe('Baixar documentos: o Termo de Aceite aparece', () => {
  const listar = async () => (await listdoc.GET(req(`/api/listar-documentos?chave_inspetor=${A}&cnpjoucpf=123`))).json()

  it('o termo (gravado como HTML) aparece com o rótulo próprio, junto com os PDFs', async () => {
    estado.arquivos.documentos_inspetor = [`${A}_termo_de_aceite.html`, `${A}_123_laudo.pdf`]
    const j = await listar()
    expect(j.docs.map((d: any) => d.nome).sort()).toEqual([`${A}_123_laudo.pdf`, `${A}_termo_de_aceite.html`])
    expect(j.docs.find((d: any) => d.nome.includes('termo_de_aceite')).label).toBe('Termo de Aceite dos Serviços')
  })
  it('os outros HTML (proposta, plano, laudo em trabalho) continuam fora da lista', async () => {
    estado.arquivos.documentos_inspetor = [`${A}_123_proposta.html`, `${A}_123_plano.html`, `${A}_123_laudo.html`, `${A}_termo_de_aceite.html`]
    expect((await listar()).docs.map((d: any) => d.nome)).toEqual([`${A}_termo_de_aceite.html`])
  })
  it('o termo de outro inspetor não aparece', async () => {
    estado.arquivos.documentos_inspetor = [`${OUTROS}_termo_de_aceite.html`]
    expect((await listar()).docs).toEqual([])
  })
})

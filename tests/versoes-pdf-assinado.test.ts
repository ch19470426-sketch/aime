// Cada envio do PDF assinado é uma VERSÃO nova (data e hora de Brasília no nome): não sobrescreve o anterior, a lista mostra todas e o resumo do
// gestor conta UM documento. O servidor acrescenta a versão (relógio do servidor), então as telas continuam mandando só o nome-base.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { A, B, estado, reiniciar, req, status } from './helpers'
import { versaoPdfAssinado, lerVersaoPdfAssinado, baseDoDocumento } from '@/lib/nomeArquivo'
import * as upload from '@/app/api/upload-pdf-assinado/route'
import * as listdoc from '@/app/api/listar-documentos/route'

const CNPJ = '39262886000187'
beforeEach(reiniciar)
afterEach(() => { vi.useRealTimers() })

describe('versaoPdfAssinado / lerVersaoPdfAssinado', () => {
  it('acrescenta data e hora de Brasília antes de .pdf (12:46 UTC = 09:46 em Brasília)', () => {
    expect(versaoPdfAssinado(`${A}_${CNPJ}_laudo_nr12_assinado.pdf`, new Date('2026-10-14T12:46:00Z'))).toBe(`${A}_${CNPJ}_laudo_nr12_assinado_20261014-094600.pdf`)
  })
  it('a virada do dia usa o relógio de Brasília (02:30 UTC ainda é o dia anterior)', () => {
    expect(versaoPdfAssinado('x_assinado.pdf', new Date('2026-10-15T02:30:05Z'))).toBe('x_assinado_20261014-233005.pdf')
  })
  it('só mexe em nome de PDF assinado: HTML e PDF comum voltam iguais', () => {
    expect(versaoPdfAssinado(`${A}_${CNPJ}_laudo_nr12.html`)).toBe(`${A}_${CNPJ}_laudo_nr12.html`)
    expect(versaoPdfAssinado(`${A}_${CNPJ}_laudo_nr12.pdf`)).toBe(`${A}_${CNPJ}_laudo_nr12.pdf`)
  })
  it('lê a versão de volta: nome sem versão, instante e exibição', () => {
    const v = lerVersaoPdfAssinado(`${A}_${CNPJ}_laudo_nr12_assinado_20261014-094600.pdf`)!
    expect(v.nomeSemVersao).toBe(`${A}_${CNPJ}_laudo_nr12_assinado.pdf`)
    expect(v.iso).toBe('2026-10-14T12:46:00.000Z')
    expect(v.exibicao).toBe('14/10/2026 09:46')
  })
  it('nome sem versão (os antigos) não é uma versão', () => {
    expect(lerVersaoPdfAssinado(`${A}_${CNPJ}_laudo_assinado.pdf`)).toBeNull()
    expect(lerVersaoPdfAssinado('qualquer.pdf')).toBeNull()
  })
  it('as versões e o HTML têm a mesma base de documento', () => {
    const base = `${A}_${CNPJ}_laudo_nr12`
    for (const nome of [`${base}.html`, `${base}.pdf`, `${base}_assinado.pdf`, `${base}_assinado_20261014-094600.pdf`]) expect(baseDoDocumento(nome)).toBe(base)
  })
})

describe('upload-pdf-assinado guarda uma versão por envio', () => {
  const enviar = async (nome: string) => (await upload.POST(req('/api/upload-pdf-assinado', 'POST', { nomeArquivo: nome }))).json()
  it('dois envios do MESMO documento em horários diferentes geram caminhos diferentes (nenhum sobrescreve o outro)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-14T12:46:00Z'))
    const primeiro = await enviar(`${A}_${CNPJ}_proposta_nr12_assinado.pdf`)
    vi.setSystemTime(new Date('2026-10-14T13:05:30Z'))
    const segundo = await enviar(`${A}_${CNPJ}_proposta_nr12_assinado.pdf`)
    expect(primeiro.path).toBe(`documentos_inspetor/${A}_${CNPJ}_proposta_nr12_assinado_20261014-094600.pdf`)
    expect(segundo.path).toBe(`documentos_inspetor/${A}_${CNPJ}_proposta_nr12_assinado_20261014-100530.pdf`)
    expect(primeiro.path).not.toBe(segundo.path)
  })
  it('a regra do dono continua valendo (nome de outro inspetor: 403)', async () => {
    expect(await status(upload.POST(req('/api/upload-pdf-assinado', 'POST', { nomeArquivo: `${B}_${CNPJ}_x_assinado.pdf` })))).toBe(403)
  })
  it('formato antigo (base64): também guarda a versão e devolve o caminho', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-14T12:46:00Z'))
    const r = await (await upload.POST(req('/api/upload-pdf-assinado', 'POST', { nomeArquivo: `${A}_${CNPJ}_x_assinado.pdf`, base64: 'JVBERi0=' }))).json()
    expect(r.path).toBe(`documentos_inspetor/${A}_${CNPJ}_x_assinado_20261014-094600.pdf`)
  })
})

describe('listar-documentos mostra todas as versões', () => {
  const listar = async () => (await listdoc.GET(req(`/api/listar-documentos?chave_inspetor=${A}&cnpjoucpf=${CNPJ}`))).json()
  it('3 versões do mesmo PDF assinado + 1 antiga sem versão: 4 itens com o MESMO rótulo, a mais recente primeiro, com data e hora', async () => {
    estado.arquivos.documentos_inspetor = [
      `${A}_${CNPJ}_proposta_nr12_assinado_20261014-094600.pdf`, `${A}_${CNPJ}_proposta_nr12_assinado_20261014-100530.pdf`,
      `${A}_${CNPJ}_proposta_nr12_assinado_20261015-081000.pdf`, `${A}_${CNPJ}_proposta_nr12_assinado.pdf`,
    ]
    const { docs } = await listar()
    expect(docs).toHaveLength(4)
    expect(docs.every((d: any) => d.label === 'Proposta nr12 — PDF assinado')).toBe(true)
    expect(docs.slice(0, 3).map((d: any) => d.data)).toEqual(['15/10/2026 08:10', '14/10/2026 10:05', '14/10/2026 09:46'])
    expect(docs[3].nome.endsWith('_assinado.pdf')).toBe(true)           // a antiga, sem versão, vem por último (a data dela é a do arquivo)
  })
  it('o rótulo dos outros documentos não muda', async () => {
    estado.arquivos.documentos_inspetor = [`${A}_${CNPJ}_plano_manut_nr12_assinado_20261014-094600.pdf`, `${A}_${CNPJ}_laudo_nr12.pdf`, `${A}_termo_de_aceite.html`]
    const { docs } = await listar()
    expect(docs.map((d: any) => d.label).sort()).toEqual(['Laudo nr12 — PDF', 'Plano manut nr12 — PDF assinado', 'Termo de Aceite dos Serviços'])
  })
})


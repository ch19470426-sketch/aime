// Auditoria de dono, etapa 2 (rotas que DEBITAM créditos e que GRAVAM arquivos): o CPF que paga e o arquivo gravado têm de ser
// do usuário logado. Antes, quem soubesse o CPF ou a chave de outro inspetor gastava os créditos dele e sobrescrevia arquivos.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { A, B, E, reiniciar, sessao, ligarPorteiro, req, status, quantas, chamadas, livre } from '../helpers'
import * as salvar from '@/app/api/salvar-vistoria/route'
import * as verif from '@/app/api/creditos/verificar-servico/route'
import * as proposta from '@/app/api/gerar-proposta/route'
import * as plano from '@/app/api/gerar-plano/route'
import * as laudo from '@/app/api/gerar-laudo/route'
import * as manut from '@/app/api/gerar-plano-manutencao/route'
import * as docx from '@/app/api/gerar-laudo-docx/route'
import * as termo from '@/app/api/gerar-termo-aceite/route'

beforeEach(() => { reiniciar(); vi.spyOn(console, 'error').mockImplementation(() => {}) })

const sv = (body: unknown) => status(salvar.POST(req('/api/salvar-vistoria', 'POST', body)))
const debitos = () => chamadas().filter(c => /rpc\/consumir_creditos/.test(c.p))
const vistoria = (nomeArquivo: string, payload: Record<string, unknown>) => ({ nomeArquivo, payload: { cnpjoucpf: '123', ...payload } })

describe('salvar-vistoria (grava com upsert: sobrescreve o que já existe)', () => {
  it('vistoria PRÓPRIA: 200, grava e debita 1x do CPF de A', async () => {
    expect(await sv(vistoria('INS-001_123_33_1.json', { cpfInspetor: A, tipoServico: '33', fotoNr: '1' }))).toBe(200)
    expect(quantas(/storage/)).toBe(1)
    expect(debitos()).toHaveLength(1)
    expect(debitos()[0].b).toContain(A)
  })
  it('SOBRESCREVER arquivo de B: 403, nada gravado, nada debitado', async () => {
    expect(await sv(vistoria('INS-002_123_33_1.json', { cpfInspetor: A, tipoServico: '33' }))).toBe(403)
    expect(quantas(/storage/)).toBe(0)
    expect(debitos()).toHaveLength(0)
  })
  it('nome com ".." ou subpasta: 403, nada gravado', async () => {
    expect(await sv(vistoria('INS-001_../templates/x.json', { cpfInspetor: A, tipoServico: '33' }))).toBe(403)
    expect(await sv(vistoria('INS-001_/x.json', { cpfInspetor: A, tipoServico: '33' }))).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('pasta fora das duas usadas (vistorias_homologadas, templates, ../x): 400, nada gravado', async () => {
    for (const pasta of ['vistorias_homologadas', 'templates', '../x']) {
      expect(await sv({ nomeArquivo: 'INS-001_1.json', pasta, payload: { a: 1 } })).toBe(400)
    }
    expect(quantas(/storage/)).toBe(0)
  })
  it('documento (proposta/plano) PRÓPRIO em documentos_inspetor: 200, grava e NÃO debita', async () => {
    expect(await sv({ nomeArquivo: 'INS-001_123_proposta.html', pasta: 'documentos_inspetor', payload: '<html/>', contentType: 'text/html' })).toBe(200)
    expect(quantas(/storage/)).toBe(1)
    expect(debitos()).toHaveLength(0)
  })
  it('documento com nome de B: 403, nada gravado', async () => {
    expect(await sv({ nomeArquivo: 'INS-002_123_proposta.html', pasta: 'documentos_inspetor', payload: '<html/>', contentType: 'text/html' })).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('GASTAR crédito de B (arquivo meu, payload com o CPF de B): 403, nada gravado, nada debitado', async () => {
    expect(await sv(vistoria('INS-001_123_33_2.json', { cpfInspetor: B, tipoServico: '33' }))).toBe(403)
    expect(quantas(/storage/)).toBe(0)
    expect(debitos()).toHaveLength(0)
  })
  it('sincronização offline (sem pasta, nome com a chave): 200', async () => {
    expect(await sv(vistoria('INS-001_123_33_3.json', { cpfInspetor: A, tipoServico: '33', fotoNr: '3' }))).toBe(200)
  })
})

describe('salvar-vistoria no fluxo elétrico (eletricista E = INS-777)', () => {
  beforeEach(() => sessao(E))
  it('eletricista salva vistoria 39: o débito é do ELETRICISTA, não do civil', async () => {
    expect(await sv(vistoria('INS-777_123_32_1.json', { cpfEletrico: E, cpfInspetor: A, tipoServico: '39', fotoNr: '1' }))).toBe(200)
    expect(debitos()).toHaveLength(1)
    expect(debitos()[0].b).toContain(E)
    expect(debitos()[0].b).not.toContain(A)
  })
  it('eletricista tenta debitar o CIVIL (cpfEletrico = CPF de A): 403, nada gravado', async () => {
    expect(await sv(vistoria('INS-777_123_32_2.json', { cpfEletrico: A, cpfInspetor: A, tipoServico: '39' }))).toBe(403)
    expect(quantas(/storage/)).toBe(0)
    expect(debitos()).toHaveLength(0)
  })
})

describe('creditos/verificar-servico', () => {
  const consultar = (cpf: string, codigo: number) => status(verif.GET(req(`/api/creditos/verificar-servico?cpf_inspetor=${cpf}&codigo_servico=${codigo}`)))
  it('consulta o PRÓPRIO saldo', async () => {
    expect(await consultar(A, 43)).toBe(200)
  })
  it('saldo de B: 403, sem consulta ao banco', async () => {
    expect(await consultar(B, 43)).toBe(403)
    expect(quantas(/rpc|rest\/v1\/(?!inspetor)/)).toBe(0)
  })
  it('o eletricista consulta o próprio saldo (código 39)', async () => {
    sessao(E)
    expect(await consultar(E, 39)).toBe(200)
  })
})

describe('geradores de documento: gastar crédito e gravar documento em nome de outro', () => {
  const geradores = [
    ['gerar-proposta', proposta, '13', true],
    ['gerar-plano', plano, '23', false],
    ['gerar-laudo', laudo, '43', true],
    ['gerar-plano-manutencao', manut, '53', true],
    ['gerar-laudo-docx', docx, '43', true],
    ['gerar-termo-aceite', termo, '43', true],
  ] as const
  const corpo = (cpf: string, chave: string, ts: string) =>
    ({ cpfInspetor: cpf, chaveInspetor: chave, cnpjoucpf: '123', tipoServico: ts, razaoSocial: 'X', ativos: [], datas: {}, docs: [], ncs: [], nomeArquivo: `${chave}_123_x.html` })

  it.each(geradores)('%s: CPF de OUTRO dá 403 e não consulta saldo nem debita', async (nome, rota, ts) => {
    expect(await status(rota.POST(req(`/api/${nome}`, 'POST', corpo(B, 'INS-002', ts))))).toBe(403)
    expect(quantas(/rpc/)).toBe(0)
  })
  it.each(geradores.filter(g => g[3]))('%s: CPF de OUTRO com a MINHA chave dá 403 (isola a checagem do CPF)', async (nome, rota, ts) => {
    expect(await status(rota.POST(req(`/api/${nome}`, 'POST', corpo(B, 'INS-001', ts))))).toBe(403)
    expect(quantas(/rpc/)).toBe(0)
  })
  it.each(geradores.filter(g => g[3]))('%s: meu CPF com a CHAVE de outro dá 403', async (nome, rota, ts) => {
    expect(await status(rota.POST(req(`/api/${nome}`, 'POST', corpo(A, 'INS-002', ts))))).toBe(403)
    expect(quantas(/rpc/)).toBe(0)
  })
  it.each(geradores)('%s: CPF e chave PRÓPRIOS passam pelo porteiro', async (nome, rota, ts) => {
    expect(livre(await status(rota.POST(req(`/api/${nome}`, 'POST', corpo(A, 'INS-001', ts)))))).toBe(true)
  })
})

describe('porteiro desligado', () => {
  it('comportamento antigo: grava arquivo de outro (200), mas a pasta continua limitada', async () => {
    ligarPorteiro(false)
    expect(await sv(vistoria('INS-002_123_33_9.json', { cpfInspetor: B, tipoServico: '33' }))).toBe(200)
    expect(await sv({ nomeArquivo: 'x.json', pasta: 'templates', payload: { a: 1 } })).toBe(400)
  })
})

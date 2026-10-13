// Auditoria de dono, etapa 1 (rotas que APAGAM): só o dono lista, lê, apaga e homologa os arquivos de vistoria e os ativos.
import { describe, it, expect, beforeEach } from 'vitest'
import { A, B, E, estado, reiniciar, sessao, ligarPorteiro, req, status, quantas, livre, chamadas } from '../helpers'
import * as vis from '@/app/api/vistorias/route'
import * as hom from '@/app/api/homologar/route'
import * as exc from '@/app/api/excluir-ativo/route'
import * as art from '@/app/api/upload-art-eletrico/route'

beforeEach(reiniciar)

const ler = (url: string) => status(vis.GET(req(url)))
const apagar = (nome: string) => status(vis.DELETE(req(`/api/vistorias?nome=${nome}`, 'DELETE')))

describe('vistorias GET (inspetor A = INS-001)', () => {
  it('lista a PRÓPRIA chave', async () => {
    expect(await ler('/api/vistorias?chave_inspetor=INS-001&cnpjoucpf=123')).toBe(200)
  })
  it('lista a chave de OUTRO: 403 e o armazenamento nem é consultado', async () => {
    expect(await ler('/api/vistorias?chave_inspetor=INS-002&cnpjoucpf=123')).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('lê arquivo PRÓPRIO', async () => {
    expect(await ler('/api/vistorias?nome=INS-001_123_33_1.json')).toBe(200)
  })
  it('lê arquivo de OUTRO: 403, sem download', async () => {
    expect(await ler('/api/vistorias?nome=INS-002_123_33_1.json')).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('recusa nome com ".." e nome com subpasta', async () => {
    expect(await ler('/api/vistorias?nome=INS-001_..%2Fx.json')).toBe(403)
    expect(await ler('/api/vistorias?nome=INS-001%2F..%2FINS-002_x.json')).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('pasta fora das de vistoria (documentos): 400, sem ler', async () => {
    expect(await ler('/api/vistorias?nome=INS-001_x.json&pasta=documentos')).toBe(400)
    expect(quantas(/storage/)).toBe(0)
  })
  it('pasta vistorias_homologadas do dono: 200', async () => {
    expect(await ler('/api/vistorias?nome=INS-001_123_33_1.html&pasta=vistorias_homologadas')).toBe(200)
  })
  it('arquivo que começa pelo CPF (URL sem chave) vale', async () => {
    expect(await ler(`/api/vistorias?nome=${A}_123_33_1.json`)).toBe(200)
  })
  it('chave em minúsculas (ins-001) vale', async () => {
    expect(await ler('/api/vistorias?chave_inspetor=ins-001&cnpjoucpf=123')).toBe(200)
  })
})

describe('vistorias DELETE', () => {
  it('apaga arquivo PRÓPRIO: 200 e remove chamado', async () => {
    expect(await apagar('INS-001_123_33_1.json')).toBe(200)
    expect(quantas(/DELETE .*storage/)).toBe(1)
  })
  it('apagar arquivo de OUTRO: 403 e NADA é apagado', async () => {
    expect(await apagar('INS-002_123_33_1.json')).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('sem sessão: 401', async () => {
    sessao(null)
    expect(await apagar('INS-001_123_33_1.json')).toBe(401)
  })
})

describe('homologar POST (lê, grava e APAGA o JSON)', () => {
  const corpo = (nomeArquivo: string) => ({ nomeArquivo, dadosVistoria: { cnpjoucpf: '123' } })
  it('homologar arquivo de OUTRO: 403, sem tocar no armazenamento', async () => {
    expect(await status(hom.POST(req('/api/homologar', 'POST', corpo('INS-002_123_33_1.json'))))).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('homologar arquivo PRÓPRIO: passa pelo porteiro (lê o arquivo)', async () => {
    await hom.POST(req('/api/homologar', 'POST', corpo('INS-001_123_33_1.json')))
    expect(quantas(/GET .*storage.*INS-001_123_33_1/)).toBeGreaterThanOrEqual(1)
  })
})

describe('excluir-ativo', () => {
  const corpo = (cpf: string) => ({ cpf_inspetor: cpf, cnpjoucpf: '123', tipo_servico: '33', data_cadastro: '2026-10-01' })
  it('ativo de OUTRO CPF: 403, o banco não é tocado', async () => {
    expect(await status(exc.DELETE(req('/api/excluir-ativo', 'DELETE', corpo(B))))).toBe(403)
    expect(quantas(/ativos_a_vistoriar/)).toBe(0)
  })
  it('ativo PRÓPRIO: o banco é chamado', async () => {
    await exc.DELETE(req('/api/excluir-ativo', 'DELETE', corpo(A)))
    expect(quantas(/DELETE .*ativos_a_vistoriar/)).toBeGreaterThanOrEqual(1)
  })
})

const gravouVinculo = () => chamadas().some(x => /art_profissional/.test(x.p) && x.m !== 'GET')

describe('fluxo elétrico (eletricista E = INS-777, vinculado ao civil A)', () => {
  beforeEach(() => sessao(E))
  it('lê e lista o que é PRÓPRIO', async () => {
    expect(await ler('/api/vistorias?nome=INS-777_123_32_1.json')).toBe(200)
    expect(await ler('/api/vistorias?chave_inspetor=INS-777&cnpjoucpf=123')).toBe(200)
  })
  it('NÃO lê arquivo do civil', async () => {
    expect(await ler('/api/vistorias?nome=INS-001_123_33_1.json')).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('registra o vínculo (CPF do eletricista = sessão; o CPF do civil é só dado do estabelecimento)', async () => {
    const r = await status(art.POST(req('/api/upload-art-eletrico', 'POST', { cpfEletrico: E, cnpjoucpf: '123', cpfInspetor: A, tipoServico: '32' })))
    expect(livre(r)).toBe(true)
    expect(gravouVinculo()).toBe(true)
  })
  it('o civil NÃO registra vínculo em nome do eletricista', async () => {
    sessao(A)
    expect(await status(art.POST(req('/api/upload-art-eletrico', 'POST', { cpfEletrico: E, cnpjoucpf: '123', cpfInspetor: A, tipoServico: '32' })))).toBe(403)
    expect(gravouVinculo()).toBe(false)
  })
})

describe('falha da consulta da chave e porteiro desligado', () => {
  it('consulta da chave falhou: arquivo com chave é NEGADO, mas o prefixado pelo CPF segue', async () => {
    estado.falhaChave = true
    expect(await ler('/api/vistorias?nome=INS-001_123_33_1.json')).toBe(403)
    expect(await ler(`/api/vistorias?nome=${A}_123_33_1.json`)).toBe(200)
  })
  it('porteiro DESLIGADO (AUTH_API_ATIVA ausente): comportamento antigo, apaga de outro', async () => {
    ligarPorteiro(false)
    expect(await apagar('INS-002_123_33_1.json')).toBe(200)
    expect(quantas(/DELETE .*storage/)).toBe(1)
  })
})

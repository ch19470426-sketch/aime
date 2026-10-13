// Chave do inspetor = CPF (decisão de Celso, 13/10/2026), decidida SEMPRE no servidor. Os arquivos têm o nome começando pela chave e a
// auditoria de dono só deixa mexer em arquivo cuja chave é a do usuário logado; uma chave gravada a partir do navegador faria um
// inspetor enxergar os arquivos de outro.
import { describe, it, expect, beforeEach } from 'vitest'
import { A, B, estado, reiniciar, sessao, req, status, chamadas, quantas } from '../helpers'
import { chaveDoCpf } from '@/lib/chaveInspetor'
import * as gerar from '@/app/api/gerar-chave-inspetor/route'
import * as salvar from '@/app/api/salvar-inspetor/route'

beforeEach(reiniciar)

const gravacoesDeChave = () => chamadas().filter(c => c.m === 'PATCH' && /rest\/v1\/inspetor/.test(c.p) && /chave_inspetor/.test(c.b))
const insercoes = () => chamadas().filter(c => c.m === 'POST' && /rest\/v1\/inspetor/.test(c.p))
const cadastro = (cpf: string) => ({ cpf, nome: 'Novo', titulo: 'Eng Civil', inscricao_crea_cau: 'CREA 1', email: 'n@x.com', whatsapp: '', cep: '', nr_imovel: '1' })

describe('a chave é o CPF', () => {
  it('só dígitos, mesmo que o CPF venha com pontuação', () => {
    expect(chaveDoCpf('054.912.397-04')).toBe('05491239704')
    expect(chaveDoCpf('05491239704')).toBe('05491239704')
    expect(chaveDoCpf(undefined)).toBe('')
  })
})

describe('gerar-chave-inspetor', () => {
  it('cadastro antigo sem chave: o CPF é gravado como chave, SÓ onde a chave está vazia', async () => {
    estado.chaves[A] = null
    const r = await gerar.POST(req('/api/gerar-chave-inspetor', 'POST'))
    expect(r.status).toBe(200)
    expect((await r.json()).chave).toBe(A)
    expect(gravacoesDeChave()).toHaveLength(1)
    expect(gravacoesDeChave()[0].b).toContain(A)
    expect(gravacoesDeChave()[0].q).toMatch(/chave_inspetor=is\.null/)
  })
  it('quem já tem chave (inclusive uma INS-nnn de antes da migração) recebe a MESMA, sem gravar nada', async () => {
    const r = await gerar.POST(req('/api/gerar-chave-inspetor', 'POST'))
    expect((await r.json()).chave).toBe('INS-001')
    expect(gravacoesDeChave()).toHaveLength(0)
  })
  it('sem sessão: 401', async () => {
    sessao(null)
    expect(await status(gerar.POST(req('/api/gerar-chave-inspetor', 'POST')))).toBe(401)
  })
})

describe('salvar-inspetor: a chave NUNCA vem do navegador', () => {
  const soAtualizarChave = (cpf: string, chave?: string) => salvar.POST(req('/api/salvar-inspetor', 'POST', { cpf, soAtualizarChave: true, chave }))

  it('cadastro sem chave tentando gravar a chave de OUTRO inspetor (INS-002): o servidor ignora e grava o CPF', async () => {
    estado.chaves[A] = null
    const r = await soAtualizarChave(A, 'INS-002')
    expect((await r.json()).chave).toBe(A)
    expect(gravacoesDeChave()).toHaveLength(1)
    expect(gravacoesDeChave()[0].b).toContain(A)
    expect(gravacoesDeChave()[0].b).not.toContain('INS-002')
  })
  it('cadastro que JÁ tem chave: devolve a dele e não grava nada', async () => {
    const r = await soAtualizarChave(A, 'INS-002')
    expect((await r.json()).chave).toBe('INS-001')
    expect(gravacoesDeChave()).toHaveLength(0)
  })
  it('em nome de OUTRO CPF: 403 e nada é gravado', async () => {
    expect(await status(soAtualizarChave(B, 'INS-002'))).toBe(403)
    expect(gravacoesDeChave()).toHaveLength(0)
  })
  it('novo cadastro: a chave gravada é o CPF', async () => {
    estado.cadastroExiste = false
    const r = await salvar.POST(req('/api/salvar-inspetor', 'POST', cadastro(A)))
    expect(r.status).toBe(200)
    expect((await r.json()).chave).toBe(A)
    expect(insercoes()[0].b).toContain(`"chave_inspetor":"${A}"`)
  })
  it('novo cadastro: uma chave enviada no corpo é ignorada', async () => {
    estado.cadastroExiste = false
    const r = await salvar.POST(req('/api/salvar-inspetor', 'POST', { ...cadastro(A), chave: 'INS-002' }))
    expect((await r.json()).chave).toBe(A)
    expect(insercoes()[0].b).not.toContain('INS-002')
  })
  it('não consulta nem grava nenhum contador de chave (a sequência foi abandonada)', async () => {
    estado.cadastroExiste = false
    await salvar.POST(req('/api/salvar-inspetor', 'POST', cadastro(A)))
    expect(quantas(/rpc\/proxima_chave_inspetor/)).toBe(0)
  })
})

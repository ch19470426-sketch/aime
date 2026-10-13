// Chave de inspetor (INS-nnn): decidida SEMPRE no servidor, pela sequência do banco. Os arquivos têm o nome começando pela chave e a
// auditoria de dono só deixa mexer em arquivo cuja chave é a do usuário logado; chave repetida, reaproveitada ou gravada a partir do
// navegador faria um inspetor enxergar os arquivos de outro.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { A, B, estado, reiniciar, sessao, req, status, chamadas, quantas } from '../helpers'
import { formatarChave } from '@/lib/chaveInspetor'
import * as gerar from '@/app/api/gerar-chave-inspetor/route'
import * as salvar from '@/app/api/salvar-inspetor/route'

beforeEach(() => {
  reiniciar()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

const gravacoesDeChave = () => chamadas().filter(c => c.m === 'PATCH' && /rest\/v1\/inspetor/.test(c.p) && /chave_inspetor/.test(c.b))
const insercoes = () => chamadas().filter(c => c.m === 'POST' && /rest\/v1\/inspetor/.test(c.p))
const cadastro = (cpf: string) => ({ cpf, nome: 'Novo', titulo: 'Eng Civil', inscricao_crea_cau: 'CREA 1', email: 'n@x.com', whatsapp: '', cep: '', nr_imovel: '1' })

describe('formatação da chave', () => {
  it('três dígitos com zero à esquerda até 999; a partir de 1000 não corta dígito', () => {
    expect([1, 7, 42, 999, 1000, 1001, 12345].map(formatarChave)).toEqual(['INS-001', 'INS-007', 'INS-042', 'INS-999', 'INS-1000', 'INS-1001', 'INS-12345'])
  })
})

describe('gerar-chave-inspetor', () => {
  it('cadastro antigo sem chave: recebe a chave da sequência, gravada SÓ onde a chave está vazia', async () => {
    estado.chaves[A] = null
    const r = await gerar.POST(req('/api/gerar-chave-inspetor', 'POST'))
    expect(r.status).toBe(200)
    expect((await r.json()).chave).toBe('INS-010')
    expect(gravacoesDeChave()).toHaveLength(1)
    expect(gravacoesDeChave()[0].b).toContain('INS-010')
    expect(gravacoesDeChave()[0].q).toMatch(/chave_inspetor=is\.null/)
  })
  it('quem já tem chave recebe a MESMA, sem gastar número da sequência', async () => {
    const r = await gerar.POST(req('/api/gerar-chave-inspetor', 'POST'))
    expect((await r.json()).chave).toBe('INS-001')
    expect(quantas(/rpc\/proxima_chave_inspetor/)).toBe(0)
    expect(gravacoesDeChave()).toHaveLength(0)
  })
  it('sem sessão: 401', async () => {
    sessao(null)
    expect(await status(gerar.POST(req('/api/gerar-chave-inspetor', 'POST')))).toBe(401)
  })
})

describe('salvar-inspetor: a chave NUNCA vem do navegador', () => {
  const soAtualizarChave = (cpf: string, chave?: string) => salvar.POST(req('/api/salvar-inspetor', 'POST', { cpf, soAtualizarChave: true, chave }))

  it('cadastro sem chave tentando gravar a chave de OUTRO inspetor (INS-002): o servidor ignora e atribui a da sequência', async () => {
    estado.chaves[A] = null
    const r = await soAtualizarChave(A, 'INS-002')
    expect((await r.json()).chave).toBe('INS-010')
    expect(gravacoesDeChave()).toHaveLength(1)
    expect(gravacoesDeChave()[0].b).toContain('INS-010')
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
  it('novo cadastro: a chave vem da sequência do banco', async () => {
    estado.cadastroExiste = false
    const r = await salvar.POST(req('/api/salvar-inspetor', 'POST', cadastro(A)))
    expect(r.status).toBe(200)
    expect((await r.json()).chave).toBe('INS-010')
    expect(insercoes()[0].b).toContain('"chave_inspetor":"INS-010"')
  })
  it('novo cadastro: uma chave enviada no corpo é ignorada', async () => {
    estado.cadastroExiste = false
    const r = await salvar.POST(req('/api/salvar-inspetor', 'POST', { ...cadastro(A), chave: 'INS-002' }))
    expect((await r.json()).chave).toBe('INS-010')
    expect(insercoes()[0].b).not.toContain('INS-002')
  })
})

describe('sequência ainda não criada no banco (SQL não executado): cálculo numérico de reserva', () => {
  beforeEach(() => { estado.rpcChaveAusente = true; estado.cadastroExiste = false })
  const cadastrar = async () => (await (await salvar.POST(req('/api/salvar-inspetor', 'POST', cadastro(A)))).json()).chave
  it('compara NÚMEROS, e não o texto: com INS-001, INS-999 e INS-1000 (em qualquer ordem) a próxima é INS-1001', async () => {
    estado.chavesExistentes = ['INS-999', 'INS-1000', 'INS-001']   // fora de ordem de propósito
    expect(await cadastrar()).toBe('INS-1001')
  })
  it('sem nenhuma chave, começa em INS-001', async () => {
    expect(await cadastrar()).toBe('INS-001')
  })
})

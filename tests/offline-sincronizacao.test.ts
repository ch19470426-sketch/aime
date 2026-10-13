// Vistoria salva SEM internet antes da migração da chave para o CPF (13/10/2026): o item guarda a chave antiga (INS-nnn). Ao sincronizar,
// o servidor só aceita arquivo cujo nome comece pela chave atual (o CPF); sem a troca, o item ficaria preso na fila para sempre.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { A, E, estado, reiniciar, sessao, req, status, quantas, chamadas } from './helpers'
import { chaveParaSincronizar } from '@/lib/nomeArquivo'
import * as salvar from '@/app/api/salvar-vistoria/route'

beforeEach(() => { reiniciar(); vi.spyOn(console, 'error').mockImplementation(() => {}) })

describe('chaveParaSincronizar', () => {
  it('chave antiga INS-nnn vira o CPF do dono', () => {
    expect(chaveParaSincronizar('INS-001', A)).toBe(A)
    expect(chaveParaSincronizar('ins-1000', '054.912.397-04')).toBe('05491239704')
  })
  it('chave que já é o CPF é mantida', () => {
    expect(chaveParaSincronizar(A, A)).toBe(A)
  })
  it('sem CPF do dono, mantém a chave (não inventa)', () => {
    expect(chaveParaSincronizar('INS-001', '')).toBe('INS-001')
    expect(chaveParaSincronizar('INS-001', undefined)).toBe('INS-001')
  })
  it('chave vazia ou de outro formato não é alterada', () => {
    expect(chaveParaSincronizar('', A)).toBe('')
    expect(chaveParaSincronizar(undefined, A)).toBe('')
    expect(chaveParaSincronizar('XYZ-9', A)).toBe('XYZ-9')
  })
})

describe('o servidor, já migrado, e a fila offline', () => {
  const enviar = (nomeArquivo: string, payload: Record<string, unknown>) => status(salvar.POST(req('/api/salvar-vistoria', 'POST', { nomeArquivo, payload })))
  const item = (chaveInspetor: string, extra: Record<string, unknown> = {}) => ({ chaveInspetor, cpfInspetor: A, cnpjoucpf: '123', tipoServico: '33', ...extra })
  const nomeSincronizado = (it: ReturnType<typeof item>, nr: string) => `${chaveParaSincronizar(it.chaveInspetor, (it as any).cpfEletrico ?? it.cpfInspetor)}_${it.cnpjoucpf}_${it.tipoServico}_${nr}.json`

  it('banco migrado (chave = CPF): o nome com a chave ANTIGA é recusado (era o item preso na fila)', async () => {
    estado.chaves[A] = A
    expect(await enviar('INS-001_123_33_1.json', item('INS-001'))).toBe(403)
  })
  it('banco migrado: o mesmo item, depois da troca da chave, é aceito, grava e debita o dono', async () => {
    estado.chaves[A] = A
    const it = item('INS-001')
    expect(await enviar(nomeSincronizado(it, '1'), { ...it, chaveInspetor: A })).toBe(200)
    expect(quantas(/storage/)).toBe(1)
    expect(chamadas().filter(c => /rpc\/consumir_creditos/.test(c.p))).toHaveLength(1)
  })
  it('item que já nasceu com o CPF segue igual', async () => {
    estado.chaves[A] = A
    const it = item(A)
    expect(nomeSincronizado(it, '2')).toBe(`${A}_123_33_2.json`)
    expect(await enviar(nomeSincronizado(it, '2'), it)).toBe(200)
  })
  it('fluxo elétrico: o dono da chave é o ELETRICISTA, e o débito continua sendo dele', async () => {
    sessao(E)
    estado.chaves[E] = E
    const it = item('INS-777', { cpfEletrico: E, tipoServico: '39' })
    const nome = nomeSincronizado(it, '3')
    expect(nome).toBe(`${E}_123_39_3.json`)
    expect(await enviar(nome, { ...it, chaveInspetor: E })).toBe(200)
    expect(chamadas().find(c => /rpc\/consumir_creditos/.test(c.p))?.b).toContain(E)
  })
})

describe('as duas cópias da regra (fila do app e service worker) fazem o mesmo', () => {
  it('offlineVistoria.ts usa chaveParaSincronizar', () => {
    const codigo = readFileSync('src/lib/offlineVistoria.ts', 'utf-8')
    expect(codigo).toContain('chaveParaSincronizar(')
    expect(codigo).not.toMatch(/const chave\s*=\s*item\.chaveInspetor \?\? item\.payload\?\.chaveInspetor\s*$/m)
  })
  it('public/sw.js tem a regra e dá o mesmo resultado que a função', () => {
    const sw = readFileSync('public/sw.js', 'utf-8')
    const ini = sw.indexOf('const chaveSalva'); const fim = sw.indexOf('const nomeArquivo', ini)
    expect(ini).toBeGreaterThan(-1)
    const regra = sw.slice(ini, fim)
    const executar = (payload: Record<string, unknown>) => new Function('payload', `${regra}; return chave`)(payload) as string
    const casos: [string, string | undefined, string | undefined][] = [['INS-001', A, undefined], [A, A, undefined], ['INS-777', A, E], ['INS-001', undefined, undefined], ['', A, undefined], ['XYZ-9', A, undefined]]
    for (const [chave, cpfInspetor, cpfEletrico] of casos) {
      expect(executar({ chaveInspetor: chave, cpfInspetor, cpfEletrico })).toBe(chaveParaSincronizar(chave, cpfEletrico || cpfInspetor))
    }
  })
})

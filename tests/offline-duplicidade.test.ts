// Envio duplicado da vistoria offline. Antes, se o app fosse interrompido depois de o servidor gravar a vistoria e ANTES de apagar o item da
// fila (sinal ruim, página fechada, falha de carregamento), a tentativa seguinte pedia um NÚMERO DE FOTO novo, gravava um segundo arquivo e
// cobrava 1 CR de novo (a trava do débito usa o número da foto como referência). E o app e o service worker, em segundo plano, podiam
// percorrer a mesma fila ao mesmo tempo. Agora o número é guardado no item e reaproveitado, e só um sincronizador roda por vez.
import 'fake-indexeddb/auto'
import FDBFactory from 'fake-indexeddb/lib/FDBFactory'
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { A } from './helpers'
import { salvarOffline, listarPendentes, sincronizarPendentes } from '@/lib/offlineVistoria'

const fetchOriginal = globalThis.fetch
afterAll(() => { globalThis.fetch = fetchOriginal })

// ── o "servidor": numera as fotos, grava a vistoria por nome (sobrescreve) e debita por referência (não repete a mesma)
let servidor: { fotoNr: number; chamadasFotoNr: number; chamadasSalvar: number; arquivos: Set<string>; debitos: Set<string>; perderResposta: boolean; lentidaoMs: number }
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })
const esperar = (ms: number) => new Promise(r => setTimeout(r, ms))
async function fetchFalso(entrada: any, init: any = {}): Promise<Response> {
  const url = typeof entrada === 'string' ? entrada : String(entrada?.url ?? entrada)
  if (url.includes('/api/foto-nr')) {
    servidor.chamadasFotoNr++
    await esperar(servidor.lentidaoMs)
    servidor.fotoNr++
    return resposta({ formatado: String(servidor.fotoNr).padStart(4, '0') })
  }
  if (url.includes('/api/salvar-vistoria')) {
    servidor.chamadasSalvar++
    const { nomeArquivo, payload } = JSON.parse(String(init.body))
    servidor.arquivos.add(nomeArquivo)                                                                       // upsert: mesmo nome, mesmo arquivo
    servidor.debitos.add(`${payload.cnpjoucpf}_${payload.tipoServico}_foto_${payload.fotoNr}`)               // mesma referência, mesmo débito
    if (servidor.perderResposta) throw new TypeError('Failed to fetch')                                      // o servidor fez tudo, mas a resposta não chegou
    return resposta({ sucesso: true })
  }
  return resposta({})
}

function instalarLocks(): void {
  const emUso = new Set<string>()
  const locks = {
    request: async (nome: string, opcoes: any, cb: (lock: unknown) => Promise<unknown>) => {
      if (opcoes?.ifAvailable && emUso.has(nome)) return cb(null)
      emUso.add(nome)
      try { return await cb({ name: nome }) } finally { emUso.delete(nome) }
    },
  }
  Object.defineProperty(globalThis, 'navigator', { value: { locks }, configurable: true, writable: true })
}

beforeEach(() => {
  ;(globalThis as any).indexedDB = new FDBFactory()          // banco limpo a cada teste
  servidor = { fotoNr: 0, chamadasFotoNr: 0, chamadasSalvar: 0, arquivos: new Set(), debitos: new Set(), perderResposta: false, lentidaoMs: 0 }
  vi.stubGlobal('fetch', fetchFalso)
  instalarLocks()
})

const guardar = (chaveInspetor = A) => salvarOffline({ cpfInspetor: A, chaveInspetor, cnpjoucpf: '123', tipoServico: '32', nc: 'NC', cp: 'CP', fotoBase64: 'data:image/jpeg;base64,AAAA' })

// ── o service worker: o sw.js REAL, executado num ambiente isolado
function carregarServiceWorker() {
  const contexto: Record<string, unknown> = {
    self: { addEventListener() {}, skipWaiting() {}, clients: { claim() {} } },
    navigator: (globalThis as any).navigator, indexedDB: (globalThis as any).indexedDB, fetch: fetchFalso,
    caches: { open: async () => ({ addAll: async () => {}, put: async () => {} }), keys: async () => [], match: async () => undefined, delete: async () => true },
    console, Response, URL, Promise, JSON, Date, Math, setTimeout, String, Object, Array, RegExp,
  }
  vm.createContext(contexto)
  vm.runInContext(readFileSync('public/sw.js', 'utf-8'), contexto)
  return contexto as { sincronizarVistorias: () => Promise<unknown> }
}

// Os mesmos cenários para o app e para o service worker
const sincronizadores: [string, () => Promise<unknown>][] = [
  ['app (offlineVistoria.ts)', () => sincronizarPendentes()],
  ['service worker (sw.js)', () => carregarServiceWorker().sincronizarVistorias()],
]

describe.each(sincronizadores)('sincronização offline: %s', (_nome, sincronizar) => {
  it('caminho normal: grava 1 arquivo, debita 1x e esvazia a fila', async () => {
    await guardar()
    await sincronizar()
    expect(servidor.chamadasFotoNr).toBe(1)
    expect(servidor.arquivos.size).toBe(1)
    expect(servidor.debitos.size).toBe(1)
    expect(await listarPendentes()).toHaveLength(0)
  })

  it('INTERRUPÇÃO: o servidor gravou e debitou, a resposta se perdeu; a tentativa seguinte NÃO grava um segundo arquivo nem cobra de novo', async () => {
    await guardar('INS-001')                 // item salvo antes da migração: também é trocado pelo CPF
    servidor.perderResposta = true
    await sincronizar()                      // 1ª tentativa: o cliente acha que falhou
    expect(await listarPendentes()).toHaveLength(1)                      // o item continua na fila...
    expect((await listarPendentes())[0].nrSincronizacao).toBe('0001')    // ...com o número da foto guardado
    servidor.perderResposta = false
    await sincronizar()                      // 2ª tentativa
    expect(servidor.chamadasSalvar).toBe(2)  // o cliente reenviou
    expect(servidor.chamadasFotoNr).toBe(1)  // MAS não pediu número novo
    expect(servidor.arquivos.size).toBe(1)   // o mesmo arquivo foi sobrescrito
    expect([...servidor.arquivos][0]).toBe(`${A}_123_32_0001.json`)
    expect(servidor.debitos.size).toBe(1)    // o débito não se repetiu
    expect(await listarPendentes()).toHaveLength(0)
  })

  it('duas tentativas interrompidas seguidas continuam com o mesmo número', async () => {
    await guardar()
    servidor.perderResposta = true
    await sincronizar(); await sincronizar()
    servidor.perderResposta = false
    await sincronizar()
    expect(servidor.chamadasFotoNr).toBe(1)
    expect(servidor.arquivos.size).toBe(1)
    expect(servidor.debitos.size).toBe(1)
  })

  it('dois itens diferentes recebem números diferentes (o reaproveitamento é por item)', async () => {
    await guardar(); await guardar()
    await sincronizar()
    expect(servidor.chamadasFotoNr).toBe(2)
    expect(servidor.arquivos.size).toBe(2)
    expect(servidor.debitos.size).toBe(2)
  })
})

describe('app e service worker ao mesmo tempo: só um percorre a fila', () => {
  it('dois sincronizadores do app em paralelo: o segundo não faz nada', async () => {
    await guardar()
    servidor.lentidaoMs = 30
    const [a, b] = await Promise.all([sincronizarPendentes(), sincronizarPendentes()])
    expect([a, b].filter((r: any) => r.ok === 1)).toHaveLength(1)
    expect(servidor.chamadasFotoNr).toBe(1)
    expect(servidor.chamadasSalvar).toBe(1)
    expect(servidor.debitos.size).toBe(1)
  })
  it('app e service worker em paralelo (o caso real ao religar a conexão): só um grava e cobra', async () => {
    await guardar()
    servidor.lentidaoMs = 30
    await Promise.all([sincronizarPendentes(), carregarServiceWorker().sincronizarVistorias()])
    expect(servidor.chamadasFotoNr).toBe(1)
    expect(servidor.chamadasSalvar).toBe(1)
    expect(servidor.arquivos.size).toBe(1)
    expect(servidor.debitos.size).toBe(1)
    expect(await listarPendentes()).toHaveLength(0)
  })
  it('depois que o primeiro termina, um novo sincronizador volta a funcionar (a trava é liberada)', async () => {
    await guardar()
    await sincronizarPendentes()
    await guardar()
    const r: any = await sincronizarPendentes()
    expect(r.ok).toBe(1)
    expect(servidor.arquivos.size).toBe(2)
  })
})

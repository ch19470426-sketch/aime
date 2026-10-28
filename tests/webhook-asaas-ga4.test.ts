/* eslint-disable @typescript-eslint/no-explicit-any */
// Webhook do Asaas + envio de compras ao GA4 (marketing, 28/10/2026).
// Cobre DINHEIRO (créditos liberados uma só vez, estorno) e a ligação com o GA4. Banco, Asaas e Google são SIMULADOS aqui
// (banco em memória, fetch falso): nada real é chamado, e os valores de chave abaixo são FALSOS.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'

const g = globalThis as any
g.__DEPOIS = [] as Promise<unknown>[]

vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => { g.__DEPOIS.push(Promise.resolve().then(fn)) } }))
vi.mock('@/lib/creditos', async (orig) => ({
  ...(await orig<typeof import('@/lib/creditos')>()),
  concederCreditos: vi.fn(async () => ({ ok: true })),
  revogarCreditos: vi.fn(async () => ({ revogados: 900, naoRecuperados: 300 })),
}))
vi.mock('@/lib/bloqueio', async (orig) => ({ ...(await orig<typeof import('@/lib/bloqueio')>()), bloquearConta: vi.fn(async () => {}), avisarSuporte: vi.fn(async () => {}) }))
vi.mock('@/lib/assinaturas', async (orig) => ({ ...(await orig<typeof import('@/lib/assinaturas')>()), avisarInspetor: vi.fn(async () => {}) }))

process.env.ASAAS_WEBHOOK_TOKEN = 'token-falso'
process.env.GA4_MEASUREMENT_ID = 'G-FALSO000'
process.env.GA4_API_SECRET = 'segredo-falso'

// ─── banco em memória + Asaas e Google falsos ───
const UNICAS: Record<string, string[]> = {
  pedidos_credito: ['asaas_payment_id'], eventos_asaas: ['evento_id'], ga4_envios: ['transaction_id', 'evento'],
  atribuicao_compra: ['pedido_id'],
}
// valores padrão das colunas (o banco de verdade aplica os DEFAULTs do SQL)
const PADROES: Record<string, any> = { pedidos_credito: { status: 'aguardando_pagamento' }, ga4_envios: { status: 'pendente', tentativas: 0 }, eventos_asaas: { situacao: 'recebido' } }
let db: Record<string, any[]> = {}
let cobrancas: Record<string, any> = {}
let ga4Chamadas: { url: string; corpo: any }[] = []
let ga4Falha = false
let bancoCaido = false
let seq = 100
const resp = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } })

function casa(l: any, k: string, v: string): boolean {
  if (['select', 'order', 'limit', 'on_conflict', 'columns'].includes(k)) return true
  const [op, ...r] = v.split('.'); const val = r.join('.')
  const x = l[k] === null || l[k] === undefined ? 'null' : String(l[k])
  if (op === 'eq') return x === val
  if (op === 'neq') return x !== val
  if (op === 'is') return x === val
  if (op === 'in') return val.slice(1, -1).split(',').map(a => a.replace(/"/g, '')).includes(x)
  return true
}

async function falso(input: any, init: any = {}): Promise<Response> {
  const u = new URL(typeof input === 'string' ? input : (input.url ?? String(input)))
  const m = String(init.method || 'GET').toUpperCase()
  if (u.host.includes('google-analytics')) {
    ga4Chamadas.push({ url: u.toString(), corpo: JSON.parse(init.body) })
    return ga4Falha ? resp({}, 500) : new Response(null, { status: 204 })
  }
  if (u.host.includes('asaas.com')) {
    const id = u.pathname.split('/').pop()!
    if (u.pathname.includes('/subscriptions/')) return resp({ id, nextDueDate: '2026-12-28', status: 'ACTIVE' })
    return cobrancas[id] ? resp(cobrancas[id]) : resp({ errors: [{ description: 'Não encontrado' }] }, 404)
  }
  if (!u.pathname.includes('/rest/v1/')) return resp({})
  if (bancoCaido) return resp({ message: 'banco fora' }, 500)
  const tabela = u.pathname.split('/rest/v1/')[1]
  const linhas = (db[tabela] ??= [])
  const filtros = [...u.searchParams.entries()]
  const prefer = new Headers(init.headers).get('prefer') ?? ''
  const unico = String(new Headers(init.headers).get('accept') ?? '').includes('vnd.pgrst.object')
  const saida = (rows: any[], s = 200) => resp(unico ? (rows[0] ?? null) : rows, s)
  if (m === 'GET') return saida(linhas.filter(l => filtros.every(([k, v]) => casa(l, k, v))))
  if (m === 'PATCH') {
    const alvo = linhas.filter(l => filtros.every(([k, v]) => casa(l, k, v)))
    alvo.forEach(l => Object.assign(l, JSON.parse(init.body)))
    return prefer.includes('return=representation') ? saida(alvo) : new Response(null, { status: 204 })
  }
  if (m === 'POST') {
    const novos: any[] = [].concat(JSON.parse(init.body))
    const criados: any[] = []
    for (const n of novos) {
      const chaves = UNICAS[tabela] ?? []
      const dup = chaves.length > 0 && chaves.every(c => n[c] !== undefined && n[c] !== null) && linhas.some(l => chaves.every(c => l[c] === n[c]))
      if (dup) {
        if (prefer.includes('ignore-duplicates')) continue
        return resp({ code: '23505', message: 'duplicate key' }, 409)
      }
      const linha = { id: ++seq, ...(PADROES[tabela] ?? {}), ...n }; linhas.push(linha); criados.push(linha)
    }
    return prefer.includes('return=representation') ? saida(criados, 201) : new Response(null, { status: 201 })
  }
  return resp([])
}

// ─── cenário ───
const CPF = '11111111111'
const pedido = (extra: any = {}) => ({ id: 1, cpf_inspetor: CPF, tipo: 'PLANO MENSAL', qde_creditos: 1200, valor: 137.7, status: 'aguardando_pagamento', asaas_payment_id: 'pay_1', assinatura_id: null, estornado_em: null, ...extra })
const cob = (extra: any = {}) => ({ id: 'pay_1', status: 'RECEIVED', value: 137.7, billingType: 'PIX', invoiceUrl: 'x', dueDate: '2026-10-28', ...extra })
const aviso = (id: string, event: string, payment: any = {}) => ({ id, event, payment: { id: 'pay_1', status: 'RECEIVED', value: 137.7, ...payment } })
const ATRIB = { pedido_id: 1, ga_client_id: '1111111111.2222222222', ga_session_id: '1700000000', origem: { gclid: 'abc' }, consentimento: 'granted' }

let POST: (r: NextRequest) => Promise<Response>
let creditos: typeof import('@/lib/creditos')
const chamar = (corpo: unknown, token = 'token-falso') =>
  POST(new NextRequest('http://localhost/api/asaas-webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'asaas-access-token': token }, body: JSON.stringify(corpo) }))
const depois = async () => { await Promise.all(g.__DEPOIS.splice(0)) }
const envios = () => db.ga4_envios ?? []
const enviados = () => ga4Chamadas.map(c => c.corpo)

beforeAll(async () => {
  globalThis.fetch = falso as any
  POST = (await import('@/app/api/asaas-webhook/route')).POST
  creditos = await import('@/lib/creditos')
})
beforeEach(() => {
  db = { pedidos_credito: [pedido()], atribuicao_compra: [{ ...ATRIB }], assinaturas: [], contratos_inspetor: [] }
  cobrancas = { pay_1: cob() }; ga4Chamadas = []; ga4Falha = false; bancoCaido = false; g.__DEPOIS.length = 0
  vi.mocked(creditos.concederCreditos).mockClear(); vi.mocked(creditos.revogarCreditos).mockClear()
  vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('webhook do Asaas — segurança e resposta', () => {
  it('token inválido → 401 e nada é tocado', async () => {
    expect((await chamar(aviso('evt_1', 'PAYMENT_RECEIVED'), 'errado')).status).toBe(401)
    expect(creditos.concederCreditos).not.toHaveBeenCalled()
    expect(db.eventos_asaas ?? []).toHaveLength(0)
  })
  it('POST direto na URL do webhook → 200, sem redirecionamento; o Next não força barra final', async () => {
    const r = await chamar({ event: 'PING' })
    expect(r.status).toBe(200)
    expect(r.headers.get('location')).toBeNull()
    const cfg = readFileSync('next.config.ts', 'utf8')
    expect(cfg).not.toMatch(/trailingSlash\s*:\s*true/)
    expect(cfg).not.toMatch(/asaas-webhook/)
  })
  it('evento que não trata (PAYMENT_CREATED, cobrança ainda pendente) → 200 e nada acontece', async () => {
    cobrancas.pay_1 = cob({ status: 'PENDING' })
    expect((await chamar(aviso('evt_1', 'PAYMENT_CREATED', { status: 'PENDING' }))).status).toBe(200)
    await depois()
    expect(creditos.concederCreditos).not.toHaveBeenCalled()
    expect(envios()).toHaveLength(0)
  })
})

describe('liberação de créditos + purchase no GA4', () => {
  it('Pix pago (PAYMENT_RECEIVED) → créditos e UM purchase com os dados da visita', async () => {
    expect((await chamar(aviso('evt_1', 'PAYMENT_RECEIVED'))).status).toBe(200)
    await depois()
    expect(creditos.concederCreditos).toHaveBeenCalledTimes(1)
    expect(ga4Chamadas).toHaveLength(1)
    expect(ga4Chamadas[0].url).toContain('measurement_id=G-FALSO000')
    expect(envios()[0]).toMatchObject({ status: 'enviado', tentativas: 1 })
    const c = enviados()[0]
    expect(c.client_id).toBe('1111111111.2222222222')
    expect(c.consent).toBeUndefined()
    expect(c.events[0].name).toBe('purchase')
    expect(c.events[0].params).toMatchObject({ transaction_id: 'pay_1', currency: 'BRL', value: 137.7, payment_type: 'pix', session_id: '1700000000' })
    expect(c.events[0].params.items[0]).toMatchObject({ item_id: 'mensal', item_name: 'Plano Mensal', price: 137.7, quantity: 1 })
  })
  it('boleto pago → créditos e purchase com payment_type boleto', async () => {
    cobrancas.pay_1 = cob({ billingType: 'BOLETO' })
    await chamar(aviso('evt_1', 'PAYMENT_RECEIVED')); await depois()
    expect(creditos.concederCreditos).toHaveBeenCalledTimes(1)
    expect(enviados()[0].events[0].params.payment_type).toBe('boleto')
  })
  it('cartão: PAYMENT_CONFIRMED e depois PAYMENT_RECEIVED → créditos e purchase UMA vez só', async () => {
    cobrancas.pay_1 = cob({ billingType: 'CREDIT_CARD', status: 'CONFIRMED' })
    expect((await chamar(aviso('evt_1', 'PAYMENT_CONFIRMED', { status: 'CONFIRMED' }))).status).toBe(200)
    cobrancas.pay_1 = cob({ billingType: 'CREDIT_CARD', status: 'RECEIVED' })
    expect((await chamar(aviso('evt_2', 'PAYMENT_RECEIVED'))).status).toBe(200)
    await depois()
    expect(creditos.concederCreditos).toHaveBeenCalledTimes(1)
    expect(ga4Chamadas).toHaveLength(1)
    expect(enviados()[0].events[0].params.payment_type).toBe('cartao')
  })
  it('o MESMO evento duas vezes → 200 nas duas e nada duplicado', async () => {
    const a = await chamar(aviso('evt_1', 'PAYMENT_RECEIVED')); const b = await chamar(aviso('evt_1', 'PAYMENT_RECEIVED'))
    await depois()
    expect([a.status, b.status]).toEqual([200, 200])
    expect((await b.json()).jaProcessado).toBe(true)
    expect(creditos.concederCreditos).toHaveBeenCalledTimes(1)
    expect(ga4Chamadas).toHaveLength(1)
  })
  it('2ª cobrança de assinatura → créditos renovados e evento renovacao, com a origem da 1ª cobrança', async () => {
    db.assinaturas = [{ id: 7, cpf_inspetor: CPF, tipo: 'PLANO MENSAL', valor: 137.7, status: 'ativa', asaas_subscription_id: 'sub_1' }]
    db.pedidos_credito = [pedido({ status: 'pago', assinatura_id: 7 })]
    db.atribuicao_compra = [{ assinatura_id: 7, ga_client_id: '3333333333.4444444444', ga_session_id: '1700000001', origem: {}, consentimento: 'granted' }]
    cobrancas.pay_2 = cob({ id: 'pay_2', subscription: 'sub_1', billingType: 'CREDIT_CARD' })
    expect((await chamar(aviso('evt_9', 'PAYMENT_CONFIRMED', { id: 'pay_2' }))).status).toBe(200)
    await depois()
    expect(creditos.concederCreditos).toHaveBeenCalledTimes(1)
    const c = enviados()[0]
    expect(c.events[0].name).toBe('renovacao')
    expect(c.events[0].params.transaction_id).toBe('pay_2')
    expect(c.client_id).toBe('3333333333.4444444444')
  })
})

describe('estorno', () => {
  it('PAYMENT_REFUNDED → remove os créditos não usados e manda refund com o mesmo transaction_id e valor', async () => {
    db.pedidos_credito = [pedido({ status: 'pago' })]
    cobrancas.pay_1 = cob({ status: 'REFUNDED' })
    expect((await chamar(aviso('evt_5', 'PAYMENT_REFUNDED', { status: 'REFUNDED' }))).status).toBe(200)
    await depois()
    expect(creditos.revogarCreditos).toHaveBeenCalledWith(CPF, 1200, 'plano')
    expect(db.pedidos_credito[0].estornado_em).toBeTruthy()
    const c = enviados()[0]
    expect(c.events[0].name).toBe('refund')
    expect(c.events[0].params).toMatchObject({ transaction_id: 'pay_1', value: 137.7 })
  })
})

describe('GA4 nunca atrapalha o pagamento', () => {
  it('falha no envio ao GA4 → 200 ao Asaas, créditos liberados e o envio fica na fila', async () => {
    ga4Falha = true
    expect((await chamar(aviso('evt_1', 'PAYMENT_RECEIVED'))).status).toBe(200)
    await depois()
    expect(creditos.concederCreditos).toHaveBeenCalledTimes(1)
    expect(envios()).toHaveLength(1)
    expect(envios()[0]).toMatchObject({ status: 'pendente', tentativas: 1 })
    expect(JSON.stringify(envios()[0].payload)).not.toContain('segredo-falso')   // a chave nunca é gravada
    const logs = JSON.stringify([...vi.mocked(console.log).mock.calls, ...vi.mocked(console.error).mock.calls])
    expect(logs).not.toContain('segredo-falso')
  })
  it('sem as variáveis do GA4 → nada é enviado e a compra fica pendente', async () => {
    const id = process.env.GA4_MEASUREMENT_ID; delete process.env.GA4_MEASUREMENT_ID
    try { await chamar(aviso('evt_1', 'PAYMENT_RECEIVED')); await depois() } finally { process.env.GA4_MEASUREMENT_ID = id }
    expect(creditos.concederCreditos).toHaveBeenCalledTimes(1)
    expect(ga4Chamadas).toHaveLength(0)
    expect(envios()[0].status).toBe('pendente')
  })
  it('consentimento negado → client_id aleatório, sem session_id e com consent DENIED', async () => {
    db.atribuicao_compra = [{ ...ATRIB, consentimento: 'denied' }]
    await chamar(aviso('evt_1', 'PAYMENT_RECEIVED')); await depois()
    const c = enviados()[0]
    expect(c.client_id).not.toBe('1111111111.2222222222')
    expect(c.client_id).toMatch(/^\d+\.\d+$/)
    expect(c.events[0].params.session_id).toBeUndefined()
    expect(c.consent).toEqual({ ad_user_data: 'DENIED', ad_personalization: 'DENIED' })
  })
})

describe('falha de infraestrutura', () => {
  it('erro ao liberar créditos → 200 ao Asaas, evento fica em "erro" e é reprocessado depois, sem duplicar', async () => {
    vi.mocked(creditos.concederCreditos).mockResolvedValueOnce({ ok: false, erro: 'banco fora' })
    const r = await chamar(aviso('evt_1', 'PAYMENT_RECEIVED'))
    expect(r.status).toBe(200)
    expect((await r.json()).reprocessar).toBe(true)
    expect(db.eventos_asaas[0].situacao).toBe('erro')
    const { reprocessarEventosComErro } = await import('@/lib/eventosAsaas')
    expect((await reprocessarEventosComErro()).resolvidos).toBe(1)
    await depois()
    expect(db.eventos_asaas[0].situacao).toBe('processado')
    expect(creditos.concederCreditos).toHaveBeenCalledTimes(2)   // 1ª falhou; 2ª liberou
    expect(db.pedidos_credito[0].status).toBe('pago')
    expect(envios().filter(e => e.evento === 'purchase')).toHaveLength(1)
  })
})

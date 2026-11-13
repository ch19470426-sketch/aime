// Confirmação manual do estorno pelo gestor (13/11/2026): só gestor; só compra paga, ainda não estornada e com estorno solicitado no
// Asaas; roda o mesmo fluxo do estorno concluído (revoga, bloqueia). E a conferência diária de estornos no cron.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { estado, reiniciar, chamadas, req } from './helpers'
import * as rota from '@/app/api/gestor/confirmar-estorno/route'
import * as cron from '@/app/api/webhook-reprocessar/route'

const PEDIDO = { id: 49, status: 'pago', cpf_inspetor: '05491239704', tipo: 'PLANO MENSAL', qde_creditos: 1200, asaas_payment_id: 'pay_1', assinatura_id: null, estornado_em: null, valor: 137.7 }
const CONTRATO = { tipo_assinatura: 'PLANO MENSAL', data_inicio_contrato: '2026-10-27', data_fim_contrato: '2099-01-01', saldo_quantidade_plano: 1200, saldo_quantidade_avulso: 0 }
const COB_PENDENTE = { id: 'pay_1', status: 'CONFIRMED', value: 137.7, netValue: 134.47, refunds: [{ value: 137, status: 'PENDING' }] }

beforeEach(() => {
  reiniciar(); estado.gestor = true; estado.pedido = { ...PEDIDO }; estado.contratos = [CONTRATO]; estado.cobrancaAsaas = COB_PENDENTE
  vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'log').mockImplementation(() => {})
})
const confirmar = (corpo: unknown = { pedidoId: 49 }) => rota.POST(req('/api/gestor/confirmar-estorno', 'POST', corpo))
const saldoZerado = () => chamadas().some(c => c.m === 'PATCH' && /contratos_inspetor/.test(c.p) && /"saldo_quantidade_plano":0/.test(c.b))
const bloqueou = () => chamadas().some(c => c.m === 'PATCH' && /rest\/v1\/inspetor/.test(c.p) && /bloque/i.test(c.b))

describe('/api/gestor/confirmar-estorno', () => {
  it('quem não é gestor é barrado (403) e nada é tocado', async () => {
    estado.gestor = false
    expect((await confirmar()).status).toBe(403)
    expect(saldoZerado()).toBe(false); expect(bloqueou()).toBe(false)
  })
  it('pedido inválido: 400', async () => {
    expect((await confirmar({ pedidoId: 'x' })).status).toBe(400)
    expect((await confirmar({})).status).toBe(400)
  })
  it('estorno PENDING no Asaas: o gestor confirma e os créditos da compra são revogados', async () => {
    const r = await confirmar()
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j).toMatchObject({ estornado: true, revogados: 1200 })
    expect(saldoZerado()).toBe(true)   // o bloqueio da conta é do mesmo fluxo e já é testado em estornos.test.ts (aqui a sessão é de gestor, e conta de gestor não bloqueia)
  })
  it('grava quem confirmou no pedido', async () => {
    await confirmar()
    expect(chamadas().some(c => c.m === 'PATCH' && /pedidos_credito/.test(c.p) && /confirmado_gestor:/.test(c.b))).toBe(true)
  })
  it('sem estorno solicitado no Asaas: 409, nada é revogado (clique errado numa compra normal)', async () => {
    estado.cobrancaAsaas = { ...COB_PENDENTE, refunds: [] }
    const r = await confirmar()
    expect(r.status).toBe(409)
    expect(saldoZerado()).toBe(false); expect(bloqueou()).toBe(false)
  })
  it('pedido já estornado ou ainda não pago: 409', async () => {
    estado.pedido = { ...PEDIDO, estornado_em: '2026-11-01T00:00:00Z' }
    expect((await confirmar()).status).toBe(409)
    estado.pedido = { ...PEDIDO, status: 'aguardando_pagamento' }
    expect((await confirmar()).status).toBe(409)
    expect(saldoZerado()).toBe(false)
  })
})

describe('conferência diária de estornos no cron', () => {
  it('o cron confere os estornos e informa quantos estão em andamento', async () => {
    estado.pedido = [{ ...PEDIDO }] as any
    const r = await cron.GET(req('/api/webhook-reprocessar'))
    expect(r.status).toBe(200)
    expect((await r.json()).estornos).toMatchObject({ conferidos: 1, emAndamento: 1, tratados: 0 })
  })
})

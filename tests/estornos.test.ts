// Estorno do valor LÍQUIDO (decisão de Celso, 13/10/2026): a taxa do Asaas fica por conta do usuário, então o estorno que cobre o
// valor líquido (pago menos a taxa), com folga de R$ 1,00 quando há taxa, vale como estorno TOTAL: revoga os créditos e bloqueia a conta.
// Números reais do teste em produção: cobrança de R$ 81,00, netValue R$ 80,01, estornado R$ 80,00.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { estado, reiniciar, chamadas } from './helpers'
import { situacaoDeEstorno, processarCobranca } from '@/lib/pagamentos'

const PEDIDO = { id: 45, status: 'pago', cpf_inspetor: '05491239704', tipo: 'PLANO SERVIÇO', qde_creditos: 600, asaas_payment_id: 'pay_1', assinatura_id: null, estornado_em: null, valor: 81 }
const CONTRATO = { tipo_assinatura: 'PLANO SERVIÇO', data_inicio_contrato: '2026-10-13', data_fim_contrato: '2099-01-01', saldo_quantidade_plano: 600, saldo_quantidade_avulso: 0 }

beforeEach(() => {
  reiniciar()
  estado.pedido = PEDIDO
  estado.contratos = [CONTRATO]
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const cob = (refunds: unknown[], extra: Record<string, unknown> = {}) => ({ value: 81, netValue: 80.01, status: 'RECEIVED', refunds, ...extra })
const feito = (value: number) => ({ value, status: 'DONE' })
const tipo = (c: unknown) => situacaoDeEstorno(c as any).tipo

describe('situacaoDeEstorno (valor R$ 81,00; taxa R$ 0,99; líquido R$ 80,01)', () => {
  it('CASO REAL: estornado 80,00 sobre líquido 80,01 (arredondado para baixo) = total', () => {
    expect(tipo(cob([feito(80)]))).toBe('total')
  })
  it('estorno do líquido (80,01) e do valor inteiro (81,00) = total', () => {
    expect(tipo(cob([feito(80.01)]))).toBe('total')
    expect(tipo(cob([feito(81)]))).toBe('total')
  })
  it('dois estornos que somam o líquido = total', () => {
    expect(tipo(cob([feito(40), feito(40.01)]))).toBe('total')
  })
  it('limite da folga: 79,01 = total; 79,00 = parcial', () => {
    expect(tipo(cob([feito(79.01)]))).toBe('total')
    expect(tipo(cob([feito(79)]))).toBe('parcial')
  })
  it('estorno de 40,00 = parcial', () => {
    expect(tipo(cob([feito(40)]))).toBe('parcial')
  })
  it('sem taxa (líquido = valor) não há folga: 80,00 de 81,00 = parcial; 81,00 = total', () => {
    expect(tipo(cob([feito(80)], { netValue: 81 }))).toBe('parcial')
    expect(tipo(cob([feito(81)], { netValue: 81 }))).toBe('total')
  })
  it('sem netValue no aviso: vale o valor da cobrança, sem folga (80,01 de 81,00 = parcial)', () => {
    expect(tipo({ value: 81, refunds: [feito(80.01)] })).toBe('parcial')
  })
  it('netValue maior que o valor (dado estranho): vale o valor', () => {
    expect(tipo(cob([feito(81)], { netValue: 90 }))).toBe('total')
  })
  it('estorno pendente = em andamento; negado ou cancelado = nenhum; sem estornos = nenhum', () => {
    expect(tipo(cob([{ value: 80.01, status: 'PENDING' }]))).toBe('andamento')
    expect(tipo(cob([{ value: 80.01, status: 'DENIED' }]))).toBe('nenhum')
    expect(tipo(cob([{ value: 80.01, status: 'CANCELLED' }]))).toBe('nenhum')
    expect(tipo(cob([]))).toBe('nenhum')
  })
})

describe('aviso do Asaas (processarCobranca)', () => {
  const avisar = (evento: string, statusCob: string, corpo: Record<string, unknown>) => processarCobranca('pay_1', evento, statusCob, corpo as any)
  const saldoZerado = () => chamadas().some(c => c.m === 'PATCH' && /contratos_inspetor/.test(c.p) && /"saldo_quantidade_plano":0/.test(c.b))
  const bloqueou = () => chamadas().some(c => c.m === 'PATCH' && /rest\/v1\/inspetor/.test(c.p) && /bloque/i.test(c.b))
  const email = (re: RegExp) => chamadas().filter(c => c.host.includes('resend') && re.test(c.b)).length
  const consultouAsaas = () => chamadas().filter(c => c.host.includes('asaas')).length

  it('PARCIAL sem líquido nem lista no corpo, API confirma o estorno do líquido: estorno TOTAL (zera o saldo, bloqueia, avisa o bloqueio, não manda o e-mail de parcial)', async () => {
    estado.cobrancaAsaas = { id: 'pay_1', status: 'RECEIVED', value: 81, netValue: 80.01, refunds: [feito(80)] }
    const r = await avisar('PAYMENT_PARTIALLY_REFUNDED', 'RECEIVED', { value: 81 })
    expect(r.status).toBe(200)
    expect(r.corpo.estornado).toBe(true)
    expect(saldoZerado()).toBe(true)
    expect(bloqueou()).toBe(true)
    expect(email(/Estorno PARCIAL/i)).toBe(0)
    expect(email(/Conta bloqueada/i)).toBeGreaterThanOrEqual(1)
  })
  it('corpo do aviso JÁ traz o líquido e o estorno: total sem consultar a API', async () => {
    const r = await avisar('PAYMENT_PARTIALLY_REFUNDED', 'RECEIVED', { value: 81, netValue: 80.01, refunds: [feito(80)] })
    expect(r.corpo.estornado).toBe(true)
    expect(consultouAsaas()).toBe(0)
  })
  it('estorno realmente PARCIAL (40,00): não revoga e avisa a equipe por e-mail', async () => {
    estado.cobrancaAsaas = cob([feito(40)])
    const r = await avisar('PAYMENT_PARTIALLY_REFUNDED', 'RECEIVED', { value: 81 })
    expect(r.corpo.motivo).toBe('estorno_parcial_avisado')
    expect(saldoZerado()).toBe(false)
    expect(bloqueou()).toBe(false)
    expect(email(/Estorno PARCIAL/i)).toBeGreaterThanOrEqual(1)
  })
  it('estorno do líquido ainda em andamento: não revoga ainda, avisa a equipe', async () => {
    estado.cobrancaAsaas = cob([{ value: 80.01, status: 'PENDING' }])
    const r = await avisar('PAYMENT_PARTIALLY_REFUNDED', 'RECEIVED', { value: 81 })
    expect(r.corpo.motivo).toBe('estorno_parcial_avisado')
    expect(saldoZerado()).toBe(false)
    expect(email(/Estorno PARCIAL/i)).toBeGreaterThanOrEqual(1)
  })
  it('API do Asaas fora do ar: não revoga, cai no aviso à equipe (Conferir estornos resolve depois)', async () => {
    estado.asaasFora = true
    const r = await avisar('PAYMENT_PARTIALLY_REFUNDED', 'RECEIVED', { value: 81 })
    expect(r.status).toBe(200)
    expect(r.corpo.motivo).toBe('estorno_parcial_avisado')
    expect(saldoZerado()).toBe(false)
    expect(email(/Estorno PARCIAL/i)).toBeGreaterThanOrEqual(1)
  })
  it('PAYMENT_REFUNDED (estorno inteiro): continua tratando como total', async () => {
    estado.cobrancaAsaas = cob([feito(81)], { status: 'REFUNDED' })
    const r = await avisar('PAYMENT_REFUNDED', 'REFUNDED', { value: 81, status: 'REFUNDED' })
    expect(r.corpo.estornado).toBe(true)
    expect(saldoZerado()).toBe(true)
    expect(bloqueou()).toBe(true)
  })
  it('PAYMENT_REFUND_IN_PROGRESS: não revoga nem bloqueia', async () => {
    await avisar('PAYMENT_REFUND_IN_PROGRESS', 'REFUND_IN_PROGRESS', { value: 81, status: 'REFUND_IN_PROGRESS' })
    expect(saldoZerado()).toBe(false)
    expect(bloqueou()).toBe(false)
  })
})

// Ajustes da vistoria 39 (14/10/2026): mínimo de 50 CR para iniciar (elétrico e mecânico), "elvadores" corrigido para "elevadores" e manual operacional novo.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { A, estado, reiniciar, req } from './helpers'
import { custoParaIniciar, decidirVerificacao, MINIMO_INICIAR_VISTORIA, MINIMO_INICIAR_VISTORIA_APOIO } from '@/lib/creditos'
import * as verificar from '@/app/api/creditos/verificar-servico/route'

beforeEach(reiniciar)

describe('crédito mínimo para iniciar a vistoria 39', () => {
  it('a vistoria 39 inicia com 50 CR; as demais vistorias (31 a 38) seguem com 100', () => {
    expect(MINIMO_INICIAR_VISTORIA_APOIO).toBe(50)
    expect(custoParaIniciar(39)).toBe(50)
    for (const codigo of [31, 32, 33, 34, 35, 36, 37, 38]) expect(custoParaIniciar(codigo)).toBe(MINIMO_INICIAR_VISTORIA)
    expect(MINIMO_INICIAR_VISTORIA).toBe(100)
  })
  it('o caso relatado: inspetor com 16 CR na vistoria 39 NÃO inicia, e a mensagem diz 50 (faltam 34), e não 100', () => {
    const v = decidirVerificacao({ existe: true, saldo_total: 16 }, custoParaIniciar(39)!)
    expect(v).toMatchObject({ liberado: false, motivo: 'saldo_insuficiente', necessario: 50, faltam: 34 })
  })
  it('limite exato: 49 não inicia, 50 e 116 iniciam', () => {
    expect(decidirVerificacao({ existe: true, saldo_total: 49 }, 50).liberado).toBe(false)
    expect(decidirVerificacao({ existe: true, saldo_total: 50 }, 50).liberado).toBe(true)
    expect(decidirVerificacao({ existe: true, saldo_total: 116 }, 50).liberado).toBe(true)
  })
  const consultar = async (codigo: number) => { const r = await verificar.GET(req(`/api/creditos/verificar-servico?cpf_inspetor=${A}&codigo_servico=${codigo}`)); return { s: r.status, j: await r.json() } }
  it('pela rota que o app consulta: 39 com 16 CR → precisa de 50 (faltam 34); a vistoria 32 com os mesmos 16 CR → precisa de 100 (faltam 84)', async () => {
    estado.saldo = { existe: true, isento: false, saldo_plano: 16, saldo_avulso: 0, saldo_total: 16 }
    const v39 = await consultar(39); expect(v39.j).toMatchObject({ liberado: false, necessario: 50, faltam: 34 })
    const v32 = await consultar(32); expect(v32.j).toMatchObject({ liberado: false, necessario: 100, faltam: 84 })
  })
  it('pela rota: com 50 CR a vistoria 39 é liberada, e a 32 ainda não', async () => {
    estado.saldo = { existe: true, isento: false, saldo_plano: 50, saldo_avulso: 0, saldo_total: 50 }
    expect((await consultar(39)).j.liberado).toBe(true)
    expect((await consultar(32)).j.liberado).toBe(false)
  })
})


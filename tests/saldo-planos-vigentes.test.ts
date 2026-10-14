// Saldo de plano = SOMA dos contratos VIGENTES (não só o mais recente). Caso real (14/10/2026): Cortesia com 66 CR e Serviço com 50 CR vigentes ao mesmo
// tempo; o saldo mostrava 50 e o laudo de 100 CR era recusado, embora o inspetor dispusesse de 116. A regra está no banco (sql/2026-10-14_saldo_soma_
// planos_vigentes.sql, testada em sql/testes/) e aqui nas telas do gestor, que precisam mostrar o mesmo número que a cobrança usa.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { saldoPlanoVigente } from '@/lib/contratos'

const HOJE = '2026-10-14'
const contrato = (fim: string | null, saldo: number | null) => ({ data_fim_contrato: fim, saldo_quantidade_plano: saldo })

describe('saldoPlanoVigente', () => {
  it('o caso do Celso: Cortesia (66) + Serviço (50) vigentes somam 116', () => {
    expect(saldoPlanoVigente([contrato('2026-10-24', 66), contrato('2026-12-13', 50)], HOJE)).toBe(116)
  })
  it('um contrato só: o saldo dele', () => {
    expect(saldoPlanoVigente([contrato('2026-12-13', 50)], HOJE)).toBe(50)
  })
  it('contrato VENCIDO não entra na soma', () => {
    expect(saldoPlanoVigente([contrato('2026-10-09', 66), contrato('2026-12-13', 50)], HOJE)).toBe(50)
  })
  it('o contrato que vence hoje ainda vale (a regra do banco é data_fim >= hoje)', () => {
    expect(saldoPlanoVigente([contrato(HOJE, 10), contrato('2026-10-13', 99)], HOJE)).toBe(10)
  })
  it('sem contratos, ou com saldo e data nulos, é zero', () => {
    expect(saldoPlanoVigente([], HOJE)).toBe(0)
    expect(saldoPlanoVigente([contrato('2026-12-13', null), contrato(null, 40)], HOJE)).toBe(0)
  })
})

describe('as telas do gestor mostram o mesmo saldo que a cobrança usa', () => {
  it('painel do gestor (saldo do inspetor) soma os contratos vigentes', () => {
    const codigo = readFileSync('src/app/gestor/page.tsx', 'utf-8')
    expect(codigo).toMatch(/saldoTotal = saldoPlanoVigente\(contratos,/)
    expect(codigo).not.toMatch(/saldoTotal = \(contratoAtivo\?\.saldo_quantidade_plano/)
  })
  it('resumo do gestor (créditos disponíveis) soma os contratos vigentes', () => {
    const codigo = readFileSync('src/app/api/gestor/resumo/route.ts', 'utf-8')
    expect(codigo).toMatch(/creditosDisponiveis \+= saldoPlanoVigente\(contratos, hoje\)/)
    expect(codigo).not.toMatch(/contratoVigentePorCpf\.get\(cpf\)\?\.saldo_quantidade_plano/)
  })
})

describe('a migração do banco', () => {
  const sql = readFileSync('sql/2026-10-14_saldo_soma_planos_vigentes.sql', 'utf-8')
  it('define as duas funções somando os contratos vigentes', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.saldo_creditos/)
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.consumir_creditos/)
    expect(sql.match(/SUM\(saldo_quantidade_plano\)/g)?.length).toBe(2)
  })
  it('debita primeiro o contrato que vence antes e atualiza pela chave primária (não pelo ctid)', () => {
    expect(sql).toMatch(/ORDER BY data_fim_contrato, data_inicio_contrato, tipo_assinatura/)
    expect(sql).toMatch(/AND tipo_assinatura = r_plano\.tipo_assinatura/)
    expect(sql).not.toMatch(/WHERE ctid = /)
  })
})

// Botão "Atribuir plano" do Painel do Gestor: a rota insere um contrato NOVO hoje (chave primária = cpf, tipo e data de início).
import { describe, it, expect, beforeEach } from 'vitest'
import { estado, reiniciar, req, status } from './helpers'
import * as rota from '@/app/api/gestor/atribuir-plano/route'

beforeEach(() => { reiniciar(); estado.gestor = true })

const atribuir = (tipo: string) => rota.POST(req('/api/gestor/atribuir-plano', 'POST', { cpf: '05491239704', tipo }))

describe('/api/gestor/atribuir-plano', () => {
  it('cria o contrato do plano com os créditos do plano e a data de hoje', async () => {
    const r = await atribuir('PLANO MENSAL')
    expect(r.status).toBe(200)
    expect((await r.json()).ok).toBe(true)
    expect(estado.inserts[0]).toMatchObject({ tipo_assinatura: 'PLANO MENSAL', saldo_quantidade_plano: 1200 })
    expect(estado.inserts[0].data_inicio_contrato).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('MESMO plano no mesmo dia: 409 com explicação clara, sem o texto técnico do banco', async () => {
    estado.insercaoContrato = 'duplicada'
    const r = await atribuir('PLANO SERVIÇO')
    const j = await r.json()
    expect(r.status).toBe(409)
    expect(j.erro).toMatch(/já tem um PLANO SERVIÇO iniciado hoje/)
    expect(j.erro).toMatch(/Escolha outro plano ou repita amanhã/)
    expect(j.erro).not.toMatch(/duplicate key|pk_contratos/)
  })
  it('outro erro do banco: continua 500 com a mensagem original (não é escondido)', async () => {
    estado.insercaoContrato = 'outro'
    const r = await atribuir('PLANO MENSAL')
    expect(r.status).toBe(500)
    expect((await r.json()).erro).toMatch(/permission denied/)
  })
  it('quem não é gestor continua barrado (403)', async () => {
    estado.gestor = false
    expect(await status(atribuir('PLANO MENSAL'))).toBe(403)
    expect(estado.inserts).toHaveLength(0)
  })
})

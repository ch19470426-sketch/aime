// Fase 0 do pedido do marketing (CPF fora da URL): as duas rotas que confiavam no CPF da URL sem sessão.
//  - tem-contrato devolvia contrato, bloqueio e motivo de QUALQUER CPF; agora exige login e usa o CPF da sessão.
//  - verificar-inspetor (chamada pela tela de login ANTES do login) era GET com o CPF na URL; agora é POST, com o CPF no corpo.
import { describe, it, expect, beforeEach } from 'vitest'
import { A, B, reiniciar, sessao, req, status, chamadas } from '../helpers'
import * as temContrato from '@/app/api/tem-contrato/route'
import * as verificar from '@/app/api/verificar-inspetor/route'

beforeEach(reiniciar)
const consultar = (query = '') => temContrato.GET(req(`/api/tem-contrato${query}`))
const tocouNoCpf = (cpf: string) => chamadas().some(c => c.p.includes(cpf) || c.q.includes(cpf))

describe('GET /api/tem-contrato', () => {
  it('sem login: 401 (antes respondia para qualquer CPF informado na URL)', async () => {
    sessao(null)
    expect(await status(consultar(`?cpf_inspetor=${A}`))).toBe(401)
    expect(chamadas().length).toBe(0)
  })
  it('logado: responde sobre a PRÓPRIA conta, sem precisar de parâmetro nenhum', async () => {
    const r = await consultar()
    expect(r.status).toBe(200)
    expect(typeof (await r.json()).temContrato).toBe('boolean')
    expect(tocouNoCpf(A)).toBe(true)
  })
  it('pedir o CPF de OUTRA pessoa na URL é inútil: o parâmetro é ignorado e a consulta é sempre sobre quem está logado', async () => {
    const r = await consultar(`?cpf_inspetor=${B}`)
    expect(r.status).toBe(200)
    expect(tocouNoCpf(B)).toBe(false)
    expect(tocouNoCpf(A)).toBe(true)
  })
})

describe('/api/verificar-inspetor (tela de login, antes do login)', () => {
  it('é POST com o CPF no corpo e funciona SEM login; a rota GET, que levava o CPF na URL, não existe mais', async () => {
    sessao(null)
    const r = await verificar.POST(req('/api/verificar-inspetor', 'POST', { cpf: A }))
    expect(r.status).toBe(200)
    expect(typeof (await r.json()).existe).toBe('boolean')
    expect((verificar as any).GET).toBeUndefined()
  })
})

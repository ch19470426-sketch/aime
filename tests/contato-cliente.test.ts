// Contato do cliente (responsável e finalidade da vistoria): gravado no Plano, lido pela vistoria e pelo laudo. Se não existe contato do TIPO pedido,
// a rota devolve o mais recente do mesmo inspetor e do mesmo CNPJ, de qualquer tipo.
import { describe, it, expect, beforeEach } from 'vitest'
import { A, B, estado, reiniciar, req, status } from './helpers'
import * as contato from '@/app/api/contato-cliente/route'

const CNPJ = '39262886000187'
const linha = (cpf: string, tipo: string, extra: Record<string, unknown> = {}) =>
  ({ cpf_inspetor: cpf, cnpjoucpf: CNPJ, tipo_servico: tipo, nome_responsavel: 'Fulano', finalidade_vistoria: 'Manutenção preventiva', data_cadastro: '2026-10-09T09:09:00Z', ...extra })
const buscar = async (tipo: string, cpf = A) => (await contato.GET(req(`/api/contato-cliente?cpf_inspetor=${cpf}&cnpjoucpf=${CNPJ}&tipo_servico=${encodeURIComponent(tipo)}`))).json()

beforeEach(reiniciar)

describe('contato-cliente GET', () => {
  it('existe contato do tipo pedido: devolve esse', async () => {
    estado.contatos = [linha(A, '37 Vistoria nr-12', { nome_responsavel: 'Do 37' }), linha(A, '32 Vistoria inspeção')]
    expect((await buscar('37 Vistoria nr-12')).data[0].nome_responsavel).toBe('Do 37')
  })
  it('SÓ existe contato do tipo 32 e a tela pede o 37: cai no contato do mesmo inspetor e CNPJ (finalidade e responsável aparecem)', async () => {
    estado.contatos = [linha(A, '32 Vistoria inspeção')]
    const j = await buscar('37 Vistoria nr-12')
    expect(j.data).toHaveLength(1)
    expect(j.data[0].finalidade_vistoria).toBe('Manutenção preventiva')
    expect(j.data[0].nome_responsavel).toBe('Fulano')
  })
  it('o contato de OUTRO inspetor no mesmo CNPJ não é usado: lista vazia (finalidade e responsável em branco)', async () => {
    estado.contatos = [linha(B, '32 Vistoria inspeção')]
    expect((await buscar('37 Vistoria nr-12')).data).toEqual([])
  })
  it('nenhum contato para o CNPJ: lista vazia', async () => {
    expect((await buscar('37 Vistoria nr-12')).data).toEqual([])
  })
  it('pedir o contato de OUTRO inspetor é barrado (403)', async () => {
    estado.contatos = [linha(B, '32 Vistoria inspeção')]
    expect(await status(contato.GET(req(`/api/contato-cliente?cpf_inspetor=${B}&cnpjoucpf=${CNPJ}&tipo_servico=37`)))).toBe(403)
  })
})

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

// O que a tela do Plano ("Salvar contato") envia: tela/plano/page.tsx, botão Salvar contato.
const doPlano = (extra: Record<string, unknown> = {}) => ({
  cpf_inspetor: A, cnpjoucpf: CNPJ, tipo_servico: '37 Vistoria nr-12',
  nome_responsavel: 'Maria Responsável', funcao_responsavel: 'Gerente', cpf_responsavel: '12345678909',
  whatsapp_responsavel: '27999990000', email_responsavel: 'maria@cliente.com', finalidade_vistoria: 'Manutenção preventiva', ...extra,
})
const gravar = (corpo: unknown) => contato.POST(req('/api/contato-cliente', 'POST', corpo))

describe('contato-cliente POST (botão "Salvar contato" do Plano)', () => {
  it('grava UMA linha com todos os campos, no CPF e no CNPJ certos e com o tipo de serviço da tela', async () => {
    const r = await gravar(doPlano())
    expect(r.status).toBe(200)
    expect((await r.json()).ok).toBe(true)
    expect(estado.contatosGravados).toEqual([{
      cpf_inspetor: A, cnpjoucpf: CNPJ, tipo_servico: '37 Vistoria nr-12', nome_responsavel: 'Maria Responsável', funcao_responsavel: 'Gerente',
      cpf_responsavel: '12345678909', whatsapp_responsavel: '27999990000', email_responsavel: 'maria@cliente.com', finalidade_vistoria: 'Manutenção preventiva',
    }])
  })
  it('campos opcionais vazios são gravados como nulos, e só o nome é obrigatório', async () => {
    const r = await gravar(doPlano({ funcao_responsavel: '', cpf_responsavel: '', whatsapp_responsavel: '', email_responsavel: '', finalidade_vistoria: '' }))
    expect(r.status).toBe(200)
    expect(estado.contatosGravados[0]).toMatchObject({ nome_responsavel: 'Maria Responsável', funcao_responsavel: null, cpf_responsavel: null, whatsapp_responsavel: null, email_responsavel: null, finalidade_vistoria: null })
  })
  it('sem o nome do responsável: 400 e NADA é gravado', async () => {
    expect(await status(gravar(doPlano({ nome_responsavel: '' })))).toBe(400)
    expect(estado.contatosGravados).toHaveLength(0)
  })
  it('em nome de OUTRO inspetor: 403 e nada é gravado', async () => {
    expect(await status(gravar(doPlano({ cpf_inspetor: B })))).toBe(403)
    expect(estado.contatosGravados).toHaveLength(0)
  })
  it('o banco recusa a gravação: a tela recebe 400 com o motivo (o aviso "Não foi possível salvar" mostra a mensagem)', async () => {
    estado.erroContato = 'new row violates check constraint'
    const r = await gravar(doPlano())
    expect(r.status).toBe(400)
    expect((await r.json()).erro).toMatch(/check constraint/)
  })
  it('SALVAR e depois LER: o contato gravado no Plano é o que a vistoria 37 e o laudo recebem', async () => {
    await gravar(doPlano())
    estado.contatos = estado.contatosGravados.map(l => ({ ...l, data_cadastro: '2026-10-14T10:00:00Z' }))   // o banco guarda a linha
    const j = await buscar('37 Vistoria nr-12')
    expect(j.data[0]).toMatchObject({ nome_responsavel: 'Maria Responsável', finalidade_vistoria: 'Manutenção preventiva' })
  })
})

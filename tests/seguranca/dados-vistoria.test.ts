// A tabela dados_vistoria deixou de ser acessada direto do navegador (alerta crítico rls_disabled_in_public do Supabase). A homologação agora grava e lê
// por /api/dados-vistoria, que confere de quem é o dado e só aceita as colunas conhecidas.
import { describe, it, expect, beforeEach } from 'vitest'
import { A, B, E, M, estado, reiniciar, sessao, req, status } from '../helpers'
import * as rota from '@/app/api/dados-vistoria/route'

beforeEach(reiniciar)
const linha = (cpf: string, extra: Record<string, unknown> = {}) => ({ cpf_inspetor: cpf, cnpjoucpf: '39262886000187', tipo_servico: '32 Vistoria inspeção', numero_foto: 7,
  sistema_vistoria: '03-Vedações', descricao_nao_conformidade: 'Fissura', ...extra })
const gravar = (corpo: unknown) => rota.POST(req('/api/dados-vistoria', 'POST', corpo))
const consultar = (cpf: string) => rota.GET(req(`/api/dados-vistoria?cpf_inspetor=${cpf}&cnpjoucpf=39262886000187`))

describe('POST /api/dados-vistoria (gravação da homologação)', () => {
  it('o próprio inspetor grava a linha, com atualização de quem já existe (merge-duplicates)', async () => {
    expect((await gravar(linha(A))).status).toBe(200)
    expect(estado.gravacoesDados).toHaveLength(1)
    expect(estado.gravacoesDados[0].corpo).toMatchObject({ cpf_inspetor: A, numero_foto: 7, descricao_nao_conformidade: 'Fissura' })
    expect(estado.gravacoesDados[0].prefer).toContain('merge-duplicates')
  })
  it('o profissional de apoio VINCULADO ao civil (vistoria 39) também grava; o NÃO vinculado é barrado', async () => {
    sessao(E); expect((await gravar(linha(A))).status).toBe(200)
    estado.gravacoesDados = []
    sessao(M); expect(await status(gravar(linha(A)))).toBe(403)
    expect(estado.gravacoesDados).toHaveLength(0)
  })
  it('linha de OUTRO inspetor é barrada (403) e nada é gravado', async () => {
    expect(await status(gravar(linha(B)))).toBe(403)
    expect(estado.gravacoesDados).toHaveLength(0)
  })
  it('sem sessão: 401', async () => {
    sessao(null)
    expect(await status(gravar(linha(A)))).toBe(401)
    expect(estado.gravacoesDados).toHaveLength(0)
  })
  it('só as colunas conhecidas são gravadas: id, data_homologacao (o banco preenche) e campos inventados são descartados', async () => {
    await gravar(linha(A, { id: 1, data_homologacao: '2030-01-01', is_admin: true, qualquer: 'x' }))
    const gravada = estado.gravacoesDados[0].corpo
    for (const proibida of ['id', 'data_homologacao', 'is_admin', 'qualquer']) expect(gravada).not.toHaveProperty(proibida)
    expect(gravada).toHaveProperty('descricao_nao_conformidade')
  })
  it('sem CPF, CNPJ ou número da foto: 400', async () => {
    expect(await status(gravar({ cnpjoucpf: '1', numero_foto: 1 }))).toBe(400)
    expect(await status(gravar({ cpf_inspetor: A, numero_foto: 1 }))).toBe(400)
    expect(await status(gravar({ cpf_inspetor: A, cnpjoucpf: '1' }))).toBe(400)
  })
})

describe('GET /api/dados-vistoria (a homologação mais recente)', () => {
  it('o próprio inspetor recebe a data da última homologação', async () => {
    estado.dadosVistoria = [{ data_homologacao: '2026-10-14' }]
    const j = await (await consultar(A)).json()
    expect(j.ultima).toEqual({ data_homologacao: '2026-10-14' })
  })
  it('sem nenhuma homologação, devolve nulo', async () => {
    expect((await (await consultar(A)).json()).ultima).toBeNull()
  })
  it('consultar o de OUTRO inspetor é barrado (403)', async () => {
    expect((await consultar(B)).status).toBe(403)
  })
})

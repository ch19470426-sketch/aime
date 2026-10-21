// O cadastro de ativo deixou de ser gravado direto do navegador (política de INSERT aberta em ativos_a_vistoriar, alerta do Supabase): agora só o servidor
// grava, e só o próprio inspetor.
import { describe, it, expect, beforeEach } from 'vitest'
import { A, B, estado, reiniciar, sessao, req, status } from '../helpers'
import * as rota from '@/app/api/salvar-ativo/route'

beforeEach(reiniciar)
const ativo = (cpf: string, extra: Record<string, unknown> = {}) => ({ cpf_inspetor: cpf, cnpjoucpf: '39262886000187', tipo_servico: '32 Vistoria inspeção', tipo_ativo: 'Edificação',
  tag_ativo_nr_serie: '1', numero_pavimentos: 4, ...extra })
const gravar = (corpo: unknown) => rota.POST(req('/api/salvar-ativo', 'POST', corpo))

describe('POST /api/salvar-ativo', () => {
  it('o próprio inspetor cadastra o ativo', async () => {
    expect((await gravar(ativo(A))).status).toBe(200)
    expect(estado.gravacoesAtivos).toHaveLength(1)
    expect(estado.gravacoesAtivos[0]).toMatchObject({ cpf_inspetor: A, tipo_ativo: 'Edificação', numero_pavimentos: 4 })
  })
  it('ativo em nome de OUTRO inspetor é barrado (403) e nada é gravado', async () => {
    expect(await status(gravar(ativo(B)))).toBe(403)
    expect(estado.gravacoesAtivos).toHaveLength(0)
  })
  it('sem sessão: 401', async () => {
    sessao(null)
    expect(await status(gravar(ativo(A)))).toBe(401)
    expect(estado.gravacoesAtivos).toHaveLength(0)
  })
  it('só as colunas conhecidas são gravadas: data_cadastro (o banco preenche), id e campos inventados são descartados', async () => {
    await gravar(ativo(A, { data_cadastro: '2030-01-01', id: 9, is_admin: true }))
    for (const proibida of ['data_cadastro', 'id', 'is_admin']) expect(estado.gravacoesAtivos[0]).not.toHaveProperty(proibida)
  })
  it('sem CPF, CNPJ, tipo de serviço ou tipo de ativo: 400', async () => {
    for (const faltando of ['cpf_inspetor', 'cnpjoucpf', 'tipo_servico', 'tipo_ativo']) {
      const corpo: Record<string, unknown> = ativo(A); delete corpo[faltando]
      expect(await status(gravar(corpo))).toBe(400)
    }
    expect(estado.gravacoesAtivos).toHaveLength(0)
  })
})

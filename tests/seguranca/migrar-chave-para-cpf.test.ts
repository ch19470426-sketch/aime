// Migração única da chave INS-nnn para o CPF: renomeia os arquivos (começam pela chave antiga) para começar pelo CPF.
import { describe, it, expect, beforeEach } from 'vitest'
import { A, B, estado, reiniciar, sessao, req, status, chamadas, quantas } from '../helpers'
import * as migrar from '@/app/api/gestor/migrar-chave-para-cpf/route'

beforeEach(() => {
  reiniciar()
  estado.gestor = true
  estado.legadas = [{ cpf_inspetor: A, chave_legada: 'INS-001' }]
  estado.arquivos = {
    vistorias: ['INS-001_123_33_1.json', 'INS-002_123_33_1.json', 'INS-0011_123_33_1.json'],
    vistorias_homologadas: ['INS-001_123_33_1.html'],
    documentos_inspetor: ['INS-001_123_proposta.html', 'INS-001_termo_de_aceite.html'],
    laudos_imagens: ['INS-001_123_logo.jpg'],
  }
})

const chamar = (corpo?: unknown) => migrar.POST(req('/api/gestor/migrar-chave-para-cpf', 'POST', corpo))
const moves = () => chamadas().filter(c => c.m === 'POST' && /storage\/v1\/object\/move/.test(c.p)).map(c => JSON.parse(c.b))

describe('migrar-chave-para-cpf', () => {
  it('só gestor: sem sessão 401, usuário comum 403, e nada é tocado', async () => {
    sessao(null)
    expect(await status(chamar())).toBe(401)
    sessao(A); estado.gestor = false
    expect(await status(chamar())).toBe(403)
    expect(moves()).toHaveLength(0)
  })
  it('SIMULAÇÃO (padrão): lista o que mudaria e não move nada', async () => {
    const r = await chamar()
    const j = await r.json()
    expect(j.modo).toBe('simulacao')
    expect(j.totais).toMatchObject({ cadastros: 1, encontrados: 5, movidos: 0 })
    expect(moves()).toHaveLength(0)
    expect(j.relatorio.every((x: any) => x.situacao === 'a_mover')).toBe(true)
  })
  it('EXECUTAR: move cada arquivo da chave antiga para o CPF, nas 4 pastas, sem tocar nos de outros', async () => {
    const j = await (await chamar({ executar: true })).json()
    expect(j.modo).toBe('executado')
    expect(j.totais).toMatchObject({ encontrados: 5, movidos: 5, ja_existiam: 0, erros: 0 })
    const destinos = moves().map(m => m.destinationKey).sort()
    expect(destinos).toEqual([
      `documentos_inspetor/${A}_123_proposta.html`,
      `documentos_inspetor/${A}_termo_de_aceite.html`,
      `laudos_imagens/${A}_123_logo.jpg`,
      `vistorias/${A}_123_33_1.json`,
      `vistorias_homologadas/${A}_123_33_1.html`,
    ])
    expect(moves().map(m => m.sourceKey)).not.toContain('vistorias/INS-002_123_33_1.json')   // outro inspetor
    expect(moves().map(m => m.sourceKey)).not.toContain('vistorias/INS-0011_123_33_1.json')  // prefixo parecido: INS-0011 não é INS-001
  })
  it('destino que já existe é contado como "já existia", não é erro, e rodar de novo não faz mal', async () => {
    estado.destinosExistentes = [`vistorias/${A}_123_33_1.json`]
    const j = await (await chamar({ executar: true })).json()
    expect(j.totais).toMatchObject({ movidos: 4, ja_existiam: 1, erros: 0 })
  })
  it('cadastro sem chave antiga não é tocado', async () => {
    estado.legadas = []
    const j = await (await chamar({ executar: true })).json()
    expect(j.totais).toMatchObject({ cadastros: 0, encontrados: 0, movidos: 0 })
    expect(moves()).toHaveLength(0)
  })
  it('vários cadastros: cada um com a sua chave antiga e o seu CPF', async () => {
    estado.legadas = [{ cpf_inspetor: A, chave_legada: 'INS-001' }, { cpf_inspetor: B, chave_legada: 'INS-002' }]
    const j = await (await chamar({ executar: true })).json()
    expect(j.totais.cadastros).toBe(2)
    expect(moves().map(m => m.destinationKey)).toContain(`vistorias/${B}_123_33_1.json`)
  })
  it('SQL de migração ainda não executado: erro 500 com a instrução, sem mover nada', async () => {
    estado.colunaLegadaAusente = true
    const r = await chamar({ executar: true })
    expect(r.status).toBe(500)
    expect((await r.json()).dica).toMatch(/chave_inspetor_igual_cpf\.sql/)
    expect(quantas(/storage\/v1\/object\/move/)).toBe(0)
  })
})

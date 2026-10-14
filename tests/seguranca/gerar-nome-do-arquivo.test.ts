// Auditoria de dono, fechamento: gerar-laudo e gerar-plano-manutencao GRAVAM o HTML (com upsert) com o nome de arquivo enviado pelo navegador.
// Antes só o CPF e a chave do corpo eram conferidos, e o nome não: dava para sobrescrever o documento de outro inspetor. Agora o nome tem de
// começar pela chave do usuário logado. O modo _info_ do plano de manutenção (só consulta, não grava) segue livre.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { A, reiniciar, ligarPorteiro, req, status, quantas, chamadas, livre } from '../helpers'
import * as laudo from '@/app/api/gerar-laudo/route'
import * as manut from '@/app/api/gerar-plano-manutencao/route'

beforeEach(() => { reiniciar(); vi.spyOn(console, 'error').mockImplementation(() => {}) })

const rotas = [['gerar-laudo', laudo, '43'], ['gerar-plano-manutencao', manut, '53']] as const
const corpo = (ts: string, nomeArquivo: string) => ({ cpfInspetor: A, chaveInspetor: 'INS-001', cnpjoucpf: '123', tipoServico: ts, estab: {}, inspetor: {}, ncs: [], nomeArquivo })
const debitos = () => chamadas().filter(c => /rpc\/consumir_creditos/.test(c.p))

describe.each(rotas)('%s: o nome do arquivo gravado é do usuário logado', (nome, rota, ts) => {
  const chamar = (nomeArquivo: string) => status(rota.POST(req(`/api/${nome}`, 'POST', corpo(ts, nomeArquivo))))

  it('nome do arquivo de OUTRO inspetor (CPF e chave próprios): 403, nada gravado e nada debitado', async () => {
    expect(await chamar('INS-002_123_documento.html')).toBe(403)
    expect(quantas(/storage/)).toBe(0)
    expect(debitos()).toHaveLength(0)
  })
  it('nome sem a chave de ninguém: 403, nada gravado', async () => {
    expect(await chamar('documento.html')).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('nome com pasta ou ..: 403, nada gravado', async () => {
    expect(await chamar('INS-001_/../templates/x.html')).toBe(403)
    expect(await chamar('INS-001_../x.html')).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('nome do PRÓPRIO inspetor: passa pelo porteiro (a rota segue o fluxo normal)', async () => {
    expect(livre(await chamar('INS-001_123_documento.html'))).toBe(true)
  })
  it('depois da migração, o nome que começa pelo CPF também vale', async () => {
    expect(livre(await chamar(`${A}_123_documento.html`))).toBe(true)
  })
  it('porteiro desligado: comportamento antigo (não confere o nome)', async () => {
    ligarPorteiro(false)
    expect(livre(await chamar('INS-002_123_documento.html'))).toBe(true)
  })
})

describe('gerar-plano-manutencao: o modo _info_ não grava e continua livre', () => {
  it('consulta _info_ com CPF próprio: responde e não grava nada', async () => {
    const r = await manut.POST(req('/api/gerar-plano-manutencao', 'POST', { cpfInspetor: A, chaveInspetor: 'INS-001', cnpjoucpf: '123', tipoServico: '53', nomeArquivo: '_info_', ncs: [] }))
    expect(livre(r.status)).toBe(true)
    expect(quantas(/storage/)).toBe(0)
  })
})

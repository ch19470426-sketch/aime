// O laudo (41 a 48) só é gerado se o Plano de Trabalho do mesmo tipo existir (decisão de Celso, 25/11/2026).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { A, estado, reiniciar, req, status, quantas } from './helpers'
import { nomeDoPlanoDoLaudo, mensagemSemPlano } from '@/lib/planoDoLaudo'
import * as laudo from '@/app/api/gerar-laudo/route'

beforeEach(() => { reiniciar(); vi.spyOn(console, 'error').mockImplementation(() => {}) })

const corpo = (tipoServico: string) =>
  ({ cpfInspetor: A, chaveInspetor: 'INS-001', cnpjoucpf: '123', tipoServico, razaoSocial: 'X', ativos: [], datas: {}, docs: [], ncs: [], nomeArquivo: 'INS-001_123_x.html', complemento: {} })
const gerar = (tipo: string) => laudo.POST(req('/api/gerar-laudo', 'POST', corpo(tipo)))

describe('nome do plano exigido', () => {
  it('cada laudo de 41 a 48 tem o seu plano; outros tipos não exigem', () => {
    expect(nomeDoPlanoDoLaudo('INS-001', '12.345.678/0001-90', '42')).toBe('INS-001_12345678000190_plano_inspecao.html')
    expect(['41', '43', '44', '45', '46', '47', '48'].map(t => nomeDoPlanoDoLaudo('K', '1', t))).toEqual([
      'K_1_plano_autovistoria.html', 'K_1_plano_imovel_novo.html', 'K_1_plano_fachada.html', 'K_1_plano_elevador.html', 'K_1_plano_nr10.html', 'K_1_plano_nr12.html', 'K_1_plano_nr13.html'])
    expect(nomeDoPlanoDoLaudo('K', '1', '49')).toBeNull()
    expect(nomeDoPlanoDoLaudo('', '1', '41')).toBeNull()
    expect(mensagemSemPlano('42')).toMatch(/Plano de Trabalho de Inspeção Predial/)
  })
})

describe('gerar-laudo exige o plano de trabalho', () => {
  it('sem o plano do mesmo tipo: 409 com a mensagem, e nenhum crédito é debitado', async () => {
    estado.arquivos['documentos_inspetor'] = ['INS-001_123_plano_autovistoria.html']   // existe o de OUTRO tipo (41), não o do 42
    const r = await gerar('42')
    expect(r.status).toBe(409)
    expect(await r.json()).toMatchObject({ semPlano: true, erro: expect.stringMatching(/Plano de Trabalho de Inspeção Predial/) })
    expect(quantas(/rpc\/consumir_creditos/)).toBe(0)
  })
  it('com o plano do mesmo tipo: a trava não barra (segue para a geração)', async () => {
    estado.arquivos['documentos_inspetor'] = ['INS-001_123_plano_inspecao.html']
    expect(await status(gerar('42'))).not.toBe(409)
  })
})

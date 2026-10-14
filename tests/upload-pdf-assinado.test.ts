// PDF ASSINADO do inspetor (laudo e plano de manutenção): o nome é montado pelo sistema, começa pela chave do inspetor, e a rota só deixa
// gravar (com upsert) arquivo do próprio usuário. Antes, o PDF do laudo era gravado com o nome do arquivo escolhido no aparelho, que depois da
// remoção do CPF do nome dos downloads já não começava pela chave: não aparecia em Baixar documentos e podia sobrescrever o de outro inspetor.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { A, B, reiniciar, sessao, req, status, quantas } from './helpers'
import { nomePdfAssinado, nomeSemChave } from '@/lib/nomeArquivo'
import * as upload from '@/app/api/upload-pdf-assinado/route'

beforeEach(reiniciar)
const enviar = (corpo: unknown) => upload.POST(req('/api/upload-pdf-assinado', 'POST', corpo))

describe('nomePdfAssinado', () => {
  it('troca .html por _assinado.pdf e mantém a chave na frente', () => {
    expect(nomePdfAssinado(`${A}_39262886000187_laudo.html`, A, '39262886000187')).toBe(`${A}_39262886000187_laudo_assinado.pdf`)
  })
  it('sem o nome do documento, monta com chave, CNPJ e tipo', () => {
    expect(nomePdfAssinado('', A, '123')).toBe(`${A}_123_laudo_assinado.pdf`)
    expect(nomePdfAssinado(null, A, '123', 'plano')).toBe(`${A}_123_plano_assinado.pdf`)
  })
  it('o PDF assinado, depois de baixado sem a chave, volta ao sistema com a chave (o ciclo completo)', () => {
    const noSistema = nomePdfAssinado(`${A}_123_laudo.html`, A, '123')
    expect(nomeSemChave(noSistema)).toBe('123_laudo_assinado.pdf')       // o que o usuário recebe
    expect(noSistema.startsWith(`${A}_`)).toBe(true)                      // o que o sistema grava
  })
})

describe('upload-pdf-assinado (URL de envio com upsert)', () => {
  it('nome do PRÓPRIO inspetor: devolve a URL assinada de envio', async () => {
    const r = await enviar({ nomeArquivo: `${A}_123_laudo_assinado.pdf` })
    expect(r.status).toBe(200)
    expect((await r.json()).token).toBe('t')
    expect(quantas(/storage\/v1\/object\/upload\/sign/)).toBe(1)
  })
  it('nome de OUTRO inspetor: 403 e nenhuma URL de envio é criada (não sobrescreve o PDF dele)', async () => {
    expect(await status(enviar({ nomeArquivo: `${B}_123_laudo_assinado.pdf` }))).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('nome escolhido no aparelho, sem a chave: 403 (era o que fazia o PDF do laudo sumir da lista)', async () => {
    expect(await status(enviar({ nomeArquivo: '123_laudo_assinado.pdf' }))).toBe(403)
    expect(await status(enviar({ nomeArquivo: 'Laudo final gov.br.pdf' }))).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('pasta no nome é descartada e o que sobra segue a regra do dono', async () => {
    expect(await status(enviar({ nomeArquivo: `../${B}_123_x.pdf` }))).toBe(403)
    expect(await status(enviar({ nomeArquivo: `pasta/${A}_123_x.pdf` }))).toBe(200)
    expect(quantas(/storage\/v1\/object\/upload\/sign/)).toBe(1)
  })
  it('formato antigo (base64): também só para arquivo do próprio usuário', async () => {
    expect(await status(enviar({ nomeArquivo: `${B}_123_x.pdf`, base64: 'JVBERi0=' }))).toBe(403)
    expect(quantas(/storage/)).toBe(0)
    expect(await status(enviar({ nomeArquivo: `${A}_123_x.pdf`, base64: 'JVBERi0=' }))).toBe(200)
  })
  it('sem sessão: 401', async () => {
    sessao(null)
    expect(await status(enviar({ nomeArquivo: `${A}_123_x.pdf` }))).toBe(401)
  })
})

describe('as telas que enviam PDF assinado usam o nome do sistema', () => {
  it('homologar-produto (laudo) não usa mais o nome do arquivo escolhido no aparelho', () => {
    const codigo = readFileSync('src/app/homologar-produto/page.tsx', 'utf-8')
    expect(codigo).toMatch(/nomePdf = nomePdfAssinado\(/)
    expect(codigo).not.toMatch(/nomePdf = arquivo\.name/)
  })
  it('plano-manutencao monta o nome a partir do documento (já era assim)', () => {
    expect(readFileSync('src/app/plano-manutencao/inner.tsx', 'utf-8')).toMatch(/nomePdf = nomeArq\.replace\('\.html', '_assinado\.pdf'\)/)
  })
})

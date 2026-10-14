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
  it('troca .html por _assinado.pdf e mantém a chave na frente, para cada documento', () => {
    for (const doc of ['proposta_nr12', 'plano_nr12', 'laudo_nr12', 'plano_manut_nr12']) {
      expect(nomePdfAssinado(`${A}_39262886000187_${doc}.html`)).toBe(`${A}_39262886000187_${doc}_assinado.pdf`)
    }
  })
  it('SEM o nome do documento NÃO inventa nome (o nome padrão laudo gravou o PDF do plano de manutenção por cima do laudo)', () => {
    expect(nomePdfAssinado('')).toBeNull()
    expect(nomePdfAssinado(null)).toBeNull()
    expect(nomePdfAssinado('   ')).toBeNull()
  })
  it('o PDF assinado, depois de baixado sem a chave, volta ao sistema com a chave (o ciclo completo)', () => {
    const noSistema = nomePdfAssinado(`${A}_123_laudo.html`)!
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
    expect(codigo).toMatch(/nomePdf = nomePdfAssinado\(nomeArquivo\)/)
    expect(codigo).toMatch(/if \(!nomePdf\) throw/)                       // sem o documento, recusa em vez de adivinhar
    expect(codigo).not.toMatch(/nomePdf = arquivo\.name/)
  })
  it('plano-manutencao monta o nome a partir do documento (já era assim)', () => {
    expect(readFileSync('src/app/plano-manutencao/inner.tsx', 'utf-8')).toMatch(/nomePdf = nomeArq\.replace\('\.html', '_assinado\.pdf'\)/)
  })
})

describe('todas as telas abrem Homologar produto com um nome de documento que ela entende', () => {
  const telas = ['src/app/proposta/page.tsx', 'src/app/plano/page.tsx', 'src/app/laudo/page.tsx', 'src/app/plano-manutencao/inner.tsx']
  it.each(telas)('%s passa o documento por nome_arquivo ou nome', (arquivo) => {
    const linhas = readFileSync(arquivo, 'utf-8').split('\n')
    const links = linhas.map((l, i) => (l.includes('/homologar-produto?') ? i : -1)).filter(i => i >= 0)
    expect(links.length).toBeGreaterThan(0)
    for (const i of links) {
      const trecho = linhas.slice(i, i + 4).join(' ')
      expect(trecho).toMatch(/[&?](nome_arquivo|nome)=/)
    }
  })
  it('Homologar produto lê os dois parâmetros (o plano de manutenção usa nome)', () => {
    expect(readFileSync('src/app/homologar-produto/page.tsx', 'utf-8')).toMatch(/params\.get\('nome_arquivo'\)\s*\?\?\s*params\.get\('nome'\)/)
  })
})

describe('depois de enviar o PDF assinado, o OK volta ao menu em todas as telas de documento', () => {
  it.each([
    ['src/app/plano-manutencao/inner.tsx', /agradece\('PDF assinado salvo'[^\n]*window\.location\.href = retorno/],
    ['src/app/homologar-produto/page.tsx', /agradece\('Homologação concluída',[\s\S]{0,160}window\.location\.href = retorno/],
  ])('%s', (arquivo, regra) => {
    expect(readFileSync(arquivo, 'utf-8')).toMatch(regra)
  })
})

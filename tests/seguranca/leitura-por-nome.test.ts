// Leituras de arquivo por NOME ou CAMINHO vindos do navegador (achadas depois da auditoria, porque o levantamento procurava CPF e chave):
// vistorias/[nome], os dois PDFs de laudo, gerar-laudo (croqui, foto, ART) e gerar-laudo-docx (não conformidades e imagens).
// Antes, quem soubesse o nome de um arquivo de outro inspetor o lia, e o laudo ainda criava um link assinado de 30 dias para qualquer caminho.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { A, B, reiniciar, sessao, req, status, quantas, dados, livre, chamadas } from '../helpers'
import { nomeSemChave } from '@/lib/nomeArquivo'
import * as vistoriaPorNome from '@/app/api/vistorias/[nome]/route'
import * as pdfLaudo from '@/app/api/gerar-laudo-pdf/route'
import * as pdfIndice from '@/app/api/gerar-laudo-pdf-indice-real/route'
import * as laudo from '@/app/api/gerar-laudo/route'
import * as docx from '@/app/api/gerar-laudo-docx/route'

beforeEach(() => { reiniciar(); vi.spyOn(console, 'error').mockImplementation(() => {}) })

const lerVistoria = (nome: string) => status(vistoriaPorNome.GET(req('/api/vistorias/x'), { params: Promise.resolve({ nome }) }))

describe('vistorias/[nome]', () => {
  it('lê a vistoria PRÓPRIA', async () => {
    expect(livre(await lerVistoria('INS-001_123_33_1.json'))).toBe(true)
    expect(await lerVistoria(`${A}_123_33_1.json`)).toBe(200)
  })
  it('vistoria de OUTRO: 403, sem tocar no armazenamento', async () => {
    expect(await lerVistoria('INS-002_123_33_1.json')).toBe(403)
    expect(await lerVistoria(`${B}_123_33_1.json`)).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('nome com ".." ou subpasta: 403; sem sessão: 401', async () => {
    expect(await lerVistoria('INS-001_../x.json')).toBe(403)
    sessao(null)
    expect(await lerVistoria('INS-001_123_33_1.json')).toBe(401)
  })
})

describe.each([['gerar-laudo-pdf', pdfLaudo], ['gerar-laudo-pdf-indice-real', pdfIndice]] as const)('%s', (nome, rota) => {
  it('arquivo de OUTRO em documentos_inspetor: 403, sem ler o armazenamento', async () => {
    expect(await status(rota.POST(req(`/api/${nome}`, 'POST', { nomeArquivo: 'INS-002_123_laudo.html' })))).toBe(403)
    expect(await status(rota.POST(req(`/api/${nome}`, 'POST', { nomeArquivo: `${B}_123_laudo.html` })))).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('sem sessão: 401', async () => {
    sessao(null)
    expect(await status(rota.POST(req(`/api/${nome}`, 'POST', { nomeArquivo: 'INS-001_123_laudo.html' })))).toBe(401)
  })
})

describe('gerar-laudo: imagens e ART do pedido', () => {
  const corpo = (complemento: Record<string, string>) =>
    ({ cpfInspetor: A, chaveInspetor: 'INS-001', cnpjoucpf: '123', tipoServico: '43', razaoSocial: 'X', ativos: [], datas: {}, docs: [], ncs: [], nomeArquivo: 'INS-001_123_x.html', complemento })
  const gerar = (complemento: Record<string, string>) => status(laudo.POST(req('/api/gerar-laudo', 'POST', corpo(complemento))))

  it('imagens PRÓPRIAS em laudos_imagens passam pelo porteiro', async () => {
    expect(livre(await gerar({ pathFoto: 'laudos_imagens/INS-001_123_foto.jpg', pathCroqui: `laudos_imagens/${A}_123_croqui.png` }))).toBe(true)
  })
  it('caminho de OUTRO inspetor: 403, nada é baixado e nenhum crédito é debitado', async () => {
    expect(await gerar({ pathFoto: 'laudos_imagens/INS-002_123_foto.jpg' })).toBe(403)
    expect(quantas(/storage/)).toBe(0)
    expect(quantas(/rpc\/consumir_creditos/)).toBe(0)
  })
  it('a ART de outro (que ganharia link assinado de 30 dias) também é barrada', async () => {
    expect(await gerar({ pathArt: 'laudos_imagens/INS-002_123_art.pdf' })).toBe(403)
    expect(await gerar({ pathArtEletrico: 'laudos_imagens/INS-002_123_art_eletrico.pdf' })).toBe(403)
    expect(await gerar({ pathArtMecanico: 'laudos_imagens/INS-002_123_art_mecanico.pdf' })).toBe(403)
    expect(quantas(/createSignedUrl|object\/sign/)).toBe(0)
  })
  it('pasta fora de laudos_imagens (documentos_inspetor, templates) ou com ".." dá 403', async () => {
    expect(await gerar({ pathFoto: 'documentos_inspetor/INS-001_123_plano.html' })).toBe(403)
    expect(await gerar({ pathFoto: 'templates/41_laudo.docx' })).toBe(403)
    expect(await gerar({ pathFoto: 'laudos_imagens/../INS-001_x.jpg' })).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
})

describe('gerar-laudo-docx: não conformidades e imagens do pedido', () => {
  const corpo = (ncs: unknown[], complemento: Record<string, string> = {}) =>
    ({ cpfInspetor: A, chaveInspetor: 'INS-001', cnpjoucpf: '123', tipoServico: '43', razaoSocial: 'X', ativos: [], datas: {}, docs: [], ncs, complemento })
  const gerar = (ncs: unknown[], complemento?: Record<string, string>) => status(docx.POST(req('/api/gerar-laudo-docx', 'POST', corpo(ncs, complemento))))

  it('arquivo de vistoria homologada de OUTRO em uma não conformidade: 403, sem baixar nada', async () => {
    expect(await gerar([{ prioridade: 'Alta', _arquivo: 'INS-001_123_33_1.html' }, { prioridade: 'Alta', _arquivo: 'INS-002_123_33_1.html' }])).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('arquivos PRÓPRIOS passam pelo porteiro', async () => {
    expect(livre(await gerar([{ prioridade: 'Alta', _arquivo: `${A}_123_33_1.html` }, { prioridade: 'Baixa', _arquivo: 'INS-001_123_33_2.html' }]))).toBe(true)
  })
  it('croqui ou fachada de OUTRO: 403', async () => {
    expect(await gerar([], { pathFoto: 'laudos_imagens/INS-002_123_foto.jpg' })).toBe(403)
    expect(await gerar([], { pathCroqui: 'laudos_imagens/INS-002_123_croqui.png' })).toBe(403)
    expect(quantas(/storage/)).toBe(0)
  })
  it('centenas de não conformidades não multiplicam as consultas da chave do usuário', async () => {
    const poucas = Array.from({ length: 2 }, (_, i) => ({ prioridade: 'Alta', _arquivo: `INS-001_123_33_${i}.html` }))
    await gerar(poucas)
    const consultasPoucas = quantas(/rest\/v1\/inspetor/)
    chamadas().length = 0
    const muitas = Array.from({ length: 300 }, (_, i) => ({ prioridade: 'Alta', _arquivo: `INS-001_123_33_${i}.html` }))
    await gerar(muitas)
    expect(quantas(/rest\/v1\/inspetor/)).toBe(consultasPoucas)
  })
})

describe('nome do arquivo entregue ao usuário não leva a chave (o CPF)', () => {
  it('nomeSemChave tira só o primeiro trecho', () => {
    expect(nomeSemChave('05491239704_12345678000190_proposta.html')).toBe('12345678000190_proposta.html')
    expect(nomeSemChave('05491239704_termo_de_aceite.html')).toBe('termo_de_aceite.html')
    expect(nomeSemChave('INS-001_123_laudo.pdf')).toBe('123_laudo.pdf')
    expect(nomeSemChave('semsublinhado.html')).toBe('semsublinhado.html')
  })
  it.each([
    'src/app/baixar-documentos/page.tsx',
    'src/app/plano-manutencao/inner.tsx',
    'src/app/homologar-produto/page.tsx',
    'src/app/api/gerar-laudo-pdf/route.ts',
    'src/app/api/gerar-laudo-pdf-indice-real/route.ts',
    'src/app/api/gerar-plano-manutencao-pdf/route.ts',
  ])('%s usa nomeSemChave e não entrega o nome bruto do armazenamento', (arquivo) => {
    const codigo = readFileSync(arquivo, 'utf-8')
    expect(codigo).toContain("from '@/lib/nomeArquivo'")
    expect(codigo).toMatch(/nomeSemChave\((doc\.nome|nomeArq|nomeArquivo)\)/)
    expect(codigo).not.toMatch(/a\.download = doc\.nome\b/)                    // download da lista de documentos
    expect(codigo).not.toMatch(/nomeBase = nomeArq(uivo)?\.replace/)             // PDFs gerados pelas telas
    expect(codigo).not.toMatch(/filename="\$\{nomeArquivo\.replace/)             // cabeçalho dos PDFs gerados pelo servidor
  })
})

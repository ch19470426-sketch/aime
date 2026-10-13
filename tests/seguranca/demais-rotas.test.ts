// Auditoria de dono, etapa 3 (rotas que GRAVAM, LEEM e ENVIAM arquivos): só o dono mexe nos próprios dados.
import { describe, it, expect, beforeEach } from 'vitest'
import { A, B, E, reiniciar, sessao, ligarPorteiro, req, status, quantas, dados, livre, chamadas } from '../helpers'
import * as solnc from '@/app/api/atualizar-solucao-nc/route'
import * as contato from '@/app/api/contato-cliente/route'
import * as troca from '@/app/api/solicitar-troca-plano/route'
import * as meus from '@/app/api/meus-estabelecimentos/route'
import * as arts from '@/app/api/arts-eletrico/route'
import * as selel from '@/app/api/selecao-eletrico/route'
import * as foto from '@/app/api/foto-nr/route'
import * as listdoc from '@/app/api/listar-documentos/route'
import * as listvis from '@/app/api/listar-vistorias/route'
import * as buscasol from '@/app/api/buscar-solucao-nc/route'
import * as lerdoc from '@/app/api/ler-documento/route'
import * as verhtml from '@/app/api/ver-html/route'
import * as upurl from '@/app/api/upload-url/route'
import * as upimg from '@/app/api/upload-imagem-laudo/route'

beforeEach(reiniciar)

/** Cada rota: o PRÓPRIO passa pelo porteiro; o de OUTRO dá 403 e NENHUM dado é lido ou gravado. */
type Caso = [string, () => Promise<Response>, () => Promise<Response>]
const casos: Caso[] = [
  ['atualizar-solucao-nc', () => solnc.POST(req('/api/atualizar-solucao-nc', 'POST', { cpf_inspetor: A, cnpjoucpf: '1', tipo_servico: '33', foto_nr: 1, descricao_solucao_nc: 'x' })), () => solnc.POST(req('/api/atualizar-solucao-nc', 'POST', { cpf_inspetor: B, cnpjoucpf: '1', tipo_servico: '33', foto_nr: 1, descricao_solucao_nc: 'x' }))],
  ['contato-cliente POST', () => contato.POST(req('/api/contato-cliente', 'POST', { cpf_inspetor: A, cnpjoucpf: '1', tipo_servico: '33', nome_responsavel: 'N' })), () => contato.POST(req('/api/contato-cliente', 'POST', { cpf_inspetor: B, cnpjoucpf: '1', tipo_servico: '33', nome_responsavel: 'N' }))],
  ['contato-cliente GET', () => contato.GET(req(`/api/contato-cliente?cpf_inspetor=${A}&cnpjoucpf=1&tipo_servico=33`)), () => contato.GET(req(`/api/contato-cliente?cpf_inspetor=${B}&cnpjoucpf=1&tipo_servico=33`))],
  ['meus-estabelecimentos', () => meus.GET(req(`/api/meus-estabelecimentos?cpf=${A}`)), () => meus.GET(req(`/api/meus-estabelecimentos?cpf=${B}`))],
  ['buscar-solucao-nc', () => buscasol.GET(req(`/api/buscar-solucao-nc?cpf_inspetor=${A}&cnpjoucpf=1&tipo_servico=33&foto_nr=1`)), () => buscasol.GET(req(`/api/buscar-solucao-nc?cpf_inspetor=${B}&cnpjoucpf=1&tipo_servico=33&foto_nr=1`))],
  ['listar-documentos (links assinados)', () => listdoc.GET(req('/api/listar-documentos?chave_inspetor=INS-001&cnpjoucpf=123')), () => listdoc.GET(req('/api/listar-documentos?chave_inspetor=INS-002&cnpjoucpf=123'))],
  ['listar-vistorias', () => listvis.GET(req('/api/listar-vistorias?chave_inspetor=INS-001&cnpjoucpf=123&tipo_servico=43')), () => listvis.GET(req('/api/listar-vistorias?chave_inspetor=INS-002&cnpjoucpf=123&tipo_servico=43'))],
  ['ler-documento', () => lerdoc.GET(req('/api/ler-documento?nome=INS-001_123_proposta.html&pasta=documentos_inspetor')), () => lerdoc.GET(req('/api/ler-documento?nome=INS-002_123_proposta.html&pasta=documentos_inspetor'))],
  ['ver-html', () => verhtml.GET(req('/api/ver-html?nome=INS-001_123_laudo.html&pasta=vistorias_homologadas')), () => verhtml.GET(req('/api/ver-html?nome=INS-002_123_laudo.html&pasta=vistorias_homologadas'))],
]

describe('o próprio passa e o de outro é barrado', () => {
  it.each(casos)('%s', async (_nome, proprio, outro) => {
    expect(livre(await status(proprio()))).toBe(true)
    chamadas().length = 0
    expect(await status(outro())).toBe(403)
    expect(dados()).toBe(0)
  })
  it('solicitar-troca-plano em nome de OUTRO: 403 e NENHUM e-mail é enviado ao gestor', async () => {
    expect(await status(troca.POST(req('/api/solicitar-troca-plano', 'POST', { cpf: B, nome: 'Outro', planoDesejado: 'X' })))).toBe(403)
    expect(chamadas().filter(c => c.host.includes('resend'))).toHaveLength(0)
  })
})

describe('arquivos por nome: pasta e dono', () => {
  it('ler-documento: pasta fora de documentos_inspetor (templates) dá 400, sem ler', async () => {
    expect(await status(lerdoc.GET(req('/api/ler-documento?nome=INS-001_x.html&pasta=templates')))).toBe(400)
    expect(dados()).toBe(0)
  })
  it('ler-documento: termo de aceite pelo nome antigo (chave_cpf_termo...) do dono passa', async () => {
    expect(livre(await status(lerdoc.GET(req(`/api/ler-documento?nome=INS-001_${A}_termo_de_aceite.html&pasta=documentos_inspetor`))))).toBe(true)
  })
})

describe('upload assinado e imagem do laudo', () => {
  const up = (path: string) => status(upurl.POST(req('/api/upload-url', 'POST', { path })))
  it('caminho PRÓPRIO (laudos_imagens/INS-001_...) passa', async () => {
    expect(livre(await up('laudos_imagens/INS-001_123_logo.jpg'))).toBe(true)
  })
  it('sobrescrever imagem de OUTRO (INS-002_...): 403, sem URL assinada', async () => {
    expect(await up('laudos_imagens/INS-002_123_logo.jpg')).toBe(403)
    expect(dados()).toBe(0)
  })
  it('caminho fora da pasta (documentos_inspetor/..., templates/...): 400, sem URL assinada', async () => {
    expect(await up('documentos_inspetor/INS-001_123_plano.html')).toBe(400)
    expect(await up('templates/41_laudo.docx')).toBe(400)
    expect(dados()).toBe(0)
  })
  it('com ".." ou subpasta: 403', async () => {
    expect(await up('laudos_imagens/../INS-001_x.jpg')).toBe(403)
    expect(await up('laudos_imagens/a/INS-001_x.jpg')).toBe(403)
    expect(dados()).toBe(0)
  })
  const img = (nome: string) => status(upimg.POST(req('/api/upload-imagem-laudo', 'POST', { base64: 'data:image/png;base64,AAAA', nomeArquivo: nome })))
  it('upload-imagem-laudo: nome PRÓPRIO passa; nome de OUTRO dá 403 sem gravar', async () => {
    expect(livre(await img('INS-001_123_a.png'))).toBe(true)
    chamadas().length = 0
    expect(await img('INS-002_123_a.png')).toBe(403)
    expect(dados()).toBe(0)
  })
})

describe('fluxo elétrico: foto-nr com o CPF do civil, vínculo de mão única', () => {
  beforeEach(() => sessao(E))
  const numerar = (cpf: string) => status(foto.GET(req(`/api/foto-nr?cpf_inspetor=${cpf}&cnpjoucpf=123&tipo_servico=32`)))
  it('eletricista VINCULADO ao civil A numera foto com o CPF de A (GET e POST)', async () => {
    expect(livre(await numerar(A))).toBe(true)
    expect(livre(await status(foto.POST(req('/api/foto-nr', 'POST', { cpf_inspetor: A, cnpjoucpf: '123', tipo_servico: '32' }))))).toBe(true)
  })
  it('o mesmo eletricista NÃO numera foto com o CPF de B (sem vínculo): 403', async () => {
    expect(await numerar(B)).toBe(403)
    expect(await status(foto.POST(req('/api/foto-nr', 'POST', { cpf_inspetor: B, cnpjoucpf: '123', tipo_servico: '32' })))).toBe(403)
    expect(dados()).toBe(0)
  })
  it('o civil A NÃO numera foto no CPF do eletricista (o vínculo é de mão única)', async () => {
    sessao(A)
    expect(await numerar(E)).toBe(403)
  })
  it('selecao-eletrico e arts-eletrico: o eletricista lê os PRÓPRIOS vínculos; os de outro dão 403', async () => {
    expect(livre(await status(selel.GET(req(`/api/selecao-eletrico?cpf_eletrico=${E}`))))).toBe(true)
    expect(await status(selel.GET(req(`/api/selecao-eletrico?cpf_eletrico=${A}`)))).toBe(403)
    expect(livre(await status(arts.GET(req(`/api/arts-eletrico?cpf_eletrico=${E}`))))).toBe(true)
    expect(await status(arts.GET(req(`/api/arts-eletrico?cpf_eletrico=${A}`)))).toBe(403)
  })
})

describe('sem sessão e porteiro desligado', () => {
  it('sem sessão: 401 em meus-estabelecimentos e upload-url', async () => {
    sessao(null)
    expect(await status(meus.GET(req(`/api/meus-estabelecimentos?cpf=${A}`)))).toBe(401)
    expect(await status(upurl.POST(req('/api/upload-url', 'POST', { path: 'laudos_imagens/INS-001_x.jpg' })))).toBe(401)
  })
  it('desligado: comportamento antigo (meus-estabelecimentos de B passa), mas upload-url fora da pasta continua 400', async () => {
    ligarPorteiro(false)
    expect(livre(await status(meus.GET(req(`/api/meus-estabelecimentos?cpf=${B}`))))).toBe(true)
    expect(await status(upurl.POST(req('/api/upload-url', 'POST', { path: 'templates/x.docx' })))).toBe(400)
  })
})

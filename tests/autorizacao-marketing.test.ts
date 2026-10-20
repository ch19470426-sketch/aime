// Autorização do inspetor para o uso dos dados em publicidade e promoções: opcional, começa desmarcada (opt-in), registra data e versão do texto, e
// pode ser retirada a qualquer momento em Meu Cadastro (item 6.2), por rota própria, só pelo próprio inspetor.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { A, B, estado, reiniciar, sessao, req, status } from './helpers'
import { camposDaAutorizacao, TEXTO_AUTORIZACAO_MARKETING, VERSAO_AUTORIZACAO_MARKETING } from '@/lib/autorizacaoMarketing'
import * as rota from '@/app/api/autorizacao-marketing/route'
import * as salvar from '@/app/api/salvar-inspetor/route'

beforeEach(reiniciar)

describe('a regra', () => {
  it('autorizar registra verdadeiro, o instante e a versão do texto', () => {
    const c = camposDaAutorizacao(true, new Date('2026-10-16T15:30:00Z'))
    expect(c).toEqual({ autoriza_marketing: true, autoriza_marketing_em: '2026-10-16T15:30:00.000Z', autoriza_marketing_versao: VERSAO_AUTORIZACAO_MARKETING })
  })
  it('retirar registra falso e o instante, e a versão some', () => {
    const c = camposDaAutorizacao(false, new Date('2026-10-17T09:00:00Z'))
    expect(c).toEqual({ autoriza_marketing: false, autoriza_marketing_em: '2026-10-17T09:00:00.000Z', autoriza_marketing_versao: null })
  })
  it('o texto diz o que é autorizado, que é opcional e onde retirar (Meu Cadastro, item 6.2)', () => {
    for (const trecho of ['nome, e-mail e WhatsApp', 'publicidade', 'promoções', 'opcional', 'retirada a qualquer momento', 'Meu Cadastro (item 6.2)']) expect(TEXTO_AUTORIZACAO_MARKETING).toContain(trecho)
  })
})

describe('POST /api/autorizacao-marketing (dar ou retirar, em Meu Cadastro)', () => {
  const enviar = (corpo: unknown) => rota.POST(req('/api/autorizacao-marketing', 'POST', corpo))
  const patches = () => estado.gravacoesInspetor.filter(g => g.metodo === 'PATCH')

  it('o próprio inspetor autoriza: grava verdadeiro, data e versão, só no cadastro dele', async () => {
    const r = await enviar({ cpf: A, autoriza: true })
    expect(r.status).toBe(200)
    const j = await r.json(); expect(j.ok).toBe(true); expect(j.autoriza).toBe(true)
    expect(patches()).toHaveLength(1)
    expect(patches()[0].corpo).toMatchObject({ autoriza_marketing: true, autoriza_marketing_versao: VERSAO_AUTORIZACAO_MARKETING })
    expect(patches()[0].corpo.autoriza_marketing_em).toEqual(expect.any(String))
    expect(patches()[0].consulta).toContain(`cpf_inspetor=eq.${A}`)
  })
  it('o próprio inspetor RETIRA a autorização: grava falso, a data da retirada e apaga a versão', async () => {
    const r = await enviar({ cpf: A, autoriza: false })
    expect(r.status).toBe(200); expect((await r.json()).autoriza).toBe(false)
    expect(patches()[0].corpo).toMatchObject({ autoriza_marketing: false, autoriza_marketing_versao: null })
  })
  it('o cadastro de OUTRO inspetor é barrado (403) e nada é gravado', async () => {
    expect(await status(enviar({ cpf: B, autoriza: true }))).toBe(403)
    expect(patches()).toHaveLength(0)
  })
  it('o gestor também NÃO altera a autorização de outro inspetor (só o titular decide)', async () => {
    estado.gestor = true; sessao(B)
    expect(await status(enviar({ cpf: A, autoriza: true }))).toBe(403)
    expect(patches()).toHaveLength(0)
  })
  it('sem sessão: 401', async () => {
    sessao(null)
    expect(await status(enviar({ cpf: A, autoriza: true }))).toBe(401)
    expect(patches()).toHaveLength(0)
  })
  it('valor que não é verdadeiro ou falso (texto, número, ausente): 400, nada gravado', async () => {
    for (const autoriza of ['true', 'sim', 1, null, undefined]) expect(await status(enviar({ cpf: A, autoriza }))).toBe(400)
    expect(await status(enviar({ cpf: A }))).toBe(400)
    expect(patches()).toHaveLength(0)
  })
  it('sem CPF: 400', async () => {
    expect(await status(enviar({ autoriza: true }))).toBe(400)
  })
  it('cadastro que não existe: 404', async () => {
    estado.cadastroExiste = false
    expect(await status(enviar({ cpf: A, autoriza: true }))).toBe(404)
  })
})

describe('Cadastro Inicial (salvar-inspetor): a autorização é opcional e só vai quando o inspetor marca a caixa', () => {
  const cadastro = (extra: Record<string, unknown> = {}) => salvar.POST(req('/api/salvar-inspetor', 'POST', {
    cpf: A, nome: 'Maria Teste', titulo: 'Eng Civil', inscricao_crea_cau: 'CREA 123', whatsapp: '(27) 99999-0000', email: 'm@x.com', cep: '29000-000', nr_imovel: '10', ...extra }))
  const gravacao = () => estado.gravacoesInspetor[0]

  it('caixa marcada no cadastro novo: o INSERT leva autorização, data e versão', async () => {
    estado.cadastroExiste = false
    expect((await cadastro({ autoriza_marketing: true })).status).toBe(200)
    expect(gravacao().metodo).toBe('POST')
    expect(gravacao().corpo).toMatchObject({ autoriza_marketing: true, autoriza_marketing_versao: VERSAO_AUTORIZACAO_MARKETING })
  })
  it('caixa desmarcada (a tela não envia o campo): o INSERT NÃO leva nenhuma coluna de autorização (o banco assume "não autorizou")', async () => {
    estado.cadastroExiste = false
    expect((await cadastro()).status).toBe(200)
    expect(Object.keys(gravacao().corpo).filter(k => k.startsWith('autoriza_marketing'))).toEqual([])
  })
  it('Meu Cadastro (Salvar Cadastro sem o campo) NÃO mexe na autorização de quem já tem cadastro', async () => {
    expect((await cadastro()).status).toBe(200)
    expect(gravacao().metodo).toBe('PATCH')
    expect(Object.keys(gravacao().corpo).filter(k => k.startsWith('autoriza_marketing'))).toEqual([])
  })
  it('valor que não é verdadeiro ou falso é ignorado (não grava autorização por engano)', async () => {
    estado.cadastroExiste = false
    await cadastro({ autoriza_marketing: 'true' })
    expect(Object.keys(gravacao().corpo).filter(k => k.startsWith('autoriza_marketing'))).toEqual([])
  })
})

describe('a tela de cadastro (Cadastro Inicial e Meu Cadastro, item 6.2)', () => {
  const tela = readFileSync('src/app/inspetor/page.tsx', 'utf-8')
  it('a caixa existe, começa DESMARCADA e usa o texto único', () => {
    expect(tela).toMatch(/const \[autorizaMarketing, setAutorizaMarketing\] = useState\(false\)/)
    expect(tela).toMatch(/name="autoriza_marketing"/)
    expect(tela).toContain('{TEXTO_AUTORIZACAO_MARKETING}')
    expect(tela).toContain('Autorização de Uso dos Dados')
  })
  it('aparece só no Cadastro Inicial e em Meu Cadastro (não no cadastro do gestor nem na visualização do gestor)', () => {
    expect(tela).toMatch(/\{\(ehNovo \|\| ehConsulta\) && \(\s*<div style=\{blocoStyle\}>\s*<div style=\{blocoHeaderStyle\}>\s*<span style=\{blocoTituloStyle\}>Autorização de Uso dos Dados/)
  })
  it('em Meu Cadastro grava na hora pela rota própria (retirar não depende do resto do formulário)', () => {
    expect(tela).toMatch(/if \(!ehConsulta\) \{ setAutorizaMarketing\(valor\); return \}/)
    expect(tela).toContain("fetch('/api/autorizacao-marketing'")
    expect(tela.match(/setAutorizaMarketing\(anterior\)/g)?.length).toBe(2)   // se falhar, a caixa volta ao que estava: no erro do servidor E na falta de conexão
  })
  it('o envio do cadastro leva a autorização SÓ no Cadastro Inicial e SÓ se a caixa foi marcada', () => {
    expect(tela).toMatch(/\.\.\.\(ehNovo && autorizaMarketing \? \{ autoriza_marketing: true \} : \{\}\)/)
  })
  it('a tela carrega a decisão e a data do banco', () => {
    expect(tela).toMatch(/setAutorizaMarketing\(!!d\.autoriza_marketing\)/)
    expect(tela).toContain('d.autoriza_marketing_em')
  })
})

describe('o SQL', () => {
  const sql = readFileSync('sql/2026-10-16_autorizacao_marketing.sql', 'utf-8')
  it('cria as três colunas, com padrão "não autorizou" e sem apagar nada', () => {
    expect(sql).toMatch(/add column if not exists autoriza_marketing boolean not null default false/)
    expect(sql).toMatch(/add column if not exists autoriza_marketing_em timestamptz/)
    expect(sql).toMatch(/add column if not exists autoriza_marketing_versao text/)
    expect(sql.split('\n').filter(l => /^\s*(drop|delete|truncate|update)\b/i.test(l))).toHaveLength(0)
  })
})

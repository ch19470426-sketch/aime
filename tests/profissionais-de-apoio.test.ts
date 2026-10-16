// Vistoria 39: o Eng Mecânico complementa a vistoria 32 de um civil nos sistemas 09-Climatização e 10-Acessibilidade/elevadores, como o Eng Elétrico
// já fazia no 07-Instalações elétricas. Uma regra só (src/lib/profissionaisDeApoio.ts), imposta pelas telas E pelo servidor.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { A, B, E, M, estado, reiniciar, sessao, req, status, quantas } from './helpers'
import {
  PERFIS_APOIO, perfilDoTitulo, codigoDoSistema, sistemaPermitido, sistemaFixoDoPerfil, sistemasDoParametro, perfilDoSistema,
} from '@/lib/profissionaisDeApoio'
import * as perfilApi from '@/app/api/perfil-apoio/route'
import * as salvar from '@/app/api/salvar-vistoria/route'
import * as listar from '@/app/api/listar-vistorias/route'

const ELE = PERFIS_APOIO['Eng Elétrico']
const MEC = PERFIS_APOIO['Eng Mecânico']
const CNPJ = '39262886000187'

beforeEach(() => { reiniciar(); vi.spyOn(console, 'error').mockImplementation(() => {}); estado.titulos = { [E]: 'Eng Elétrico', [M]: 'Eng Mecânico', [A]: 'Eng Civil', [B]: 'Arquiteto' } })

describe('a regra dos perfis', () => {
  it('Eng Elétrico vê o 07; Eng Mecânico vê o 09 e o 10', () => {
    expect(ELE.sistemas).toEqual(['07'])
    expect(MEC.sistemas).toEqual(['09', '10'])
    expect(MEC.nomes).toEqual(['09-Climatização', '10-Acessibilidade/elevadores'])
  })
  it('título que não é de profissional de apoio não tem perfil (inclusive nomes perigosos de objeto)', () => {
    for (const t of ['Eng Civil', 'Arquiteto', '', null, undefined, 'constructor', '__proto__', 'toString']) expect(perfilDoTitulo(t)).toBeNull()
    expect(perfilDoTitulo(' Eng Mecânico ')?.titulo).toBe('Eng Mecânico')
  })
  it('o código do sistema é lido do começo do nome', () => {
    expect(codigoDoSistema('07-Instalações elétricas')).toBe('07')
    expect(codigoDoSistema('9_Climatização')).toBe('09')
    expect(codigoDoSistema('10-Acessibilidade/elevadores')).toBe('10')
    expect(codigoDoSistema('Instalações 07')).toBe('')
    expect(codigoDoSistema(null)).toBe('')
  })
  it('o mecânico pode 09 e 10, e NÃO pode 07 nem 08; o elétrico pode só o 07', () => {
    expect(sistemaPermitido(MEC, '09-Climatização')).toBe(true)
    expect(sistemaPermitido(MEC, '10-Acessibilidade/elevadores')).toBe(true)
    expect(sistemaPermitido(MEC, '07-Instalações elétricas')).toBe(false)
    expect(sistemaPermitido(MEC, '08-Combate a Incêndio')).toBe(false)
    expect(sistemaPermitido(ELE, '07-Instalações elétricas')).toBe(true)
    expect(sistemaPermitido(ELE, '09-Climatização')).toBe(false)
  })
  it('o parâmetro sistema_fixo: o elétrico continua com UM nome (o mesmo de sempre); o mecânico leva os dois separados por |', () => {
    expect(sistemaFixoDoPerfil(ELE)).toBe('07-Instalações elétricas')
    expect(sistemaFixoDoPerfil(MEC)).toBe('09-Climatização|10-Acessibilidade/elevadores')
    expect(sistemasDoParametro(sistemaFixoDoPerfil(MEC))).toEqual(['09-Climatização', '10-Acessibilidade/elevadores'])
    expect(sistemasDoParametro('')).toEqual([])
  })
  it('cada sistema tem um dono (07 elétrico; 09 e 10 mecânico; os demais, ninguém)', () => {
    expect(perfilDoSistema('07-Instalações elétricas')?.titulo).toBe('Eng Elétrico')
    expect(perfilDoSistema('09-Climatização')?.titulo).toBe('Eng Mecânico')
    expect(perfilDoSistema('10-Acessibilidade/elevadores')?.titulo).toBe('Eng Mecânico')
    expect(perfilDoSistema('03-Vedações')).toBeNull()
  })
})

describe('GET /api/perfil-apoio', () => {
  const consultar = async (cpf: string) => { const r = await perfilApi.GET(req(`/api/perfil-apoio?cpf_inspetor=${cpf}`)); return { s: r.status, j: await r.json() } }
  it('o mecânico logado recebe o perfil mecânico', async () => {
    sessao(M); const { s, j } = await consultar(M)
    expect(s).toBe(200); expect(j.perfil.titulo).toBe('Eng Mecânico'); expect(j.perfil.sistemas).toEqual(['09', '10'])
  })
  it('o eletricista logado recebe o perfil elétrico', async () => {
    sessao(E); expect((await consultar(E)).j.perfil.titulo).toBe('Eng Elétrico')
  })
  it('quem não é profissional de apoio recebe perfil nulo', async () => {
    sessao(A); expect((await consultar(A)).j.perfil).toBeNull()
  })
  it('consultar o perfil de OUTRO usuário é barrado (403) e sem sessão é 401', async () => {
    sessao(M); expect((await consultar(E)).s).toBe(403)
    sessao(null); expect((await consultar(M)).s).toBe(401)
  })
})

describe('salvar-vistoria: o sistema gravado é do título de quem grava (fluxo 39)', () => {
  const gravar = (profissional: string, chave: string, sistema: string | undefined, extra: Record<string, unknown> = {}) =>
    salvar.POST(req('/api/salvar-vistoria', 'POST', {
      nomeArquivo: `${chave}_${CNPJ}_32_001.json`, pasta: 'vistorias',
      payload: { cpfEletrico: profissional, cpfInspetor: A, chaveInspetor: chave, cnpjoucpf: CNPJ, tipoServico: '32', sistema, ...extra },
    }))
  const gravouNoArmazenamento = () => quantas(/storage\/v1\/object\//) > 0   // (só para os casos de recusa)

  it('mecânico grava 09 e 10', async () => {
    sessao(M)
    for (const s of ['09-Climatização', '10-Acessibilidade/elevadores']) { expect(await status(gravar(M, 'INS-888', s))).toBe(200) }
    expect(quantas(/storage\/v1\/object\//)).toBe(2)
  })
  it('mecânico NÃO grava 07 nem 08: 403 e nada é gravado', async () => {
    sessao(M)
    expect(await status(gravar(M, 'INS-888', '07-Instalações elétricas'))).toBe(403)
    expect(await status(gravar(M, 'INS-888', '08-Combate a Incêndio'))).toBe(403)
    expect(gravouNoArmazenamento()).toBe(false)
  })
  it('elétrico grava 07; NÃO grava 09 (o servidor passa a impor o que antes era só da tela)', async () => {
    sessao(E)
    expect(await status(gravar(E, 'INS-777', '07-Instalações elétricas'))).toBe(200)
    expect(quantas(/storage\/v1\/object\//)).toBe(1)
    expect(await status(gravar(E, 'INS-777', '09-Climatização'))).toBe(403)
    expect(quantas(/storage\/v1\/object\//)).toBe(1)      // a recusada não gravou nada
  })
  it('título sem perfil de apoio e consulta ao título que falha: segue como antes (a regra só restringe perfis conhecidos)', async () => {
    estado.titulos[E] = null; sessao(E)
    expect(await status(gravar(E, 'INS-777', '09-Climatização'))).toBe(200)
    expect(quantas(/storage\/v1\/object\//)).toBe(1)
    estado.titulos[E] = 'Eng Elétrico'; estado.falhaTitulo = true     // só a consulta do título falha: não bloqueia quem tem o acesso (o vínculo é a trava principal)
    expect(await status(gravar(E, 'INS-777', '09-Climatização'))).toBe(200)
    expect(quantas(/storage\/v1\/object\//)).toBe(2)
  })
  it('inspetor civil gravando por conta própria (sem cpfEletrico) não é restringido: pode gravar o 09', async () => {
    sessao(A)
    const r = await salvar.POST(req('/api/salvar-vistoria', 'POST', { nomeArquivo: `INS-001_${CNPJ}_32_001.json`, pasta: 'vistorias', payload: { cpfInspetor: A, chaveInspetor: 'INS-001', cnpjoucpf: CNPJ, tipoServico: '32', sistema: '09-Climatização' } }))
    expect(r.status).toBe(200)
    expect(quantas(/storage\/v1\/object\//)).toBe(1)
  })
})

describe('o Eng Mecânico na SUA própria vistoria (fora do fluxo 39) não é restringido', () => {
  it('grava a vistoria de NR-12 dele, com sistema que não é 09 nem 10, sem cpfEletrico: 200', async () => {
    sessao(M)
    const r = await salvar.POST(req('/api/salvar-vistoria', 'POST', {
      nomeArquivo: `INS-888_${CNPJ}_37_001.json`, pasta: 'vistorias',
      payload: { cpfInspetor: M, chaveInspetor: 'INS-888', cnpjoucpf: CNPJ, tipoServico: '37', sistema: '01_Casa de Máquinas' },
    }))
    expect(r.status).toBe(200)
    expect(quantas(/storage\/v1\/object\//)).toBe(1)
  })
})

describe('listar-vistorias: cada item é buscado com a chave do profissional da ESPECIALIDADE dele', () => {
  const item = (sistema: string, foto: string) => ({ cpf_inspetor: A, sistema_vistoria: sistema, numero_foto: foto, tipo_servico: '32', cnpjoucpf: CNPJ })
  const listarComo = async (tipoServico = '42') => {
    sessao(A)
    const r = await listar.GET(req(`/api/listar-vistorias?chave_inspetor=INS-001&cnpjoucpf=${CNPJ}&tipo_servico=${tipoServico}`))
    expect(r.status).toBe(200)
    return Object.fromEntries(((await r.json()).ncs as any[]).map(n => [n.sistema, n._arquivo]))
  }
  const itens = [item('07-Instalações elétricas', '1'), item('09-Climatização', '2'), item('10-Acessibilidade/elevadores', '3'), item('03-Vedações', '4')]

  it('com o elétrico E o mecânico vinculados ao civil: 07 com a chave do elétrico, 09 e 10 com a do mecânico, o resto com a do civil', async () => {
    estado.vinculos = [[E, A], [M, A]]; estado.dadosVistoria = itens
    const arq = await listarComo()
    expect(arq['07-Instalações elétricas']).toBe(`INS-777_${CNPJ}_32_001.html`)
    expect(arq['09-Climatização']).toBe(`INS-888_${CNPJ}_32_002.html`)
    expect(arq['10-Acessibilidade/elevadores']).toBe(`INS-888_${CNPJ}_32_003.html`)
    expect(arq['03-Vedações']).toBe(`INS-001_${CNPJ}_32_004.html`)
  })
  it('só o elétrico vinculado: o 09 e o 10 NÃO usam a chave dele (caem na do civil)', async () => {
    estado.vinculos = [[E, A]]; estado.dadosVistoria = itens
    const arq = await listarComo()
    expect(arq['07-Instalações elétricas']).toBe(`INS-777_${CNPJ}_32_001.html`)
    expect(arq['09-Climatização']).toBe(`INS-001_${CNPJ}_32_002.html`)
    expect(arq['10-Acessibilidade/elevadores']).toBe(`INS-001_${CNPJ}_32_003.html`)
  })
  it('só o mecânico vinculado: o 07 NÃO usa a chave dele (cai na do civil)', async () => {
    estado.vinculos = [[M, A]]; estado.dadosVistoria = itens
    const arq = await listarComo()
    expect(arq['07-Instalações elétricas']).toBe(`INS-001_${CNPJ}_32_001.html`)
    expect(arq['09-Climatização']).toBe(`INS-888_${CNPJ}_32_002.html`)
  })
  it('profissional vinculado com título antigo ou vazio segue sendo tratado como elétrico (o comportamento de sempre)', async () => {
    estado.titulos[E] = null; estado.vinculos = [[E, A]]; estado.dadosVistoria = itens
    expect((await listarComo())['07-Instalações elétricas']).toBe(`INS-777_${CNPJ}_32_001.html`)
  })
  it('vistorias de NR têm outra numeração de sistemas: um sistema 09 de NR-12 NÃO vai para o mecânico de apoio', async () => {
    estado.vinculos = [[M, A]]
    estado.dadosVistoria = [{ cpf_inspetor: A, sistema_vistoria: '09_Proteções Fixas e Móveis', numero_foto: '7', tipo_servico: '37', cnpjoucpf: CNPJ }]
    const arq = await listarComo('47')
    expect(arq['09_Proteções Fixas e Móveis']).toBe(`INS-001_${CNPJ}_37_007.html`)
  })
})

describe('as telas usam a regra única', () => {
  const ler = (p: string) => readFileSync(p, 'utf-8')
  it('painel: o Eng Mecânico passa a ter o serviço 39 (e segue com o 40); o item 39 e o código 40 seguem o perfil', () => {
    const c = ler('src/app/dashboard/page.tsx')
    const mec = c.match(/"Eng Mecânico":\s*\[([^\]]*)\]/)![1].split(',').map(Number)
    expect(mec).toContain(39); expect(mec).toContain(40); expect(mec).toContain(37)
    expect(c).toMatch(/codigo === 40 && perfilDoTitulo\(titulo\)/)
    expect(c).toMatch(/Vistoria Inspeção - \$\{perfilDoTitulo\(titulo\)\?\.rotulo \?\? 'Elétrica'\}/)
    expect(c).toMatch(/\{grupos\.map\(\(grupo\)/)
  })
  it('acesso à vistoria 39: pergunta o perfil ao servidor, usa o perfil no título, nos textos e no sistema_fixo, e espera a resposta para liberar os botões', () => {
    const c = ler('src/app/vistoria-eletrica/page.tsx')
    expect(c).toContain('/api/perfil-apoio')
    expect(c).toMatch(/Vistoria Inspeção \{perfil\.rotulo\}/)
    expect(c).toMatch(/acesso liberado \{perfil\.ao\}/)
    expect(c).toMatch(/não conformidades \{perfil\.de\}/)
    expect(c.match(/sistema_fixo=\$\{sistemaFixoUrl\}/g)?.length).toBe(2)
    expect(c).not.toContain('sistema_fixo=07-')
    expect(c).toMatch(/disabled=\{salvando \|\| !perfilPronto\}/)
    expect(c).toMatch(/disabled=\{!perfilPronto\}/)
  })
  it('seleção da homologação: sistema_fixo e rótulo do segundo caminho vêm do perfil', () => {
    const c = ler('src/app/selecao-homologar-eletrico/page.tsx')
    expect(c).toContain('/api/perfil-apoio')
    expect(c).toMatch(/encodeURIComponent\(sistemaFixoDoPerfil\(perfil\)\)/)
    expect(c).toContain("'Vistoria NR-12 / NR-13 / Elevadores' : 'Vistoria NR-10'")
    expect(c).not.toContain("encodeURIComponent('07-Instalações elétricas')")
  })
  it('vistoria 32: aceita vários sistemas fixos; o campo só trava quando é UM', () => {
    const c = ler('src/app/vistoria/tela32/page.tsx')
    expect(c).toMatch(/sistemasDoParametro\(sistemaFixo\)/)
    expect(c).toMatch(/const sistemaFixoUnico = sistemasFixos\.length === 1/)
    expect(c).toMatch(/disabled=\{sistemaFixoUnico\}/)
    expect(c).toMatch(/codigosFixos\.includes\(codigoDoSistema\(s\.sistema\)\)/)
    expect(c).not.toMatch(/disabled=\{!!sistemaFixo\}/)
    expect(c.match(/setSistema\(sistemaFixoUnico \? sistemaFixo : \(sistemasFixos\.length > 1 \? sistema : ''\)\)/g)?.length).toBe(2)
  })
  it('homologação: a faixa mostra o perfil do sistema (elétrico ou mecânico)', () => {
    const c = ler('src/app/homologar/page.tsx')
    expect(c).toMatch(/perfilDoSistema\(sistemasFixos\[0\]\) \?\? PERFIS_APOIO\['Eng Elétrico'\]/)
    expect(c).toMatch(/\{perfilFaixa\.faixa\} — \{sistemasFixos\.join\(' · '\)\}/)
    expect(c).not.toContain('⚡ Sistema Elétrico — {sistemaFixo}')
  })
})

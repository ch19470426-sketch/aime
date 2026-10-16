// Ajustes da vistoria 39 (14/10/2026): mínimo de 50 CR para iniciar (elétrico e mecânico), "elvadores" corrigido para "elevadores" e manual operacional novo.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { A, estado, reiniciar, req } from './helpers'
import { custoParaIniciar, decidirVerificacao, MINIMO_INICIAR_VISTORIA, MINIMO_INICIAR_VISTORIA_APOIO } from '@/lib/creditos'
import * as verificar from '@/app/api/creditos/verificar-servico/route'

beforeEach(reiniciar)

describe('crédito mínimo para iniciar a vistoria 39', () => {
  it('a vistoria 39 inicia com 50 CR; as demais vistorias (31 a 38) seguem com 100', () => {
    expect(MINIMO_INICIAR_VISTORIA_APOIO).toBe(50)
    expect(custoParaIniciar(39)).toBe(50)
    for (const codigo of [31, 32, 33, 34, 35, 36, 37, 38]) expect(custoParaIniciar(codigo)).toBe(MINIMO_INICIAR_VISTORIA)
    expect(MINIMO_INICIAR_VISTORIA).toBe(100)
  })
  it('o caso relatado: inspetor com 16 CR na vistoria 39 NÃO inicia, e a mensagem diz 50 (faltam 34), e não 100', () => {
    const v = decidirVerificacao({ existe: true, saldo_total: 16 }, custoParaIniciar(39)!)
    expect(v).toMatchObject({ liberado: false, motivo: 'saldo_insuficiente', necessario: 50, faltam: 34 })
  })
  it('limite exato: 49 não inicia, 50 e 116 iniciam', () => {
    expect(decidirVerificacao({ existe: true, saldo_total: 49 }, 50).liberado).toBe(false)
    expect(decidirVerificacao({ existe: true, saldo_total: 50 }, 50).liberado).toBe(true)
    expect(decidirVerificacao({ existe: true, saldo_total: 116 }, 50).liberado).toBe(true)
  })
  const consultar = async (codigo: number) => { const r = await verificar.GET(req(`/api/creditos/verificar-servico?cpf_inspetor=${A}&codigo_servico=${codigo}`)); return { s: r.status, j: await r.json() } }
  it('pela rota que o app consulta: 39 com 16 CR → precisa de 50 (faltam 34); a vistoria 32 com os mesmos 16 CR → precisa de 100 (faltam 84)', async () => {
    estado.saldo = { existe: true, isento: false, saldo_plano: 16, saldo_avulso: 0, saldo_total: 16 }
    const v39 = await consultar(39); expect(v39.j).toMatchObject({ liberado: false, necessario: 50, faltam: 34 })
    const v32 = await consultar(32); expect(v32.j).toMatchObject({ liberado: false, necessario: 100, faltam: 84 })
  })
  it('pela rota: com 50 CR a vistoria 39 é liberada, e a 32 ainda não', async () => {
    estado.saldo = { existe: true, isento: false, saldo_plano: 50, saldo_avulso: 0, saldo_total: 50 }
    expect((await consultar(39)).j.liberado).toBe(true)
    expect((await consultar(32)).j.liberado).toBe(false)
  })
})

describe('"elvadores" corrigido para "elevadores"', () => {
  const laudo = readFileSync('src/app/api/gerar-laudo/route.ts', 'utf-8')
  it('o nome certo está nas quatro listas de sistemas e na descrição do sistema 10', () => {
    expect(laudo.match(/10-Acessibilidade\/elevadores/g)?.length).toBe(5)
  })
  it('o erro de digitação só sobrevive na tolerância que reconhece o dado antigo', () => {
    const restos = laudo.split('\n').filter(l => l.includes('elvadores'))
    expect(restos).toHaveLength(2)                                                    // o comentário e a normalização
    expect(laudo).toMatch(/\.replace\(\/elvadores\/gi, 'elevadores'\)/)
  })
  it('a tolerância faz o nome antigo casar com o certo (mesma função do laudo)', () => {
    const norm = (s: string) => String(s || '').trim().replace(/^\d+[-_]\s*/, '').replace(/_/g, ' ').replace(/elvadores/gi, 'elevadores').trim().toLowerCase()
    expect(norm('10-Acessibilidade/elvadores')).toBe(norm('10-Acessibilidade/elevadores'))
  })
  it('nenhum outro arquivo do código tem o erro', () => {
    for (const f of ['src/lib/profissionaisDeApoio.ts', 'src/app/api/gerar-laudo-docx/route.ts', 'src/lib/descSistemas.ts']) expect(readFileSync(f, 'utf-8')).not.toContain('elvadores')
  })
  it('o SQL corrige as duas tabelas que o código usa e começa por uma consulta só de leitura', () => {
    const sql = readFileSync('sql/2026-10-14_corrige_elevadores.sql', 'utf-8')
    expect(sql).toMatch(/update public\.sistemas_construtivos set sistema = regexp_replace\(sistema, 'elvadores', 'elevadores', 'gi'\)/)
    expect(sql).toMatch(/update public\.dados_vistoria set sistema_vistoria = regexp_replace\(sistema_vistoria, 'elvadores', 'elevadores', 'gi'\)/)
    expect(sql.indexOf('select table_name, column_name, qtd')).toBeLessThan(sql.indexOf('update public.sistemas_construtivos'))
    expect(sql.split('\n').filter(l => /^\s*update /i.test(l))).toHaveLength(0)         // os updates ficam comentados: a ETAPA 2 é uma decisão consciente
  })
})

describe('manual operacional', () => {
  it('o link do painel aponta para o arquivo, e o arquivo é um PDF de 7 páginas, versão 1.1', () => {
    expect(readFileSync('src/app/dashboard/page.tsx', 'utf-8')).toContain('href="/manual-operacional-inspetor.pdf"')
    const pdf = readFileSync('public/manual-operacional-inspetor.pdf')
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(statSync('public/manual-operacional-inspetor.pdf').size).toBeGreaterThan(100_000)
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length).toBe(7)
  })
})

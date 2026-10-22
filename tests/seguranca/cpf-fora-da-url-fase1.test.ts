// Fase 1 do pedido do marketing (CPF fora da URL): a identidade do PRÓPRIO usuário vem da sessão, não da URL. Os fluxos do gestor e do profissional de apoio,
// que agem sobre OUTRA pessoa, ficam para a Fase 2 (são as três exceções abaixo). O servidor confere o dono de qualquer jeito (testes em tests/seguranca/).
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest } from 'next/server'
import { resolverParametros, cpfDoLogin } from '@/lib/identidade'
import { proxy } from '@/proxy'

const EU = '12411502737', OUTRO = '99999999999'
const url = (q: string) => new URLSearchParams(q)

describe('identidade vinda da sessão (resolverParametros)', () => {
  it('o próprio usuário: sem CPF na URL, as telas recebem o CPF e a chave dele; a chave e o cpf_eletrico NUNCA vêm da URL', () => {
    const p = resolverParametros(url('cnpjoucpf=39262886000187&tipo_servico=32'), EU)
    expect(p.get('cpf_inspetor')).toBe(EU); expect(p.get('chave_inspetor')).toBe(EU); expect(p.get('cpf')).toBe(EU); expect(p.get('chave')).toBe(EU)
    expect(p.get('cnpjoucpf')).toBe('39262886000187'); expect(p.get('tipo_servico')).toBe('32')    // o que não é identidade segue como estava
    expect(p.has('cpf_eletrico')).toBe(false)                                                      // sem apoio=1, não é o fluxo do profissional de apoio
    const forjada = resolverParametros(url(`chave_inspetor=${OUTRO}&chave=${OUTRO}`), EU)
    expect(forjada.get('chave_inspetor')).toBe(EU); expect(forjada.get('chave')).toBe(EU)         // a URL não escolhe a chave
  })
  it('fluxo do profissional de apoio: apoio=1 marca o cpf_eletrico (o próprio), e o CPF do civil na URL é mantido (Fase 2)', () => {
    const p = resolverParametros(url(`cpf_inspetor=${OUTRO}&apoio=1`), EU)
    expect(p.get('cpf_eletrico')).toBe(EU); expect(p.get('cpf_inspetor')).toBe(OUTRO); expect(p.get('chave_inspetor')).toBe(EU)
    expect(resolverParametros(url(`cpf=${OUTRO}&visualizar=1`), EU).get('cpf')).toBe(OUTRO)       // gestor vendo outro inspetor (Fase 2)
  })
  it('sem sessão nada é inventado; e o CPF sai do e-mail de login só se for o do AIMÊ', () => {
    expect(resolverParametros(url('cnpjoucpf=1'), '').has('cpf_inspetor')).toBe(false)
    expect(cpfDoLogin(`${EU}@aime-app.com.br`)).toBe(EU)
    expect(cpfDoLogin('alguem@gmail.com')).toBe(''); expect(cpfDoLogin(null)).toBe('')
  })
})

describe('redirecionamento da URL antiga /inspetor?cpf=... (servidor)', () => {
  const ir = (q: string) => proxy(new NextRequest(`https://app.aime.eng.br/inspetor?${q}`))
  it('vai para a rota limpa e o CPF informado é IGNORADO (nem sobra na URL de destino)', () => {
    const plano = ir(`cpf=${OUTRO}&aba=plano`)
    expect(plano.status).toBe(307); expect(plano.headers.get('location')).toBe('https://app.aime.eng.br/meu-plano')
    const cadastro = ir(`cpf=${OUTRO}`)
    expect(cadastro.headers.get('location')).toBe('https://app.aime.eng.br/meu-cadastro')
    expect(ir(`cpf=${OUTRO}&novo=1`).headers.get('location')).toBe('https://app.aime.eng.br/meu-cadastro?novo=1')
    for (const r of [plano, cadastro]) expect(r.headers.get('location')).not.toContain(OUTRO)
  })
  it('o gestor vendo outro inspetor (visualizar=1) não é redirecionado (Fase 2)', () => {
    expect(ir(`cpf=${OUTRO}&visualizar=1`).headers.get('location')).toBeNull()
  })
})

describe('nenhum link do app carrega o CPF do próprio usuário', () => {
  const arquivos = (dir: string): string[] => readdirSync(dir).flatMap(n => (statSync(join(dir, n)).isDirectory() ? arquivos(join(dir, n)) : n.endsWith('.tsx') ? [join(dir, n)] : []))
  it('só restam as 3 exceções da Fase 2 (CPF do civil na vistoria 39 e visualizar do gestor); consultas ao banco e rotas /api ficam para a Fase 1b', () => {
    const achados: string[] = []
    for (const f of arquivos('src/app')) {
      readFileSync(f, 'utf-8').split('\n').forEach((l, i) => {
        if (l.trim().startsWith('//')) return
        if (/[?&](cpf_inspetor|chave_inspetor|cpf|chave|cpf_eletrico)=/.test(l) && !l.includes('/api/') && !l.includes('/rest/v1/')) achados.push(`${f.replace('src/app/', '')}:${i + 1}`)
      })
    }
    expect(achados.map(a => a.split(':')[0]).sort()).toEqual(['gestor/page.tsx', 'vistoria-eletrica/page.tsx', 'vistoria-eletrica/page.tsx'])
  })
  it('as telas leem a identidade pelo leitor central (useParametros); só o painel do gestor usa useSearchParams direto', () => {
    const diretos = arquivos('src/app').filter(f => /\buseSearchParams\b/.test(readFileSync(f, 'utf-8'))).map(f => f.replace('src/app/', ''))
    expect(diretos).toEqual(['gestor/page.tsx'])
  })
})

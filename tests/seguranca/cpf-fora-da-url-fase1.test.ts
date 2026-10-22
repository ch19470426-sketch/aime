// Fases 1, 2 e 3 do pedido do marketing (CPF fora da URL): a identidade do usuário vem da sessão; o CPF de OUTRA pessoa (o inspetor que o gestor está vendo, o
// inspetor civil do profissional de apoio), o documento do CLIENTE atendido e o nome do documento aberto ficam guardados só na aba, nunca na URL. O servidor confere o dono de qualquer jeito (testes em tests/seguranca/).
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest } from 'next/server'
import { resolverParametros, cpfDoLogin } from '@/lib/identidade'
import { nomeSemChave, nomeComChave } from '@/lib/nomeArquivo'
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
  it('profissional de apoio (vistoria 39): apoio=1 marca o cpf_eletrico (o próprio) e sobre_civil=1 traz o civil guardado na aba; a URL não escolhe quem é o civil', () => {
    const p = resolverParametros(url('apoio=1&sobre_civil=1'), EU, '', OUTRO)
    expect(p.get('cpf_eletrico')).toBe(EU); expect(p.get('cpf_inspetor')).toBe(OUTRO); expect(p.get('chave_inspetor')).toBe(EU)
    expect(resolverParametros(url(`apoio=1&sobre_civil=1&cpf_inspetor=${EU}`), EU, '', OUTRO).get('cpf_inspetor')).toBe(OUTRO)   // CPF forjado na URL é ignorado
    expect(resolverParametros(url('apoio=1&sobre_civil=1'), EU, '', '').has('cpf_inspetor')).toBe(false)                        // aba nova, sem civil guardado: não há quem vistoriar
    expect(resolverParametros(url('apoio=1'), EU, '', OUTRO).get('cpf_inspetor')).toBe(EU)                                      // sem sobre_civil, o civil guardado é ignorado
    expect(resolverParametros(url(`cpf=${OUTRO}&visualizar=1`), EU).get('cpf')).toBe(OUTRO)       // gestor vendo outro inspetor (Fase 2)
  })
  it('gestor vendo o cadastro de outro inspetor: o CPF vem do alvo guardado na ABA, e só com visualizar=1', () => {
    expect(resolverParametros(url('visualizar=1'), EU, OUTRO).get('cpf')).toBe(OUTRO)
    expect(resolverParametros(url(''), EU, OUTRO).get('cpf')).toBe(EU)                              // fora do modo visualizar o alvo guardado é ignorado
  })
  it('estabelecimento atendido e documento aberto: vêm da aba quando a URL não os traz; o que a URL trouxer (link antigo) vale', () => {
    const CNPJ = '39262886000187'
    const p = resolverParametros(url('tipo_servico=32'), EU, '', '', CNPJ, `${CNPJ}_proposta_nr12.html`)
    expect(p.get('cnpjoucpf')).toBe(CNPJ); expect(p.get('nome_arquivo')).toBe(`${CNPJ}_proposta_nr12.html`); expect(p.get('tipo_servico')).toBe('32')
    const antigo = resolverParametros(url('cnpjoucpf=11111111000191&nome=x.html'), EU, '', '', CNPJ, 'guardado.html')
    expect(antigo.get('cnpjoucpf')).toBe('11111111000191'); expect(antigo.has('nome_arquivo')).toBe(false); expect(antigo.get('nome')).toBe('x.html')
    expect(resolverParametros(url(''), EU).has('cnpjoucpf')).toBe(false)                          // nada guardado, nada inventado
  })
  it('sem sessão nada é inventado; e o CPF sai do e-mail de login só se for o do AIMÊ', () => {
    expect(resolverParametros(url('cnpjoucpf=1'), '').has('cpf_inspetor')).toBe(false)
    expect(cpfDoLogin(`${EU}@aime-app.com.br`)).toBe(EU)
    expect(cpfDoLogin('alguem@gmail.com')).toBe(''); expect(cpfDoLogin(null)).toBe('')
  })
})

describe('nome do documento na URL: sem a chave (o CPF)', () => {
  it('nomeComChave recompõe com a chave do usuário logado, e nunca aceita a de outro', () => {
    const completo = `${EU}_39262886000187_proposta_nr12.html`
    expect(nomeComChave(nomeSemChave(completo), EU)).toBe(completo)                                  // ida e volta
    expect(nomeComChave(completo, EU)).toBe(completo)                                                // link antigo, que já traz a chave
    expect(nomeComChave(`${OUTRO}_39262886000187_proposta_nr12.html`, EU)).toBe(`${EU}_${OUTRO}_39262886000187_proposta_nr12.html`)   // arquivo de outro: vira um nome que não existe
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
  it('nenhum link de tela carrega CPF, CNPJ do cliente ou nome de documento; consultas ao banco (=eq.) e rotas /api ficam para a Fase 1b', () => {
    const achados: string[] = []
    for (const f of arquivos('src/app')) {
      readFileSync(f, 'utf-8').split('\n').forEach((l, i) => {
        if (l.trim().startsWith('//')) return
        if (/[?&](cpf_inspetor|chave_inspetor|cpf|chave|cpf_eletrico|cpf_civil|cnpjoucpf|nome_arquivo|nome)=(?!eq\.)/.test(l) && !l.includes('/api/') && !l.includes('/rest/v1/')) achados.push(`${f.replace('src/app/', '')}:${i + 1}`)
      })
    }
    expect(achados).toEqual([])
  })
  it('as telas leem a identidade pelo leitor central (useParametros); só o painel do gestor usa useSearchParams direto', () => {
    const diretos = arquivos('src/app').filter(f => /\buseSearchParams\b/.test(readFileSync(f, 'utf-8'))).map(f => f.replace('src/app/', ''))
    expect(diretos).toEqual(['gestor/page.tsx'])
  })
})

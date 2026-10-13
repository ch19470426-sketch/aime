import { NextRequest } from 'next/server'

// ─── Infraestrutura dos testes de rota ───
// Três usuários de teste: A e B são inspetores civis (chaves INS-001 e INS-002); E é um eletricista (INS-777) vinculado
// ao civil A. O banco, o armazenamento, a API do Asaas e o e-mail são simulados por `mundo`; todas as chamadas ficam
// registradas em `chamadas()`, para os testes provarem que um pedido recusado NÃO chegou a tocar em nada.

export type Chamada = { m: string; host: string; p: string; q: string; b: string }
const g = globalThis as any

export const A = '11111111111'
export const B = '22222222222'
export const E = '33333333333'
export const CHAVES: Record<string, string> = { [A]: 'INS-001', [B]: 'INS-002', [E]: 'INS-777' }

export const estado = {
  falhaChave: false,                       // a consulta da chave do inspetor falha (banco fora)
  gestor: false,                           // a sessão é de gestor
  asaasFora: false,                        // a API do Asaas responde erro
  cobrancaAsaas: null as any,              // o que a API do Asaas devolve para a cobrança
  pedido: null as any,                     // pedido de créditos encontrado pelo webhook
  contratos: [] as any[],                  // contratos do inspetor
  insercaoContrato: 'ok' as 'ok' | 'duplicada' | 'outro',
  inserts: [] as any[],                    // corpos enviados em POST para contratos_inspetor
  vinculos: [[E, A]] as [string, string][], // [eletricista, civil] em art_profissional
}

export const jr = (b: unknown, s = 200, h: Record<string, string> = {}) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', ...h } })

export function mundo(u: URL, m: string, init: any): Response {
  const p = u.pathname
  if (u.host.includes('resend')) return jr({ id: 'e' })
  if (u.host.includes('asaas')) return estado.asaasFora ? jr({ errors: [{ description: 'erro' }] }, 500) : jr(estado.cobrancaAsaas)
  if (p.includes('/rest/v1/inspetor')) {
    if (estado.falhaChave) return jr({ message: 'boom' }, 500)
    const cpf = (u.searchParams.get('cpf_inspetor') || '').replace('eq.', '')
    return jr({ chave_inspetor: CHAVES[cpf] ?? null, is_gestor: estado.gestor, email_inspetor: 'g@x.com', nome_inspetor: 'G', conta_bloqueada: false })
  }
  if (p.includes('/rest/v1/art_profissional')) {
    const q = decodeURIComponent(u.search)
    const ok = estado.vinculos.some(([e, c]) => q.includes(`cpf_eletrico=eq.${e}`) && q.includes(`cpf_inspetor=eq.${c}`))
    return jr(ok ? [{ cpf_inspetor: A }] : [])
  }
  if (p.includes('/rest/v1/contratos_inspetor')) {
    if (m === 'GET') return jr(estado.contratos)
    if (m === 'POST') {
      estado.inserts.push(JSON.parse(String(init?.body ?? '{}')))
      if (estado.insercaoContrato === 'duplicada') return jr({ code: '23505', message: 'duplicate key value violates unique constraint "pk_contratos"' }, 409)
      if (estado.insercaoContrato === 'outro') return jr({ code: '42501', message: 'permission denied for table contratos_inspetor' }, 403)
      return jr([], 201)
    }
    return jr([{}])
  }
  if (p.includes('/rest/v1/pedidos_credito')) return m === 'GET' ? jr(estado.pedido ?? []) : jr([{ id: estado.pedido?.id ?? 1 }])
  if (p.includes('/rpc/')) return jr({ ok: true, liberado: true, saldo: 9999 })
  if (p.includes('/storage/v1/object/upload/sign')) return jr({ url: '/object/upload/sign/aime/x?token=t', token: 't' })
  if (p.includes('/storage/v1/object/list')) return jr([])
  if (p.includes('/storage/v1/object')) return m === 'GET' ? jr({ ok: true }) : jr({ Key: 'aime/x' })
  if (p.includes('/rest/v1/')) return jr([], 200, { 'content-range': '*/0' })
  return jr({})
}

export const chamadas = (): Chamada[] => g.__CALLS
export const sessao = (cpf: string | null) => { g.__SESSAO = cpf }
export const ligarPorteiro = (on: boolean) => { if (on) process.env.AUTH_API_ATIVA = 'true'; else delete process.env.AUTH_API_ATIVA }

/** Estado limpo antes de cada teste: sessão de A, porteiro ligado, nenhuma chamada registrada. */
export function reiniciar() {
  g.__CALLS.length = 0
  sessao(A)
  ligarPorteiro(true)
  process.env.COBRANCA_CREDITOS_ATIVA = 'true'
  Object.assign(estado, { falhaChave: false, gestor: false, asaasFora: false, cobrancaAsaas: null, pedido: null, contratos: [], insercaoContrato: 'ok', inserts: [], vinculos: [[E, A]] })
}

export const req = (url: string, method = 'GET', body?: unknown) =>
  new NextRequest('http://localhost' + url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })

export const status = async (r: Response | Promise<Response>) => (await r).status
/** Quantas chamadas (método + caminho) casam com a expressão. */
export const quantas = (re: RegExp) => chamadas().filter(c => re.test(`${c.m} ${c.p}`)).length
/** Chamadas de DADOS (qualquer uma que não seja só a consulta de quem é o usuário). */
export const dados = () => chamadas().filter(c => !/rest\/v1\/inspetor|art_profissional/.test(c.p)).length
/** Passou pelo porteiro (não foi barrado por falta de sessão nem de permissão). */
export const livre = (s: number) => s !== 401 && s !== 403

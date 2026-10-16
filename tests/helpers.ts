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
export const M = '44444444444'   // engenheiro MECÂNICO (profissional de apoio da vistoria 39, como o eletricista E)
export const CHAVES: Record<string, string> = { [A]: 'INS-001', [B]: 'INS-002', [E]: 'INS-777', [M]: 'INS-888' }

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
  chaves: { ...CHAVES } as Record<string, string | null>, // chave INS-nnn de cada CPF (null = cadastro antigo, sem chave)
  chavesExistentes: [] as string[],        // todas as chaves do banco (usado no cálculo de reserva, sem a sequência)
  proximaChave: 'INS-010',                 // o que a sequência do banco devolve
  rpcChaveAusente: false,                  // a função proxima_chave_inspetor ainda não existe no banco
  cadastroExiste: true,                    // o inspetor existe (false = novo cadastro)
  arquivos: {} as Record<string, string[]>, // nomes de arquivo por pasta do armazenamento
  legadas: [] as { cpf_inspetor: string; chave_legada: string }[], // cadastros com a chave INS-nnn antiga (migração para o CPF)
  colunaLegadaAusente: false,              // o SQL de migração ainda não foi executado
  destinosExistentes: [] as string[],      // destinos de move que já existem no armazenamento
  contatos: [] as Record<string, unknown>[], // linhas de contato_cliente
  contatosGravados: [] as Record<string, unknown>[], // linhas que as rotas gravaram (POST) em contato_cliente
  erroContato: '' as string,               // se preenchido, a gravação em contato_cliente falha com esta mensagem
  titulos: {} as Record<string, string | null>, // titulo_profissional de cada CPF (Eng Elétrico, Eng Mecânico...)
  falhaTitulo: false,                      // SÓ a consulta do título profissional falha (a da chave e as demais seguem normais)
  dadosVistoria: [] as Record<string, unknown>[], // linhas de dados_vistoria
}

export const jr = (b: unknown, s = 200, h: Record<string, string> = {}) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', ...h } })

export function mundo(u: URL, m: string, init: any): Response {
  const p = u.pathname
  if (u.host.includes('resend')) return jr({ id: 'e' })
  if (u.host.includes('asaas')) return estado.asaasFora ? jr({ errors: [{ description: 'erro' }] }, 500) : jr(estado.cobrancaAsaas)
  if (p.includes('/rest/v1/inspetor')) {
    if (estado.falhaChave) return jr({ message: 'boom' }, 500)
    if (estado.falhaTitulo && (u.searchParams.get('select') ?? '') === 'titulo_profissional') return jr({ message: 'boom' }, 500)
    if ((u.searchParams.get('select') ?? '').includes('chave_legada')) {
      return estado.colunaLegadaAusente ? jr({ code: '42703', message: 'column inspetor.chave_legada does not exist' }, 400) : jr(estado.legadas)
    }
    if (m !== 'GET') return jr([{ chave_inspetor: null }])   // update(...).select() e insert devolvem lista
    const filtroCpf = u.searchParams.get('cpf_inspetor') || ''
    if (filtroCpf.startsWith('in.(')) {   // .in('cpf_inspetor', [...]) devolve uma lista
      const cpfs = filtroCpf.slice(4, -1).split(',').map(s => s.replace(/"/g, ''))
      return jr(cpfs.map(cpf => ({ cpf_inspetor: cpf, chave_inspetor: estado.chaves[cpf] ?? null, titulo_profissional: estado.titulos[cpf] ?? null })))
    }
    if (!u.searchParams.has('cpf_inspetor')) return jr(estado.chavesExistentes.map(c => ({ chave_inspetor: c })))   // lista de chaves
    if (!estado.cadastroExiste) return jr({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: 'The result contains 0 rows' }, 406)
    const cpf = (u.searchParams.get('cpf_inspetor') || '').replace('eq.', '')
    return jr({ chave_inspetor: estado.chaves[cpf] ?? null, titulo_profissional: estado.titulos[cpf] ?? null, is_gestor: estado.gestor, email_inspetor: 'g@x.com', nome_inspetor: 'G', conta_bloqueada: false })
  }
  if (p.includes('/rest/v1/dados_vistoria')) return jr(estado.dadosVistoria)
  if (p.includes('/rest/v1/art_profissional')) {
    const q = decodeURIComponent(u.search)
    const listaCivis = q.match(/cpf_inspetor=in\.\(([^)]*)\)/)
    if (listaCivis) {   // .in('cpf_inspetor', [...]) devolve os vínculos desses civis
      const civis = listaCivis[1].split(',').map(s => s.replace(/"/g, ''))
      return jr(estado.vinculos.filter(([, civil]) => civis.includes(civil)).map(([apoio, civil]) => ({ cpf_inspetor: civil, cpf_eletrico: apoio })))
    }
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
  if (p.includes('/rest/v1/contato_cliente') && m === 'POST') {
    if (estado.erroContato) return jr({ code: '23514', message: estado.erroContato }, 400)
    estado.contatosGravados.push(JSON.parse(String(init?.body ?? '{}')))
    return jr([], 201)
  }
  if (p.includes('/rest/v1/contato_cliente') && m === 'GET') {
    // como o banco: .eq('cnpjoucpf').eq('cpf_inspetor') e, se vier, .eq('tipo_servico')
    const igual = (campo: string) => { const v = u.searchParams.get(campo); return v?.startsWith('eq.') ? v.slice(3) : null }
    const [cpf, cnpj, tipo] = [igual('cpf_inspetor'), igual('cnpjoucpf'), igual('tipo_servico')]
    return jr(estado.contatos.filter(r => (!cpf || r.cpf_inspetor === cpf) && (!cnpj || r.cnpjoucpf === cnpj) && (!tipo || r.tipo_servico === tipo)))
  }
  if (p.includes('/rest/v1/pedidos_credito')) return m === 'GET' ? jr(estado.pedido ?? []) : jr([{ id: estado.pedido?.id ?? 1 }])
  if (p.includes('/rpc/proxima_chave_inspetor')) {
    return estado.rpcChaveAusente ? jr({ code: 'PGRST202', message: 'Could not find the function public.proxima_chave_inspetor without parameters' }, 404) : jr(estado.proximaChave)
  }
  if (p.includes('/rpc/')) return jr({ ok: true, liberado: true, saldo: 9999 })
  if (p.includes('/storage/v1/object/upload/sign')) return jr({ url: '/object/upload/sign/aime/x?token=t', token: 't' })
  if (p.includes('/storage/v1/object/list')) {
    // Como o armazenamento real: filtra pelo trecho do nome (search), ordena por nome e pagina (limit e offset)
    const corpo = JSON.parse(String(init?.body ?? '{}'))
    const busca = String(corpo.search ?? '').toLowerCase()
    const todos = (estado.arquivos[corpo.prefix] ?? []).filter(n => !busca || n.toLowerCase().includes(busca)).sort()
    const inicio = Number(corpo.offset ?? 0)
    return jr(todos.slice(inicio, inicio + Number(corpo.limit ?? 100)).map(name => ({ name, created_at: '2026-10-13T12:00:00Z' })))
  }
  if (p.includes('/storage/v1/object/move')) {
    const corpo = JSON.parse(String(init?.body ?? '{}'))
    return estado.destinosExistentes.includes(corpo.destinationKey) ? jr({ statusCode: '409', error: 'Duplicate', message: 'The resource already exists' }, 409) : jr({ message: 'Successfully moved' })
  }
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
  Object.assign(estado, { chaves: { ...CHAVES }, chavesExistentes: [], proximaChave: 'INS-010', rpcChaveAusente: false, cadastroExiste: true, arquivos: {}, legadas: [], colunaLegadaAusente: false, destinosExistentes: [], contatos: [], contatosGravados: [], erroContato: '', titulos: {}, falhaTitulo: false, dadosVistoria: [], falhaChave: false, gestor: false, asaasFora: false, cobrancaAsaas: null, pedido: null, contratos: [], insercaoContrato: 'ok', inserts: [], vinculos: [[E, A]] })
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

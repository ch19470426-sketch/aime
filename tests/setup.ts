import { vi } from 'vitest'
import { mundo } from './helpers'

// Variáveis falsas: nenhuma chave real é usada nos testes.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'
process.env.RESEND_API_KEY = 're_x'
process.env.ASAAS_AMBIENTE = 'producao'
process.env.ASAAS_API_KEY_PRODUCAO = 'ak'

const g = globalThis as any

// A sessão do servidor (cookie ou Bearer reais) é substituída por uma sessão de teste: sessao(cpf) em helpers.ts.
vi.mock('@/lib/sessaoServidor', () => ({
  sessaoDaRequisicao: async () => (g.__SESSAO ? { cpf: g.__SESSAO, via: 'bearer' } : null),
  cpfDaSessao: async () => g.__SESSAO ?? null,
}))

// fetch falso, instalado ANTES de qualquer rota ser importada (o supabase-js guarda o fetch ao criar o cliente).
g.__CALLS = []
globalThis.fetch = (async (input: any, init: any = {}) => {
  const u = new URL(typeof input === 'string' ? input : (input.url ?? String(input)))
  const m = String(init.method || input?.method || 'GET').toUpperCase()
  g.__CALLS.push({ m, host: u.host, p: u.pathname, q: decodeURIComponent(u.search.slice(1)), b: typeof init.body === 'string' ? init.body.slice(0, 300) : '' })
  return mundo(u, m, init)
}) as any

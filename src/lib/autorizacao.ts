// src/lib/autorizacao.ts
// AIMÊ — Porteiros de acesso para as rotas de API.
//
// Por que existe: as rotas usam a chave de serviço do Supabase (que ignora as
// regras do banco) e, até aqui, confiavam no CPF enviado pelo próprio
// chamador. Quem soubesse a URL podia dar créditos, listar todos os
// inspetores, alterar o e-mail de outra pessoa, etc.
//
// CHAVE DE ATIVAÇÃO — variável de ambiente AUTH_API_ATIVA (Vercel):
//   * ausente / diferente de exatamente "true": os porteiros ficam INERTES.
//     Nada é consultado, nada é bloqueado; a rota se comporta como antes.
//   * "true": exigem sessão válida e o papel/identidade correspondente.
// Isso permite publicar o código, conferir em /api/sessao que a sessão do
// navegador é reconhecida pelo servidor, e só então ligar.
//
// Quando ligada:
//   401 = sem sessão válida (não logado / sessão expirada)
//   403 = logado, mas sem permissão para aquilo

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { ehGestor } from '@/lib/creditos'

export function autorizacaoAtiva(): boolean {
  return process.env.AUTH_API_ATIVA === 'true'
}

export type Acesso =
  | { ok: true; ativa: boolean; cpf: string | null; gestor: boolean }
  | { ok: false; resposta: NextResponse }

const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '')

const negar = (status: 401 | 403, erro: string): Acesso =>
  ({ ok: false, resposta: NextResponse.json({ erro }, { status }) })

const SEM_SESSAO = 'Sessão inválida ou expirada. Entre novamente.'
const SEM_PERMISSAO = 'Acesso negado.'

/** Qualquer usuário logado. */
export async function exigirSessao(request: NextRequest): Promise<Acesso> {
  if (!autorizacaoAtiva()) return { ok: true, ativa: false, cpf: null, gestor: false }
  const s = await sessaoDaRequisicao(request)
  if (!s) return negar(401, SEM_SESSAO)
  return { ok: true, ativa: true, cpf: s.cpf, gestor: (await ehGestor(s.cpf)) === true }
}

/** Somente gestor (inspetor.is_gestor = true). */
export async function exigirGestor(request: NextRequest): Promise<Acesso> {
  if (!autorizacaoAtiva()) return { ok: true, ativa: false, cpf: null, gestor: false }
  const s = await sessaoDaRequisicao(request)
  if (!s) return negar(401, SEM_SESSAO)
  // Se não der para confirmar o papel, nega: liberar por engano é pior.
  if ((await ehGestor(s.cpf)) !== true) return negar(403, SEM_PERMISSAO)
  return { ok: true, ativa: true, cpf: s.cpf, gestor: true }
}

/**
 * Só o próprio titular do CPF `cpfAlvo` (nem o gestor).
 * Desligada: devolve o próprio cpfAlvo (só dígitos), como as rotas já usavam.
 */
export async function exigirProprio(request: NextRequest, cpfAlvo: unknown): Promise<Acesso> {
  const alvo = soDigitos(cpfAlvo)
  if (!autorizacaoAtiva()) return { ok: true, ativa: false, cpf: alvo || null, gestor: false }
  const s = await sessaoDaRequisicao(request)
  if (!s) return negar(401, SEM_SESSAO)
  if (!alvo || s.cpf !== alvo) return negar(403, SEM_PERMISSAO)
  return { ok: true, ativa: true, cpf: s.cpf, gestor: false }
}

/** O próprio titular do CPF `cpfAlvo` OU um gestor. */
export async function exigirProprioOuGestor(request: NextRequest, cpfAlvo: unknown): Promise<Acesso> {
  const alvo = soDigitos(cpfAlvo)
  if (!autorizacaoAtiva()) return { ok: true, ativa: false, cpf: alvo || null, gestor: false }
  const s = await sessaoDaRequisicao(request)
  if (!s) return negar(401, SEM_SESSAO)
  if (alvo && s.cpf === alvo) return { ok: true, ativa: true, cpf: s.cpf, gestor: false }
  if ((await ehGestor(s.cpf)) === true) return { ok: true, ativa: true, cpf: s.cpf, gestor: true }
  return negar(403, SEM_PERMISSAO)
}

// ─────────────── Dono de arquivo de vistoria e de chave de inspetor ───────────────
// As rotas de vistoria identificam o inspetor pela CHAVE (INS-nnn, sequencial e fácil de adivinhar) e guardam arquivos
// cujo nome começa com ela ("INS-001_<cnpj>_<serviço>_<nº>.json"). Antes, qualquer usuário logado lia, apagava e
// homologava os arquivos de outro bastando conhecer a chave. Agora a chave (ou o nome do arquivo) tem de ser a de quem
// está logado. Nas telas, quando a URL não traz a chave, o CPF é usado no lugar dela, então o CPF do logado também vale
// como prefixo. No fluxo elétrico o eletricista abre a vistoria com a PRÓPRIA chave, então a mesma regra se aplica.

const mesmo = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase()

/** Chave de inspetor (INS-nnn) do CPF, ou null se não der para confirmar. */
async function chaveDoInspetor(cpf: string): Promise<string | null> {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await sb.from('inspetor').select('chave_inspetor').eq('cpf_inspetor', cpf).maybeSingle()
    if (error) { console.error('[autorizacao] chave do inspetor:', error.message); return null }
    const chave = data?.chave_inspetor ? String(data.chave_inspetor).trim() : ''
    return chave || null
  } catch (e) { console.error('[autorizacao] chave do inspetor exceção:', e); return null }
}

/** A chave pedida (INS-nnn, ou o CPF usado no lugar dela) é a do usuário logado. Não vale para o gestor. */
export async function exigirChaveDoProprio(request: NextRequest, chaveAlvo: unknown): Promise<Acesso> {
  if (!autorizacaoAtiva()) return { ok: true, ativa: false, cpf: null, gestor: false }
  const s = await sessaoDaRequisicao(request)
  if (!s) return negar(401, SEM_SESSAO)
  const alvo = String(chaveAlvo ?? '').trim()
  if (!alvo) return negar(403, SEM_PERMISSAO)
  if (soDigitos(alvo) === s.cpf && soDigitos(alvo) === alvo) return { ok: true, ativa: true, cpf: s.cpf, gestor: false }
  const chave = await chaveDoInspetor(s.cpf)
  if (!chave || !mesmo(chave, alvo)) return negar(403, SEM_PERMISSAO)
  return { ok: true, ativa: true, cpf: s.cpf, gestor: false }
}

/**
 * O arquivo `nome` (dentro de vistorias/ ou vistorias_homologadas/) pertence ao usuário logado: o nome começa com a
 * chave dele (ou o CPF) seguida de "_". Nomes com pasta (barra ou contrabarra) ou ".." são recusados.
 */
export async function exigirArquivoDoProprio(request: NextRequest, nome: unknown): Promise<Acesso> {
  if (!autorizacaoAtiva()) return { ok: true, ativa: false, cpf: null, gestor: false }
  const s = await sessaoDaRequisicao(request)
  if (!s) return negar(401, SEM_SESSAO)
  const n = String(nome ?? '')
  if (!n || n.includes('/') || n.includes('\\') || n.includes('..')) return negar(403, SEM_PERMISSAO)
  if (n.toUpperCase().startsWith(`${s.cpf}_`)) return { ok: true, ativa: true, cpf: s.cpf, gestor: false }
  const chave = await chaveDoInspetor(s.cpf)
  if (!chave || !n.toUpperCase().startsWith(`${chave.toUpperCase()}_`)) return negar(403, SEM_PERMISSAO)
  return { ok: true, ativa: true, cpf: s.cpf, gestor: false }
}

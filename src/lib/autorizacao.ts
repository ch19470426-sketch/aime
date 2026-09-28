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

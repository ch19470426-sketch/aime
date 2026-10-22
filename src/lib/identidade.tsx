'use client'
// src/lib/identidade.tsx
// AIMÊ — Identidade do usuário logado nas telas, SEM passar pela URL (pedido do marketing: CPF fora da URL, LGPD e política do Google Analytics).
//
// Antes, cada tela lia cpf_inspetor, chave_inspetor, cpf e chave da URL (?cpf_inspetor=...). Agora a identidade vem da SESSÃO: o login do usuário é
// <cpf>@aime-app.com.br, e a chave do inspetor é o próprio CPF (desde a migração de 13/10/2026). As telas continuam chamando params.get('cpf_inspetor')
// como antes, mas com useParametros() no lugar de useSearchParams(): o valor sai daqui.
//
// O que a URL AINDA pode trazer: o CPF de OUTRA pessoa, nos fluxos do gestor (vendo o cadastro de um inspetor) e do profissional de apoio (agindo sobre o
// inspetor civil). Isso sai na Fase 2. O servidor confere o dono de qualquer jeito (403 se não for o próprio, o vinculado ou o gestor).

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const DOMINIO_LOGIN = '@aime-app.com.br'
// Telas sem login: não leem a identidade e não podem esperar a sessão.
const TELAS_PUBLICAS = ['/', '/nova-senha', '/recuperar-senha', '/logout']

/** O CPF (só dígitos) de quem está logado, a partir do e-mail de login. Vazio se não houver sessão ou se o e-mail não for o do AIMÊ. */
export function cpfDoLogin(email?: string | null): string {
  if (!email || !email.toLowerCase().endsWith(DOMINIO_LOGIN)) return ''
  return email.slice(0, email.length - DOMINIO_LOGIN.length).replace(/\D/g, '')
}

const soDigitos = (v: string | null) => (v ?? '').replace(/\D/g, '')

// O gestor vendo o cadastro de OUTRO inspetor: o CPF dele fica guardado só nesta aba (sessionStorage), não na URL (/inspetor?visualizar=1).
const CHAVE_ALVO = 'aime_alvo_cpf'
export function guardarAlvo(cpf: string) { try { sessionStorage.setItem(CHAVE_ALVO, soDigitos(cpf)) } catch { /* sem armazenamento */ } }
function lerAlvo(): string { try { return sessionStorage.getItem(CHAVE_ALVO) ?? '' } catch { return '' } }

// O profissional de apoio (vistoria 39) agindo sobre o inspetor CIVIL: o CPF do civil também fica só na aba. O link leva o marcador sobre_civil=1.
const CHAVE_CIVIL = 'aime_civil_cpf'
export function guardarCivil(cpf: string) { try { sessionStorage.setItem(CHAVE_CIVIL, soDigitos(cpf)) } catch { /* sem armazenamento */ } }
function lerCivil(): string { try { return sessionStorage.getItem(CHAVE_CIVIL) ?? '' } catch { return '' } }

// O estabelecimento atendido (CNPJ, ou CPF quando o cliente é pessoa física) e o documento aberto em Homologar produto também ficam só na aba: o endereço não
// carrega o documento do cliente. Quem ESCOLHE o cliente (painel, vistoria elétrica, seleção da homologação elétrica) o guarda; as telas seguintes o leem por
// useParametros() como se ainda viesse na URL (cnpjoucpf, nome_arquivo). Uma aba por trabalho: duas abas, dois clientes, sem se misturar.
const CHAVE_ESTAB = 'aime_estab_cnpjoucpf'
const CHAVE_DOC = 'aime_doc_atual'
export function guardarEstabelecimento(doc: string) { try { sessionStorage.setItem(CHAVE_ESTAB, soDigitos(doc)) } catch { /* sem armazenamento */ } }
export function guardarDocumento(nome: string) { try { sessionStorage.setItem(CHAVE_DOC, String(nome ?? '')) } catch { /* sem armazenamento */ } }
function lerEstab(): string { try { return sessionStorage.getItem(CHAVE_ESTAB) ?? '' } catch { return '' } }
function lerDoc(): string { try { return sessionStorage.getItem(CHAVE_DOC) ?? '' } catch { return '' } }

/**
 * Resolve os parâmetros de identidade de uma tela. PURA (testável).
 *  - chave_inspetor e chave: SEMPRE o próprio usuário (a chave é o CPF dele; no fluxo do profissional de apoio, também é a dele).
 *  - cpf_eletrico: o próprio usuário, mas só nos fluxos do profissional de apoio, marcados por apoio=1 (ou pelo parâmetro antigo).
 *  - cpf_inspetor e cpf: o próprio usuário, EXCETO quando a URL traz OUTRA pessoa (profissional de apoio, Fase 2) ou quando o gestor está vendo o cadastro de
 *    outro inspetor (visualizar=1): aí o cpf é o alvo guardado na aba.
 *  - cnpjoucpf e nome_arquivo: o que a URL trouxer (link antigo); senão, o estabelecimento e o documento guardados na aba por quem os escolheu.
 *  - sobre_civil=1 (vistoria 39): cpf_inspetor é o do inspetor civil, guardado na aba por guardarCivil; a URL não escolhe quem é.
 * O CPF de alguém na URL nunca dá acesso a nada: o servidor confere o dono em toda chamada.
 */
export function resolverParametros(url: URLSearchParams, cpfLogado: string, alvo = '', civil = '', estab = '', doc = ''): URLSearchParams {
  const p = new URLSearchParams(url.toString())
  if (!cpfLogado) return p
  p.set('chave_inspetor', cpfLogado)
  p.set('chave', cpfLogado)
  if (url.get('apoio') === '1' || url.has('cpf_eletrico')) p.set('cpf_eletrico', cpfLogado)
  else p.delete('cpf_eletrico')
  for (const nome of ['cpf_inspetor', 'cpf']) {
    if (nome === 'cpf' && url.get('visualizar') === '1' && soDigitos(alvo)) { p.set('cpf', soDigitos(alvo)); continue }   // gestor vendo outro inspetor
    const daUrl = soDigitos(url.get(nome))
    if (!daUrl || daUrl === cpfLogado) p.set(nome, cpfLogado)
  }
  // Profissional de apoio agindo sobre o inspetor civil: cpf_inspetor é o do CIVIL (guardado na aba), e a URL não escolhe quem é. Sem civil guardado (aba nova,
  // link colado), não há quem vistoriar: cpf_inspetor fica vazio e o profissional volta à tela de escolha.
  // Estabelecimento atendido e documento aberto: o que a URL traz (link antigo) vale; sem isso, o que está guardado na aba.
  if (!url.get('cnpjoucpf') && soDigitos(estab)) p.set('cnpjoucpf', soDigitos(estab))
  if (!url.get('nome_arquivo') && !url.get('nome') && doc) p.set('nome_arquivo', doc)
  if (url.get('sobre_civil') === '1') {
    const c = soDigitos(civil)
    if (c) p.set('cpf_inspetor', c)
    else p.delete('cpf_inspetor')
  }
  return p
}

const IdentidadeCtx = createContext<{ cpf: string }>({ cpf: '' })

export function IdentidadeProvider({ children }: { children: ReactNode }) {
  const caminho = usePathname() ?? '/'
  const [estado, setEstado] = useState<{ cpf: string; pronto: boolean }>({ cpf: '', pronto: false })

  useEffect(() => {
    const supabase = createClient()
    let vivo = true
    supabase.auth.getSession()
      .then(({ data }) => { if (vivo) setEstado({ cpf: cpfDoLogin(data.session?.user?.email), pronto: true }) })
      .catch(() => { if (vivo) setEstado({ cpf: '', pronto: true }) })
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!sessao) { try { sessionStorage.removeItem(CHAVE_ALVO); sessionStorage.removeItem(CHAVE_CIVIL); sessionStorage.removeItem(CHAVE_ESTAB); sessionStorage.removeItem(CHAVE_DOC) } catch { /* ok */ } }   // saiu: esquece o inspetor que o gestor via e o civil do profissional de apoio
      if (vivo) setEstado({ cpf: cpfDoLogin(sessao?.user?.email), pronto: true })
    })
    return () => { vivo = false; assinatura.subscription.unsubscribe() }
  }, [])

  // Telas com login esperam a sessão (leitura local, milissegundos) para já nascerem com a identidade; as públicas aparecem de imediato.
  if (!estado.pronto && !TELAS_PUBLICAS.includes(caminho)) return null
  return <IdentidadeCtx.Provider value={{ cpf: estado.cpf }}>{children}</IdentidadeCtx.Provider>
}

/** No lugar de useSearchParams(): igual, mas a identidade do próprio usuário vem da sessão e não da URL. */
export function useParametros(): URLSearchParams {
  const real = useSearchParams()
  const { cpf } = useContext(IdentidadeCtx)
  return useMemo(() => resolverParametros(new URLSearchParams(real?.toString() ?? ''), cpf, lerAlvo(), lerCivil(), lerEstab(), lerDoc()), [real, cpf])
}

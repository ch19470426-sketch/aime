// src/hooks/useAuth.ts
// AIMÊ — Hook de proteção de rota: verifica sessão ativa via Supabase Auth
// Uso: const { cpfInspetor, chaveInspetor, carregando } = useAuth()
// Se não estiver logado, redireciona para / automaticamente

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

export function useAuth() {
  const [carregando, setCarregando]         = useState(true)
  const [cpfInspetor, setCpfInspetor]       = useState('')
  const [chaveInspetor, setChaveInspetor]   = useState('')
  const [tituloProfissional, setTitulo]     = useState('')

  useEffect(() => {
    async function verificar() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.email) {
          window.location.href = '/'
          return
        }
        const cpf = session.user.email.split('@')[0]
        const res = await fetch(
          `${SUPA_URL}/rest/v1/inspetor?cpf_inspetor=eq.${cpf}&select=cpf_inspetor,chave_inspetor,titulo_profissional`,
          { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } }
        )
        const dados = await res.json()
        if (!Array.isArray(dados) || dados.length === 0) {
          window.location.href = `/?cpf=${cpf}`
          return
        }
        setCpfInspetor(dados[0].cpf_inspetor)
        setChaveInspetor(dados[0].chave_inspetor ?? '')
        setTitulo(dados[0].titulo_profissional ?? '')
      } catch {
        window.location.href = '/'
      } finally {
        setCarregando(false)
      }
    }
    verificar()
  }, [])

  return { carregando, cpfInspetor, chaveInspetor, tituloProfissional }
}

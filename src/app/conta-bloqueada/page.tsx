'use client'
// src/app/conta-bloqueada/page.tsx
// AIMÊ — Tela para quem está com a conta bloqueada (estorno, chargeback ou cartão recusado 3 vezes seguidas).
// O dashboard leva para cá quando o servidor informa que a conta está bloqueada. Só o gestor desbloqueia
// (Painel do Gestor, aba "Contas bloqueadas"); se a conta for liberada, esta tela leva de volta ao menu.

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import LinkSair from '@/components/LinkSair'
import VersaoBuild from '@/components/VersaoBuild'
import { createClient } from '@/utils/supabase/client'
import { TEXTO_MOTIVO } from '@/lib/textosBloqueio'

const EMAIL_SUPORTE = 'suporte@aime.eng.br'

function Conteudo() {
  const params = useSearchParams()
  const [cpf, setCpf] = useState(params.get('cpf') ?? '')
  const [motivo, setMotivo] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)
  const [aviso, setAviso] = useState('')

  // A sessão é a fonte confiável do CPF (a URL pode vir sem ele).
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email
      if (email) setCpf(email.split('@')[0])
    }).catch(() => { /* segue com o CPF da URL */ })
  }, [])

  async function verificar(manual = false) {
    if (!cpf) return
    setVerificando(true); setAviso('')
    try {
      const res = await fetch(`/api/tem-contrato?cpf_inspetor=${cpf}&_=${Date.now()}`, { cache: 'no-store' })
      const d = await res.json()
      if (d.bloqueada === false) { window.location.href = '/dashboard'; return }
      setMotivo(d.bloqueioMotivo ?? null)
      if (manual) setAviso('Sua conta ainda está bloqueada. Fale com a nossa equipe para regularizar.')
    } catch { if (manual) setAviso('Não foi possível verificar agora. Tente de novo em instantes.') }
    setVerificando(false)
  }
  useEffect(() => { if (cpf) verificar() }, [cpf]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ backgroundColor: '#E8EEF7', minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '520px', width: '100%', overflow: 'hidden', boxShadow: '0 4px 24px rgba(30,58,138,0.12)' }}>
        <div style={{ backgroundColor: '#1E3A8A', color: 'white', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={40} style={{ objectFit: 'contain' }} />
          <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '14px' }}>Conta bloqueada</span>
          <LinkSair />
        </div>
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          <Image src="/mie_informa.png" alt="Miê" width={120} height={120} style={{ margin: '0 auto 12px', objectFit: 'contain' }} />
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E3A8A', marginBottom: '10px' }}>Sua conta está bloqueada</div>
          {motivo && <p data-motivo style={{ fontSize: '12px', color: '#374151', margin: '0 0 10px', lineHeight: 1.6 }}>{TEXTO_MOTIVO[motivo] ?? ''}</p>}
          <p style={{ fontSize: '12px', color: '#374151', margin: '0 0 16px', lineHeight: 1.6 }}>
            Enquanto estiver bloqueada, não é possível iniciar serviços nem contratar créditos. Para regularizar, fale com a nossa equipe.
          </p>
          {aviso && <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', backgroundColor: '#FFFBEB', color: '#92400E', marginBottom: '12px', lineHeight: 1.5 }}>{aviso}</div>}
          <a href={`mailto:${EMAIL_SUPORTE}?subject=${encodeURIComponent('Conta bloqueada — pedido de regularização')}`}
            style={{ display: 'inline-block', backgroundColor: '#1E3A8A', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '12px', padding: '10px 24px', borderRadius: '9999px', marginRight: '8px' }}>
            Falar com o suporte
          </a>
          <button onClick={() => verificar(true)} disabled={verificando}
            style={{ backgroundColor: 'white', color: '#1E3A8A', border: '1px solid #1E3A8A', fontWeight: 700, fontSize: '12px', padding: '9px 20px', borderRadius: '9999px', cursor: verificando ? 'not-allowed' : 'pointer', opacity: verificando ? 0.6 : 1 }}>
            {verificando ? 'Verificando...' : 'Já fui liberado'}
          </button>
        </div>
      </div>
      <VersaoBuild />
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={null}><Conteudo /></Suspense>
}

"use client"
import { createClient } from "@/utils/supabase/client"

export default function BetaEncerradoPage() {
  async function sairEEntrarComOutraConta() {
    try { await createClient().auth.signOut() } catch {}
    window.location.href = "/"
  }

  return (
    <div style={{ backgroundColor: '#1E3A8A', minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px 32px',
        maxWidth: '480px', width: '100%', textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <img src="/logo.png" alt="AIMÊ" style={{ height: '48px', marginBottom: '24px' }} />
        <h1 style={{ color: '#1E3A8A', fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
          Período de Homologação Encerrado
        </h1>
        <p style={{ color: '#374151', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px' }}>
          O ambiente de homologação beta do <strong>AIMÊ</strong> foi encerrado em 30/09/2026.
        </p>
        <p style={{ color: '#374151', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px' }}>
          Para acesso ao ambiente de produção ou informações sobre o serviço,
          entre em contato com o administrador do sistema.
        </p>
        {/* Sem isto, quem cai aqui com uma sessão antiga fica preso — sem
            nenhum caminho visível para sair ou tentar outra conta (nem a
            tela de login aparece). Achado de Celso, 01/10/2026. */}
        <button onClick={sairEEntrarComOutraConta}
          style={{ backgroundColor: '#1E3A8A', color: 'white', fontWeight: 600, padding: '10px 28px',
            borderRadius: '50px', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px' }}>
          Sair e entrar com outra conta
        </button>
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px',
          fontSize: '11px', color: '#9CA3AF' }}>
          Mapeamento Inteligente de Edificações e Equipamentos
        </div>
      </div>
    </div>
  )
}

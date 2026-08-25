export default function BetaEncerradoPage() {
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
        <p style={{ color: '#374151', fontSize: '14px', lineHeight: 1.7, marginBottom: '32px' }}>
          Para acesso ao ambiente de produção ou informações sobre o serviço,
          entre em contato com o administrador do sistema.
        </p>
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px',
          fontSize: '11px', color: '#9CA3AF' }}>
          Mapeamento Inteligente de Edificações e Equipamentos
        </div>
      </div>
    </div>
  )
}

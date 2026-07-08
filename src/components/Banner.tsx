// src/components/Banner.tsx
// AIMÊ — Banner de comunicação com o inspetor
// Modal overlay reutilizável com mascote variável

'use client'

import Image from 'next/image'

export type BannerTipo = 'informa' | 'orienta' | 'agradece' | 'solicita'

export interface BannerCampo {
  id: string
  label: string
  tipo?: 'text' | 'number' | 'email' | 'tel'
  placeholder?: string
  obrigatorio?: boolean
}

export interface BannerBotao {
  label: string
  acao: () => void
  estilo?: 'primario' | 'secundario'
}

export interface BannerProps {
  visivel: boolean
  tipo: BannerTipo
  titulo: string
  mensagem: string
  botoes?: BannerBotao[]
  campos?: BannerCampo[]
  valoresCampos?: Record<string, string>
  onChangeCampo?: (id: string, valor: string) => void
}

const MASCOTE: Record<BannerTipo, string> = {
  informa:  '/mie_informa.png',
  orienta:  '/mie_orienta.png',
  agradece: '/mie_obridado.png',
  solicita: '/mie_solicita.png',
}

const TITULO_COR: Record<BannerTipo, string> = {
  informa:  '#1E3A8A',
  orienta:  '#1E3A8A',
  agradece: '#16A34A',
  solicita: '#D97706',
}

export default function Banner({
  visivel,
  tipo,
  titulo,
  mensagem,
  botoes = [],
  campos = [],
  valoresCampos = {},
  onChangeCampo,
}: BannerProps) {
  if (!visivel) return null

  const corTitulo = TITULO_COR[tipo]

  return (
    <div style={S.overlay}>
      <div style={S.card}>

        {/* Header */}
        <div style={S.header}>
          <Image
            src="/logo.png"
            alt="AIMÊ"
            width={80}
            height={32}
            style={{ filter: 'brightness(0) invert(1)', objectFit: 'contain' }}
          />
          <span style={S.headerTitulo}>Mapeamento Inteligente de Edificações e Equipamentos</span>
        </div>
        <div style={S.divisor} />

        {/* Corpo */}
        <div style={S.corpo}>

          {/* Mascote */}
          <div style={S.mascoteWrap}>
            <Image
              src={MASCOTE[tipo]}
              alt="Mie"
              width={120}
              height={120}
              style={{ objectFit: 'contain' }}
            />
          </div>

          {/* Conteúdo */}
          <div style={S.conteudo}>
            <h2 style={{ ...S.tituloMsg, color: corTitulo }}>{titulo}</h2>
            <p style={S.mensagemTxt}>{mensagem}</p>

            {/* Campos opcionais (máx 3) */}
            {campos.length > 0 && (
              <div style={S.campos}>
                {campos.slice(0, 3).map((campo) => (
                  <div key={campo.id} style={S.campoWrap}>
                    <label style={S.campoLabel}>
                      {campo.label}{campo.obrigatorio ? ' *' : ''}
                    </label>
                    <input
                      type={campo.tipo ?? 'text'}
                      placeholder={campo.placeholder ?? ''}
                      value={valoresCampos[campo.id] ?? ''}
                      onChange={(e) => onChangeCampo?.(campo.id, e.target.value)}
                      style={S.campoInput}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Botões */}
            {botoes.length > 0 && (
              <div style={S.botoes}>
                {botoes.map((btn, i) => (
                  <button
                    key={i}
                    onClick={btn.acao}
                    style={btn.estilo === 'secundario' ? S.btnSec : S.btnPri}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '480px',
    overflow: 'hidden',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  header: {
    backgroundColor: '#1E3A8A',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerTitulo: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: '11px',
    flex: 1,
    textAlign: 'center',
  },
  divisor: {
    height: '2px',
    backgroundColor: '#1E3A8A',
  },
  corpo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '20px',
  },
  mascoteWrap: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: {
    flex: 1,
  },
  tituloMsg: {
    fontSize: '15px',
    fontWeight: 700,
    margin: '0 0 8px',
  },
  mensagemTxt: {
    fontSize: '13px',
    color: '#374151',
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  campos: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  campoWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  campoLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
  },
  campoInput: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  botoes: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  btnPri: {
    backgroundColor: '#1E3A8A',
    color: 'white',
    border: 'none',
    borderRadius: '9999px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  btnSec: {
    backgroundColor: 'white',
    color: '#1E3A8A',
    border: '2px solid #1E3A8A',
    borderRadius: '9999px',
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}

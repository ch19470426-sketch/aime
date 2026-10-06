// src/components/BlocoAssinatura.tsx
// AIMÊ — Bloco "Assinatura mensal" da tela Meu Plano e Créditos (etapa 2 das assinaturas).
// Mostra a situação da assinatura em andamento e os botões de ação. Só apresentação: quem
// chama cuida de falar com a API (/api/creditos/assinatura) e de confirmar o cancelamento.

import type { CSSProperties } from 'react'

export type AssinaturaStatus = {
  tipo: string
  status: string                    // 'ativa' | 'inadimplente' | 'aguardando_primeiro_pagamento'
  valor: number                     // em reais
  proximaCobranca: string | null    // 'DD/MM/AAAA'
}

const NOMES: Record<string, string> = { 'PLANO MENSAL': 'Plano Mensal', 'PLANO ESCRITÓRIO': 'Plano Escritório' }
const dinheiro = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const botao = (cor: string, preenchido: boolean, ocupado: boolean): CSSProperties => ({
  padding: '7px 18px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700,
  cursor: ocupado ? 'not-allowed' : 'pointer', opacity: ocupado ? 0.6 : 1,
  border: `1px solid ${cor}`, backgroundColor: preenchido ? cor : 'white', color: preenchido ? 'white' : cor,
})

export default function BlocoAssinatura({ assinatura, ocupado, onCancelar, onRetomar }: {
  assinatura: AssinaturaStatus | null | undefined
  ocupado: boolean
  onCancelar: () => void
  onRetomar: () => void            // "Concluir pagamento" / "Assinar novamente"
}) {
  if (!assinatura) return null
  const nome = NOMES[assinatura.tipo] ?? assinatura.tipo
  const ativa = assinatura.status === 'ativa'
  const pendente = assinatura.status === 'inadimplente'
  const aguardando = assinatura.status === 'aguardando_primeiro_pagamento'

  return (
    <div style={{ marginTop: '12px' }} data-bloco="assinatura">
      <div style={{ backgroundColor: '#1E3A8A', color: 'white', padding: '6px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '6px 6px 0 0' }}>
        Assinatura
      </div>
      <div style={{ border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{nome}</span>
          <span style={{ fontSize: '12px', color: '#4B5563' }}>{dinheiro(assinatura.valor)} por mês</span>
          <span style={{
            padding: '2px 10px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, color: 'white',
            backgroundColor: ativa ? '#059669' : pendente ? '#D97706' : '#6B7280',
          }}>
            {ativa ? 'Ativa' : pendente ? 'Pagamento pendente' : 'Aguardando 1º pagamento'}
          </span>
        </div>

        {ativa && (
          <p style={{ fontSize: '12px', color: '#374151', margin: '0 0 10px', lineHeight: 1.5 }}>
            {assinatura.proximaCobranca ? <>Próxima cobrança: <b>{assinatura.proximaCobranca}</b>, no cartão cadastrado. </> : null}
            Os créditos do mês são liberados a cada pagamento confirmado.
          </p>
        )}
        {pendente && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '12px', backgroundColor: '#FFFBEB', color: '#92400E', marginBottom: '10px', lineHeight: 1.5 }}>
            Não conseguimos cobrar a última mensalidade, e por isso os créditos deste mês não foram liberados.
            Enviamos um e-mail com o link para regularizar; se preferir, assine novamente por aqui ou cancele.
          </div>
        )}
        {aguardando && (
          <p style={{ fontSize: '12px', color: '#374151', margin: '0 0 10px', lineHeight: 1.5 }}>
            Falta concluir o primeiro pagamento no cartão para a assinatura começar.
          </p>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(pendente || aguardando) && (
            <button type="button" onClick={onRetomar} disabled={ocupado} style={botao('#059669', true, ocupado)}>
              {pendente ? 'Assinar novamente' : 'Concluir pagamento'}
            </button>
          )}
          <button type="button" onClick={onCancelar} disabled={ocupado} style={botao('#DC2626', false, ocupado)}>
            Cancelar assinatura
          </button>
        </div>
      </div>
    </div>
  )
}

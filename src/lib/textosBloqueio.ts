// src/lib/textosBloqueio.ts
// AIMÊ — Textos e limite do bloqueio de conta. Sem dependências de servidor: a tela "Conta bloqueada"
// (navegador) e o servidor usam os mesmos textos.

export const LIMITE_FALHAS_CARTAO = 3

export const TEXTO_MOTIVO: Record<string, string> = {
  estorno: 'Um pagamento da sua conta foi estornado.',
  chargeback: 'Um pagamento da sua conta foi contestado junto ao banco ou à operadora do cartão (chargeback).',
  cartao_recusado: `O cartão da sua assinatura foi recusado em ${LIMITE_FALHAS_CARTAO} cobranças seguidas.`,
}

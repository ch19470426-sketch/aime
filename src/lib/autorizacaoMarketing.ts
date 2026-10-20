// src/lib/autorizacaoMarketing.ts
// AIMÊ — Autorização do inspetor para o uso dos dados cadastrais em publicidade e promoções (opcional, retirada a qualquer momento em Meu Cadastro).
// Função pura, usada pela tela e pelas rotas. Guarda a DATA da decisão e a VERSÃO do texto aceito: se o texto mudar, muda a versão.

/** Mudar sempre que o texto abaixo mudar. */
export const VERSAO_AUTORIZACAO_MARKETING = '2026-10-v1'

export const TEXTO_AUTORIZACAO_MARKETING =
  'Autorizo o AIMÊ a usar meus dados cadastrais (nome, e-mail e WhatsApp) para fins de publicidade e envio de promoções. ' +
  'Esta autorização é opcional e pode ser retirada a qualquer momento em Meu Cadastro (item 6.2).'

/** Colunas da tabela inspetor para registrar a decisão: o instante dela e a versão do texto aceito (só quando autoriza; ao retirar, a versão some). */
export function camposDaAutorizacao(autoriza: boolean, agora: Date = new Date()) {
  return {
    autoriza_marketing: autoriza,
    autoriza_marketing_em: agora.toISOString(),
    autoriza_marketing_versao: autoriza ? VERSAO_AUTORIZACAO_MARKETING : null,
  }
}

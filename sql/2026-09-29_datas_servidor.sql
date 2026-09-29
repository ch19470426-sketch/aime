-- AIMÊ — Datas confiáveis: servidor, não navegador do usuário
-- Data: 29/09/2026
--
-- Contexto: dados_vistoria.data_homologacao apareceu com data um mês no
-- futuro (10/09 vistoria, 09/10 homologação) — confirmado, contra o
-- created_at do próprio arquivo no Storage, que a homologação real ocorreu
-- em 09/09/2026. Causa raiz: o valor era calculado com new Date() no
-- navegador do usuário/testador, sem nenhuma validação do servidor —
-- qualquer relógio de aparelho desconfigurado corrompe o dado.
--
-- Esta migração cobre os 2 campos que são gravados via fetch direto do
-- navegador para o Supabase (sem passar por uma rota Next.js própria), onde
-- um DEFAULT no próprio banco é a defesa adequada. Os outros 2 campos com o
-- mesmo problema (estabelecimento.data_cadastro, historico_valores.data_hora)
-- já passavam por rotas Next.js e foram corrigidos só no código dessas
-- rotas (src/app/api/salvar-estabelecimento e /api/registrar-historico),
-- sem necessidade de alteração no banco.
--
-- O código correspondente (commit 747e10c) parou de enviar estes 2 campos
-- no corpo da requisição, deixando o banco preenchê-los sozinho.

ALTER TABLE dados_vistoria
  ALTER COLUMN data_homologacao SET DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date);

ALTER TABLE ativos_a_vistoriar
  ALTER COLUMN data_cadastro SET DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo');

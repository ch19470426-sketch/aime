-- AIMÊ — Autorização do inspetor para o uso dos dados em publicidade e promoções
-- Data: 16/10/2026 — pedido de Celso
--
-- Três colunas novas em public.inspetor. O padrão é NÃO autorizado (opt-in): ninguém, nem quem já é cadastrado, passa a constar como autorizado.
--   autoriza_marketing          verdadeiro só se o inspetor marcou a caixa (Cadastro Inicial) ou em Meu Cadastro (item 6.2)
--   autoriza_marketing_em       instante da última decisão (autorizou ou retirou)
--   autoriza_marketing_versao   versão do texto aceito (nula quando não autoriza)
-- Idempotente. Executar ANTES de publicar o código novo (o código grava estas colunas quando o inspetor marca a caixa).
-- Desfazer: alter table public.inspetor drop column autoriza_marketing, drop column autoriza_marketing_em, drop column autoriza_marketing_versao;

alter table public.inspetor
  add column if not exists autoriza_marketing boolean not null default false,
  add column if not exists autoriza_marketing_em timestamptz,
  add column if not exists autoriza_marketing_versao text;

-- Conferência: deve mostrar as três colunas.
select column_name, data_type, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name = 'inspetor' and column_name like 'autoriza_marketing%'
 order by column_name;

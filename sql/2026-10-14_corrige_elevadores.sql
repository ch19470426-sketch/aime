-- AIMÊ — Corrige o erro de digitação "elvadores" para "elevadores" no nome do sistema 10 (10-Acessibilidade/elevadores)
-- Data: 14/10/2026 — pedido de Celso
--
-- O código já foi corrigido (laudo) e o laudo continua reconhecendo o nome antigo nos dados que ficaram gravados assim.
-- Rodar em DUAS etapas no SQL Editor do Supabase (cada uma numa query nova).
--
-- ETAPA 1 (só leitura): mostra em quais tabelas e colunas o erro aparece e quantas linhas.
select table_name, column_name, qtd
from (
  select c.table_name, c.column_name,
         (xpath('/row/c/text()', query_to_xml(
            format('select count(*) as c from public.%I where %I::text ilike %L', c.table_name, c.column_name, '%elvadores%'),
            false, true, '')))[1]::text::int as qtd
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
   where c.table_schema = 'public' and c.data_type in ('text', 'character varying')
) x
where qtd > 0
order by table_name, column_name;

-- ETAPA 2 (corrige as duas tabelas que o código usa e devolve quantas linhas mudou em cada uma):
-- with a as (
--   update public.sistemas_construtivos set sistema = regexp_replace(sistema, 'elvadores', 'elevadores', 'gi')
--    where sistema ilike '%elvadores%' returning 1
-- ), b as (
--   update public.dados_vistoria set sistema_vistoria = regexp_replace(sistema_vistoria, 'elvadores', 'elevadores', 'gi')
--    where sistema_vistoria ilike '%elvadores%' returning 1
-- )
-- select (select count(*) from a) as sistemas_construtivos, (select count(*) from b) as dados_vistoria;
--
-- Se a ETAPA 1 mostrar o erro em OUTRAS tabelas, avisar antes de corrigi-las.

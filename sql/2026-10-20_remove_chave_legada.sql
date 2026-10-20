-- AIMÊ — Remove a coluna inspetor.chave_legada (sobra da migração da chave INS-nnn para o CPF)
-- Data: 20/10/2026 — pedido de Celso
--
-- A migração foi feita em 13/10/2026 (sql/2026-10-13_chave_inspetor_igual_cpf.sql + rota temporária, já removida do código). A coluna guardava
-- a chave antiga INS-nnn de cada cadastro, só para a migração dos arquivos. Passada uma semana de uso normal, ela não serve mais.
-- IRREVERSÍVEL: depois do DROP a chave antiga não existe mais no banco. Por isso a ETAPA 1 mostra o que existe, para guardar se quiser.
--
-- ETAPA 1 (só leitura): as chaves antigas que seriam perdidas.
select cpf_inspetor, chave_legada from public.inspetor where chave_legada is not null order by 1;

-- ETAPA 2 (rodar só depois de ver a etapa 1 e, se quiser, copiar o resultado):
-- alter table public.inspetor drop column if exists chave_legada;
--
-- ETAPA 3 (conferência, deve voltar vazia):
-- select column_name from information_schema.columns where table_schema = 'public' and table_name = 'inspetor' and column_name = 'chave_legada';

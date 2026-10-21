-- AIMÊ — ETAPA 2 da correção de segurança: fecha a LEITURA PÚBLICA de inspetor, estabelecimento e ativos_a_vistoriar
-- Data: 21/10/2026
--
-- ANTES: as três tabelas tinham SELECT using (true) para {public} (qualquer pessoa, sem conta). A tabela inspetor expunha e-mail, WhatsApp, CPF, CREA/CAU e
-- endereço de TODOS os inspetores; ativos_a_vistoriar ainda aceitava INSERT de qualquer um.
-- DEPOIS:
--   inspetor              cada inspetor lê SÓ o próprio cadastro (o gestor lê qualquer um)
--   estabelecimento       só quem está logado lê (o cadastro de estabelecimentos é compartilhado entre inspetores, por decisão de produto)
--   ativos_a_vistoriar    lê o dono do ativo, o gestor e o profissional de apoio VINCULADO ao inspetor (vistoria 39); a gravação é só pelo servidor
--
-- PRÉ-REQUISITO: o código com a credencial do login (commit da etapa 2) JÁ PUBLICADO. Antes dele, as telas liam com a chave pública e quebrariam.
-- Idempotente. DESFAZER: o bloco comentado no fim.

-- Funções auxiliares (schema private: não ficam expostas pela API do Supabase). O login é <cpf>@aime-app.com.br.
create or replace function private.cpf_logado()
returns text language sql stable set search_path = public as $$
  select split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1)
$$;

create or replace function private.eh_vinculado(p_cpf_civil text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.art_profissional a
                  where a.cpf_inspetor = p_cpf_civil
                    and a.cpf_eletrico = split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
$$;

revoke all on function private.cpf_logado() from public, anon;
revoke all on function private.eh_vinculado(text) from public, anon;
grant execute on function private.cpf_logado() to authenticated;
grant execute on function private.eh_vinculado(text) to authenticated;

-- inspetor: cada um lê o próprio cadastro; o gestor lê qualquer um
drop policy if exists "leitura_inspetor" on public.inspetor;
drop policy if exists "inspetor_le_o_proprio" on public.inspetor;
create policy "inspetor_le_o_proprio" on public.inspetor for select to authenticated
  using (cpf_inspetor = private.cpf_logado() or private.eh_gestor_logado());

-- estabelecimento: só logados
drop policy if exists "leitura_estabelecimento" on public.estabelecimento;
drop policy if exists "estabelecimento_le_logado" on public.estabelecimento;
create policy "estabelecimento_le_logado" on public.estabelecimento for select to authenticated using (true);

-- ativos_a_vistoriar: dono, gestor ou profissional de apoio vinculado; sem política de INSERT (grava só o servidor, pela chave de serviço)
drop policy if exists "insercao_ativos" on public.ativos_a_vistoriar;
drop policy if exists "leitura_ativos" on public.ativos_a_vistoriar;
drop policy if exists "ativos_leitura" on public.ativos_a_vistoriar;
create policy "ativos_leitura" on public.ativos_a_vistoriar for select to authenticated
  using (cpf_inspetor = private.cpf_logado() or private.eh_gestor_logado() or private.eh_vinculado(cpf_inspetor));

-- Conferência: não deve haver política de leitura para {public} nem para anon nestas três tabelas.
select tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public' and tablename in ('inspetor', 'estabelecimento', 'ativos_a_vistoriar')
 order by tablename, policyname;

-- DESFAZER (só se alguma tela deixar de funcionar; volta ao estado anterior, que é o INSEGURO):
-- drop policy if exists "inspetor_le_o_proprio" on public.inspetor;
-- create policy "leitura_inspetor" on public.inspetor for select using (true);
-- drop policy if exists "estabelecimento_le_logado" on public.estabelecimento;
-- create policy "leitura_estabelecimento" on public.estabelecimento for select using (true);
-- drop policy if exists "ativos_leitura" on public.ativos_a_vistoriar;
-- create policy "leitura_ativos" on public.ativos_a_vistoriar for select using (true);

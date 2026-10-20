-- AIMÊ — Fecha políticas de proteção por linha que estavam abertas ao público (etapa 1)
-- Data: 20/10/2026 — alerta crítico rls_disabled_in_public do Supabase e revisão das políticas (pg_policies)
--
-- ACHADO: várias políticas se chamavam "service_role" mas valiam para {public} com using (true): qualquer pessoa com o endereço do projeto e a chave pública
-- (visível no app) podia LER, ALTERAR e APAGAR contratos_inspetor (SALDOS DE CRÉDITO), planos_assinatura (PREÇOS) e criticidade_gut. Também estavam abertos para
-- escrita estabelecimento (UPDATE e INSERT), foto_contador e mensagens_suporte. O servidor usa a chave de serviço, que ignora a RLS: não precisa de política.
--
-- ETAPA 1 (esta): só o que NÃO depende de nenhuma tela. Nada do app quebra.
-- ETAPA 2 (depois de mudanças no código): inspetor, estabelecimento e ativos_a_vistoriar, que ainda são lidas direto do navegador.
-- Idempotente. Desfazer: recriar as políticas antigas (listadas no pg_policies de 20/10/2026).

-- O usuário logado é gestor? (o login é <cpf>@aime-app.com.br; SECURITY DEFINER para ler inspetor sem depender da RLS dela)
create or replace function public.eh_gestor_logado()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_gestor from public.inspetor
                    where cpf_inspetor = split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1)), false)
$$;

-- 1) Só o servidor usa estas tabelas: fechar para o público
drop policy if exists "inspetor_acessa_seu_contador" on public.foto_contador;
drop policy if exists "atualizacao_mensagens_suporte" on public.mensagens_suporte;
drop policy if exists "insercao_mensagens_suporte" on public.mensagens_suporte;
drop policy if exists "leitura_mensagens_suporte" on public.mensagens_suporte;
drop policy if exists "edicao_estabelecimento" on public.estabelecimento;
drop policy if exists "insercao_estabelecimento" on public.estabelecimento;

-- 2) Créditos: cada inspetor lê só os próprios contratos (o gestor lê todos); ninguém grava pelo navegador
drop policy if exists "pol_service_role" on public.contratos_inspetor;
drop policy if exists "contratos_leitura" on public.contratos_inspetor;
create policy "contratos_leitura" on public.contratos_inspetor for select to authenticated
  using (cpf_inspetor = split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1) or public.eh_gestor_logado());

-- 3) Planos (preços): qualquer um lê; só o gestor altera
drop policy if exists "pol_service_role" on public.planos_assinatura;
drop policy if exists "planos_leitura_publica" on public.planos_assinatura;
drop policy if exists "planos_gestor_grava" on public.planos_assinatura;
create policy "planos_leitura_publica" on public.planos_assinatura for select to anon, authenticated using (true);
create policy "planos_gestor_grava" on public.planos_assinatura for all to authenticated
  using (public.eh_gestor_logado()) with check (public.eh_gestor_logado());

-- 4) Critérios GUT: só o gestor lê e altera pelo navegador (as demais telas usam a rota do servidor)
drop policy if exists "pol_service_role" on public.criticidade_gut;
drop policy if exists "criticidade_gestor" on public.criticidade_gut;
create policy "criticidade_gestor" on public.criticidade_gut for all to authenticated
  using (public.eh_gestor_logado()) with check (public.eh_gestor_logado());

-- Conferência: não deve sobrar nenhuma política com roles {public} e using (true) nestas tabelas.
select tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public'
   and tablename in ('foto_contador', 'mensagens_suporte', 'estabelecimento', 'contratos_inspetor', 'planos_assinatura', 'criticidade_gut')
 order by tablename, policyname;

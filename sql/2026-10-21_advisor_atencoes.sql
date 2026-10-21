-- AIMÊ — Correções rápidas das atenções do Security Advisor do Supabase
-- Data: 21/10/2026 — Advisor: 0 erros, 11 atenções e 8 sugestões
--
-- 7 atenções "Function Search Path Mutable": fixa o search_path das funções, para que um objeto de mesmo nome em outro schema não possa
--   ser usado no lugar das tabelas do public. Atenção: um CREATE OR REPLACE FUNCTION desfaz isto; por isso as definições em
--   sql/2026-10-14_saldo_soma_planos_vigentes.sql já levam o SET search_path.
-- 2 atenções sobre public.eh_gestor_logado() (SECURITY DEFINER chamável pela API): a função sai do schema exposto (public) para o private.
--   As políticas que a usam continuam valendo (guardam a função pelo identificador interno). Políticas novas devem citar private.eh_gestor_logado().
-- FICAM: rls_policy_always_true em ativos_a_vistoriar (INSERT), que é a ETAPA 2 (precisa de mudança no código); e a proteção contra senhas
--   vazadas, que é uma chave em Authentication (pode exigir o plano Pro).
-- NOTA: o Advisor NÃO acusa políticas de LEITURA com using (true) (inspetor, estabelecimento, ativos_a_vistoriar): isso continua na ETAPA 2.

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as assinatura
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('saldo_creditos', 'consumir_creditos', 'fn_atualizar_foto_contador', 'fn_inicializar_saldo',
                         'fn_validar_contrato', 'fn_cortesia_unica', 'proximo_numero_foto')
  loop
    execute format('alter function %s set search_path = public, extensions, pg_temp', r.assinatura);
  end loop;
end $$;

create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.eh_gestor_logado() set schema private;
revoke all on function private.eh_gestor_logado() from public, anon;
grant execute on function private.eh_gestor_logado() to authenticated;

-- Conferência: deve responder o saldo normalmente.
-- select saldo_creditos('12411502737') ->> 'saldo_plano' as saldo_plano;

-- =====================================================================================================================
-- AIMÊ — Chave de inspetor por SEQUÊNCIA do Postgres (13/10/2026)
--
-- Problema: a chave INS-nnn era calculada como "maior chave existente + 1" ordenando o TEXTO. Isso (1) comete erro a partir do
-- milésimo inspetor (INS-999 vem depois de INS-1000 na ordem do texto), (2) reutiliza a chave de inspetor apagado e (3) permite
-- que dois cadastros simultâneos recebam a mesma chave. Como o acesso aos arquivos depende da chave (o nome do arquivo começa
-- por ela), chave repetida ou reaproveitada = um inspetor enxergando os arquivos de outro.
--
-- O que este script faz (pode ser executado mais de uma vez):
--   1) cria a sequência seq_chave_inspetor, começando no maior número já usado + 1;
--   2) cria a função proxima_chave_inspetor() ('INS-001' ... 'INS-999', 'INS-1000'), executável só pelo service_role;
--   3) cria índice único em inspetor.chave_inspetor (e pára, sem alterar nada, se já houver chaves repetidas).
-- O código funciona antes e depois deste script: sem a função, cai num cálculo numérico (menos seguro).
-- =====================================================================================================================

-- 1) Sequência
DO $$
DECLARE
  v_maior bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE c.relkind = 'S' AND c.relname = 'seq_chave_inspetor' AND n.nspname = 'public') THEN
    SELECT COALESCE(MAX(substring(chave_inspetor from '^INS-(\d+)$')::bigint), 0)
      INTO v_maior
      FROM public.inspetor
     WHERE chave_inspetor ~ '^INS-\d+$';
    EXECUTE format('CREATE SEQUENCE public.seq_chave_inspetor AS bigint START WITH %s MINVALUE 1 NO CYCLE', v_maior + 1);
  END IF;
END $$;

-- 2) Função: três dígitos com zero à esquerda até 999 e, a partir de 1000, o número inteiro (lpad cortaria o excedente)
CREATE OR REPLACE FUNCTION public.proxima_chave_inspetor() RETURNS text
LANGUAGE sql VOLATILE
SECURITY DEFINER            -- roda com os direitos do dono (que é dono da sequência): não depende de permissão sobre a sequência
SET search_path = public, pg_temp  -- fixo, como manda a boa prática para SECURITY DEFINER
AS $$
  SELECT 'INS-' || (CASE WHEN n < 1000 THEN lpad(n::text, 3, '0') ELSE n::text END)
    FROM (SELECT nextval('public.seq_chave_inspetor') AS n) s
$$;

REVOKE ALL ON FUNCTION public.proxima_chave_inspetor() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.proxima_chave_inspetor() FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.proxima_chave_inspetor() FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.proxima_chave_inspetor() TO service_role';
  END IF;
END $$;

-- 3) Índice único (parcial: cadastros antigos sem chave continuam permitidos)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.inspetor WHERE chave_inspetor IS NOT NULL GROUP BY chave_inspetor HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Existem chaves INS-nnn repetidas em inspetor.chave_inspetor. Corrija-as antes de criar o índice único (select chave_inspetor, count(*) from inspetor group by 1 having count(*) > 1).';
  END IF;
  CREATE UNIQUE INDEX IF NOT EXISTS ux_inspetor_chave_inspetor ON public.inspetor (chave_inspetor) WHERE chave_inspetor IS NOT NULL;
END $$;

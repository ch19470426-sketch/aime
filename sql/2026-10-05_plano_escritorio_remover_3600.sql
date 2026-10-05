-- AIMÊ — Plano Escritório: tirar o 3.600 das regras do banco (Celso, 05/10/2026).
-- A migração anterior (2026-10-05_plano_escritorio_3000.sql) manteve o 3600 aceito só para
-- não quebrar contratos de Escritório que já existissem. Este script fecha a regra em
-- 0/600/1200/3000, convertendo ANTES esses contratos antigos para 3000.
-- SEGURANÇA: se algum contrato antigo tiver saldo acima de 3000, converter faria o inspetor
-- perder crédito — nesse caso PARA com uma mensagem e NÃO altera nada (bloco único, tudo-ou-nada).
-- Pode rodar antes ou depois do deploy: o código novo já não grava 3600.

DO $$
DECLARE
  n_perderiam INT;
BEGIN
  SELECT count(*) INTO n_perderiam FROM public.contratos_inspetor
  WHERE qde_contratada_plano = 3600 AND saldo_quantidade_plano > 3000;
  IF n_perderiam > 0 THEN
    RAISE EXCEPTION '% contrato(s) com 3600 tem saldo acima de 3000; converter reduziria creditos. Nada foi modificado.', n_perderiam;
  END IF;

  UPDATE public.contratos_inspetor SET qde_contratada_plano = 3000 WHERE qde_contratada_plano = 3600;

  ALTER TABLE public.contratos_inspetor DROP CONSTRAINT ck_qde_plano_2026_10;
  ALTER TABLE public.contratos_inspetor
    ADD CONSTRAINT ck_qde_plano_valores CHECK (qde_contratada_plano IN (0, 600, 1200, 3000));
END $$;

-- Conferência: deve listar a regra nova (sem 3600) e ZERO contratos com 3600:
SELECT 'regra' AS tipo, conname::text AS nome, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conrelid = 'public.contratos_inspetor'::regclass AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%qde_contratada_plano%'
UNION ALL
SELECT 'contratos com 3600', count(*)::text, ''
FROM public.contratos_inspetor WHERE qde_contratada_plano = 3600;

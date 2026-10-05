-- AIMÊ — Plano Escritório: tirar o 3.600 das regras do banco (Celso, 05/10/2026).
-- A migração anterior (2026-10-05_plano_escritorio_3000.sql) manteve o 3600 aceito só para
-- não quebrar contratos de Escritório que já existissem. Este script fecha a regra em
-- 0/600/1200/3000, convertendo ANTES esses contratos antigos para 3000.
--
-- NINGUÉM PERDE CRÉDITO: o que passar de 3000 de saldo vira CRÉDITO AVULSO do mesmo
-- contrato, com a MESMA validade do plano (data_fim_avulso = data_fim_contrato), então o total
-- do inspetor e a data de vencimento continuam iguais. O plano consome primeiro, o avulso depois.
-- GUARDA: se um contrato antigo com excesso JÁ tiver crédito avulso, a combinação exigiria uma
-- decisão manual — o script PARA com uma mensagem e NÃO altera nada (bloco único, tudo-ou-nada).
-- Pode rodar antes ou depois do deploy: o código novo já não grava 3600.

DO $$
DECLARE
  n_com_avulso INT;
BEGIN
  SELECT count(*) INTO n_com_avulso FROM public.contratos_inspetor
  WHERE qde_contratada_plano = 3600 AND saldo_quantidade_plano > 3000
    AND (qde_contratada_avulso > 0 OR saldo_quantidade_avulso > 0);
  IF n_com_avulso > 0 THEN
    RAISE EXCEPTION '% contrato(s) antigo(s) de 3600 com excesso ja tem credito avulso; decidir manualmente. Nada foi modificado.', n_com_avulso;
  END IF;

  -- 1) excesso (saldo acima de 3000) vira avulso do mesmo contrato, com a mesma validade do plano
  UPDATE public.contratos_inspetor
     SET qde_contratada_avulso   = qde_contratada_avulso   + (saldo_quantidade_plano - 3000),
         saldo_quantidade_avulso = saldo_quantidade_avulso + (saldo_quantidade_plano - 3000),
         data_fim_avulso         = data_fim_contrato
   WHERE qde_contratada_plano = 3600 AND saldo_quantidade_plano > 3000;

  -- 2) contratos antigos de 3600 passam a 3000 (o excesso já foi para o avulso)
  UPDATE public.contratos_inspetor
     SET saldo_quantidade_plano = LEAST(saldo_quantidade_plano, 3000),
         qde_contratada_plano   = 3000
   WHERE qde_contratada_plano = 3600;

  -- 3) regra nova, sem o 3600
  ALTER TABLE public.contratos_inspetor DROP CONSTRAINT ck_qde_plano_2026_10;
  ALTER TABLE public.contratos_inspetor
    ADD CONSTRAINT ck_qde_plano_valores CHECK (qde_contratada_plano IN (0, 600, 1200, 3000));
END $$;

-- Conferência: a regra nova (sem 3600), ZERO contratos com 3600 e os contratos de Escritório:
SELECT 'regra' AS tipo, conname::text AS nome, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conrelid = 'public.contratos_inspetor'::regclass AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%qde_contratada_plano%'
UNION ALL
SELECT 'contratos com 3600', count(*)::text, ''
FROM public.contratos_inspetor WHERE qde_contratada_plano = 3600
UNION ALL
SELECT 'escritorio', cpf_inspetor::text,
       format('plano %s/%s | avulso %s/%s | fim do avulso %s', saldo_quantidade_plano, qde_contratada_plano,
              saldo_quantidade_avulso, qde_contratada_avulso, COALESCE(data_fim_avulso::text, 'sem vencimento'))
FROM public.contratos_inspetor WHERE tipo_assinatura = 'PLANO ESCRITÓRIO';

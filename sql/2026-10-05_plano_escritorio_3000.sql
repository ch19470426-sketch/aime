-- AIMÊ — Plano Escritório: 3.600 CR -> 3.000 CR
-- Regra de Celso (05/10/2026): 20% do salário mínimo de referência (R$ 1.620,00) = R$ 324,00,
-- 30 dias de validade, cerca de 10 processos completos. Até hoje eram 24% = R$ 388,80 = 3.600 CR.
-- RODAR ANTES DO DEPLOY desta versão.
--
-- O banco tem uma regra que só aceita 0/600/1200/3600 em qde_contratada_plano (criada junto
-- com a tabela, fora deste repositório). O bloco abaixo a troca por uma que aceita também
-- 3000 e continua aceitando 3600 (contratos de Escritório que já existem não quebram).
-- É "tudo ou nada": se não reconhecer a regra com segurança, PARA com uma mensagem e
-- não altera nada. Depois atualiza o catálogo de planos (planos_assinatura).

DO $$
DECLARE
  r RECORD;
  removidas INT := 0;
BEGIN
  FOR r IN
    SELECT conname::text AS nome, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.contratos_inspetor'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%qde_contratada_plano%'
      AND pg_get_constraintdef(oid) ILIKE '%3600%'
  LOOP
    IF r.def ILIKE '%saldo%' OR r.def ILIKE '%avulso%' OR r.def ILIKE '%tipo_assinatura%' THEN
      RAISE EXCEPTION 'A regra "%" mistura outras colunas e nao foi alterada: %. Nada foi modificado.', r.nome, r.def;
    END IF;
    EXECUTE format('ALTER TABLE public.contratos_inspetor DROP CONSTRAINT %I', r.nome);
    removidas := removidas + 1;
  END LOOP;

  IF removidas = 0 THEN
    RAISE EXCEPTION 'Nao encontrei a regra de valores fixos (0/600/1200/3600) em qde_contratada_plano. Nada foi modificado.';
  END IF;

  ALTER TABLE public.contratos_inspetor
    ADD CONSTRAINT ck_qde_plano_2026_10 CHECK (qde_contratada_plano IN (0, 600, 1200, 3000, 3600));

  UPDATE public.planos_assinatura SET qde_creditos = 3000 WHERE tipo_assinatura = 'PLANO ESCRITÓRIO';
END $$;

-- Conferência (deve mostrar a regra nova e o catálogo com 3000):
SELECT 'regra' AS tipo, conname::text AS nome, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conrelid = 'public.contratos_inspetor'::regclass AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%qde_contratada_plano%'
UNION ALL
SELECT 'catalogo', tipo_assinatura::text, qde_creditos::text || ' CR'
FROM public.planos_assinatura WHERE tipo_assinatura = 'PLANO ESCRITÓRIO';

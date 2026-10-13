-- =====================================================================================================================
-- AIMÊ — A chave do inspetor volta a ser o CPF (13/10/2026, decisão de Celso)
--
-- A chave INS-nnn (sequencial) não atendia: era uma segunda identidade além do CPF, não dava segurança e tinha limite e defeitos de
-- contagem. Este script converte os cadastros. Pode ser executado mais de uma vez.
--
-- ORDEM: (1) este script; (2) POST /api/gestor/migrar-chave-para-cpf, primeiro em simulação e depois com {"executar": true}, que
-- renomeia os ARQUIVOS (começam pela chave antiga) para começar pelo CPF. Os arquivos só são encontrados pela chave antiga que
-- este script guarda em inspetor.chave_legada. Depois da migração, a rota e a coluna chave_legada podem ser removidas.
-- =====================================================================================================================

-- 1) Guarda a chave antiga (só onde ainda é INS-nnn e a legada está vazia)
ALTER TABLE public.inspetor ADD COLUMN IF NOT EXISTS chave_legada text;
UPDATE public.inspetor SET chave_legada = chave_inspetor WHERE chave_inspetor LIKE 'INS-%' AND chave_legada IS NULL;

-- 2) A coluna da chave precisa comportar os 11 dígitos do CPF (se tiver tamanho máximo menor, vira texto sem limite)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'inspetor' AND column_name = 'chave_inspetor'
                AND character_maximum_length IS NOT NULL AND character_maximum_length < 11) THEN
    ALTER TABLE public.inspetor ALTER COLUMN chave_inspetor TYPE text;
  END IF;
END $$;

-- 3) A chave de todos passa a ser o CPF
UPDATE public.inspetor SET chave_inspetor = regexp_replace(cpf_inspetor, '\D', '', 'g') WHERE chave_inspetor IS DISTINCT FROM regexp_replace(cpf_inspetor, '\D', '', 'g');

-- 4) Garantia de chave única: só cria o índice se o banco ainda não tiver um (em produção já existe a regra
--    inspetor_chave_inspetor_key, UNIQUE (chave_inspetor), e criar outro seria repetição)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'inspetor'
                  AND indexdef ILIKE 'CREATE UNIQUE INDEX%(chave_inspetor)%') THEN
    CREATE UNIQUE INDEX ux_inspetor_chave_inspetor ON public.inspetor (chave_inspetor) WHERE chave_inspetor IS NOT NULL;
  END IF;
END $$;

-- =====================================================================
-- AIMÊ — Preparação para Asaas: consumo de créditos + pedidos de compra
-- Data: 27/09/2026
--
-- O que cria:
--   1. consumo_creditos   — livro-razão (uma linha por débito efetivo)
--   2. pedidos_credito    — pedidos de contratação (plano ou avulso)
--   3. saldo_creditos()   — leitura de saldo (com isenção de gestor)
--   4. consumir_creditos()— débito ATÔMICO (com isenção de gestor)
--   5. Endurece permissões: funções só executáveis pela service_role
--
-- Regras implementadas em consumir_creditos():
--   * Gestor (inspetor.is_gestor = true): NÃO debita e NÃO grava no
--     livro-razão. Retorna ok=true, isento=true.
--   * Débito consome primeiro o saldo do PLANO vigente e, se faltar,
--     o saldo AVULSO. Se não houver saldo total suficiente, NÃO altera
--     nada (tudo ou nada).
--   * Idempotente por (cpf, referencia): repetir a mesma chamada não
--     debita duas vezes.
--   * Definição de contrato segue a da tela do gestor:
--       - plano vigente = contrato mais recente com data_fim >= hoje
--       - avulso        = saldo_quantidade_avulso do contrato mais recente
--
-- Segurança: as duas funções ficam FORA do alcance da chave anon
-- (que é pública no navegador). Só a service_role executa.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Livro-razão de consumo
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consumo_creditos (
  id              BIGSERIAL PRIMARY KEY,
  cpf_inspetor    TEXT        NOT NULL,
  data_hora       TIMESTAMPTZ NOT NULL DEFAULT now(),
  codigo_servico  TEXT,
  custo           INTEGER     NOT NULL CHECK (custo > 0),
  debitado_plano  INTEGER     NOT NULL DEFAULT 0 CHECK (debitado_plano  >= 0),
  debitado_avulso INTEGER     NOT NULL DEFAULT 0 CHECK (debitado_avulso >= 0),
  cnpjoucpf       TEXT,
  referencia      TEXT,
  CHECK (debitado_plano + debitado_avulso = custo)
);

-- Idempotência: mesma referência para o mesmo inspetor só debita uma vez
CREATE UNIQUE INDEX IF NOT EXISTS consumo_creditos_ref_unica
  ON public.consumo_creditos (cpf_inspetor, referencia)
  WHERE referencia IS NOT NULL;

CREATE INDEX IF NOT EXISTS consumo_creditos_cpf_data
  ON public.consumo_creditos (cpf_inspetor, data_hora DESC);

-- Só a service_role acessa (sem policies = ninguém mais lê/escreve)
ALTER TABLE public.consumo_creditos ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- 2. Pedidos de contratação (preparação para o Asaas)
--    Não concede crédito: só registra a intenção de compra. A concessão
--    virá do webhook do Asaas, na etapa de instalação.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pedidos_credito (
  id               BIGSERIAL PRIMARY KEY,
  cpf_inspetor     TEXT        NOT NULL,
  tipo             TEXT        NOT NULL
                   CHECK (tipo IN ('PLANO SERVIÇO','PLANO MENSAL','PLANO ESCRITÓRIO','AVULSO')),
  qde_creditos     INTEGER     NOT NULL CHECK (qde_creditos > 0),
  valor            NUMERIC(12,2),               -- definido na criação da cobrança
  status           TEXT        NOT NULL DEFAULT 'aguardando_pagamento'
                   CHECK (status IN ('aguardando_pagamento','pago','cancelado')),
  asaas_payment_id TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  pago_em          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pedidos_credito_cpf
  ON public.pedidos_credito (cpf_inspetor, criado_em DESC);

CREATE UNIQUE INDEX IF NOT EXISTS pedidos_credito_asaas_unico
  ON public.pedidos_credito (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

ALTER TABLE public.pedidos_credito ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- 3. saldo_creditos(cpf) — leitura de saldo
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.saldo_creditos(p_cpf TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_gestor  BOOLEAN;
  v_plano   INTEGER := 0;
  v_avulso  INTEGER := 0;
BEGIN
  SELECT COALESCE(is_gestor, false) INTO v_gestor
    FROM inspetor WHERE cpf_inspetor = p_cpf;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('existe', false);
  END IF;

  -- Plano: contrato mais recente ainda vigente
  SELECT COALESCE(saldo_quantidade_plano, 0) INTO v_plano
    FROM contratos_inspetor
   WHERE cpf_inspetor = p_cpf AND data_fim_contrato >= current_date
   ORDER BY data_inicio_contrato DESC, ctid DESC
   LIMIT 1;
  v_plano := COALESCE(v_plano, 0);

  -- Avulso: contrato mais recente (vigente ou não — avulso não vence)
  SELECT COALESCE(saldo_quantidade_avulso, 0) INTO v_avulso
    FROM contratos_inspetor
   WHERE cpf_inspetor = p_cpf
   ORDER BY data_inicio_contrato DESC, ctid DESC
   LIMIT 1;
  v_avulso := COALESCE(v_avulso, 0);

  RETURN jsonb_build_object(
    'existe',       true,
    'isento',       v_gestor,
    'saldo_plano',  v_plano,
    'saldo_avulso', v_avulso,
    'saldo_total',  v_plano + v_avulso
  );
END;
$$;


-- ---------------------------------------------------------------------
-- 4. consumir_creditos() — débito atômico
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consumir_creditos(
  p_cpf            TEXT,
  p_custo          INTEGER,
  p_codigo_servico TEXT DEFAULT NULL,
  p_cnpjoucpf      TEXT DEFAULT NULL,
  p_referencia     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_gestor      BOOLEAN;
  r_recente     RECORD;
  r_ativo       RECORD;
  v_plano_disp  INTEGER;
  v_avulso_disp INTEGER;
  v_deb_plano   INTEGER;
  v_deb_avulso  INTEGER;
BEGIN
  IF p_cpf IS NULL OR p_custo IS NULL OR p_custo <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'parametros_invalidos');
  END IF;

  SELECT COALESCE(is_gestor, false) INTO v_gestor
    FROM inspetor WHERE cpf_inspetor = p_cpf;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'inspetor_nao_encontrado');
  END IF;

  -- Gestor: isento. Não debita, não grava no livro-razão.
  IF v_gestor THEN
    RETURN jsonb_build_object(
      'ok', true, 'isento', true, 'debitado_plano', 0, 'debitado_avulso', 0
    );
  END IF;

  -- Trava todos os contratos do inspetor em ordem determinística,
  -- serializando débitos simultâneos do mesmo CPF.
  PERFORM 1 FROM contratos_inspetor
    WHERE cpf_inspetor = p_cpf
    ORDER BY data_inicio_contrato, ctid
    FOR UPDATE;

  -- Idempotência (checada DEPOIS da trava, para não haver corrida)
  IF p_referencia IS NOT NULL AND EXISTS (
    SELECT 1 FROM consumo_creditos
     WHERE cpf_inspetor = p_cpf AND referencia = p_referencia
  ) THEN
    RETURN jsonb_build_object('ok', true, 'duplicado', true,
                              'debitado_plano', 0, 'debitado_avulso', 0);
  END IF;

  SELECT ctid AS rid, * INTO r_recente
    FROM contratos_inspetor
   WHERE cpf_inspetor = p_cpf
   ORDER BY data_inicio_contrato DESC, ctid DESC
   LIMIT 1;

  SELECT ctid AS rid, * INTO r_ativo
    FROM contratos_inspetor
   WHERE cpf_inspetor = p_cpf AND data_fim_contrato >= current_date
   ORDER BY data_inicio_contrato DESC, ctid DESC
   LIMIT 1;

  v_plano_disp  := COALESCE(r_ativo.saldo_quantidade_plano, 0);
  v_avulso_disp := COALESCE(r_recente.saldo_quantidade_avulso, 0);

  IF v_plano_disp + v_avulso_disp < p_custo THEN
    RETURN jsonb_build_object(
      'ok', false, 'motivo', 'saldo_insuficiente',
      'necessario', p_custo,
      'saldo_plano', v_plano_disp, 'saldo_avulso', v_avulso_disp
    );
  END IF;

  v_deb_plano  := LEAST(v_plano_disp, p_custo);
  v_deb_avulso := p_custo - v_deb_plano;

  -- UM único UPDATE cobre os dois casos (plano e avulso na mesma linha
  -- ou em linhas diferentes). ctid é avaliado no snapshot anterior ao
  -- UPDATE, então não há risco de "perder" a segunda linha.
  UPDATE contratos_inspetor SET
    saldo_quantidade_plano  = saldo_quantidade_plano
        - CASE WHEN ctid = r_ativo.rid    THEN v_deb_plano  ELSE 0 END,
    saldo_quantidade_avulso = saldo_quantidade_avulso
        - CASE WHEN ctid = r_recente.rid  THEN v_deb_avulso ELSE 0 END
  WHERE ctid = r_ativo.rid OR ctid = r_recente.rid;

  INSERT INTO consumo_creditos
    (cpf_inspetor, codigo_servico, custo, debitado_plano, debitado_avulso,
     cnpjoucpf, referencia)
  VALUES
    (p_cpf, p_codigo_servico, p_custo, v_deb_plano, v_deb_avulso,
     p_cnpjoucpf, p_referencia);

  RETURN jsonb_build_object(
    'ok', true,
    'debitado_plano',  v_deb_plano,
    'debitado_avulso', v_deb_avulso,
    'saldo_plano',     v_plano_disp  - v_deb_plano,
    'saldo_avulso',    v_avulso_disp - v_deb_avulso
  );
END;
$$;


-- ---------------------------------------------------------------------
-- 5. Permissões: só a service_role executa
--    (a chave anon é pública no navegador — sem isto, qualquer pessoa
--    poderia debitar créditos de outro CPF chamando a função via API)
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.saldo_creditos(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saldo_creditos(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.consumir_creditos(TEXT, INTEGER, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consumir_creditos(TEXT, INTEGER, TEXT, TEXT, TEXT)
  TO service_role;

-- Mesmo endurecimento para a função de numeração de fotos criada em
-- 14/09/2026. Verificado: a rota /api/foto-nr chama com a service_role,
-- então nada quebra. (Antes, qualquer pessoa com a chave anon podia
-- incrementar contadores de foto de qualquer inspetor.)
REVOKE ALL ON FUNCTION public.proximo_numero_foto(VARCHAR, VARCHAR, VARCHAR, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proximo_numero_foto(VARCHAR, VARCHAR, VARCHAR, INTEGER)
  TO service_role;

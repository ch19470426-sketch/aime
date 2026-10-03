-- AIMÊ — Ajuste de validade de Plano Serviço e introdução de validade para Avulso
-- Data: 02/10/2026 — pedido de Celso
--
-- 1. PLANO SERVIÇO: 90 -> 60 dias
-- 2. CRÉDITOS AVULSOS: de indeterminado para 90 dias, contados da data em
--    que foram concedidos — MAS só para avulso concedido a partir desta
--    mudança. Avulso já existente continua sem vencimento (decisão
--    explícita de Celso — não retroage).

-- 1. Nova coluna de validade do avulso (NULL = sem vencimento, preserva o que já existe)
ALTER TABLE contratos_inspetor ADD COLUMN data_fim_avulso DATE;

-- 2. Plano Serviço: 90 -> 60 dias (coluna gerada, precisa recriar)
ALTER TABLE contratos_inspetor DROP COLUMN data_fim_contrato;
ALTER TABLE contratos_inspetor ADD COLUMN data_fim_contrato DATE
  GENERATED ALWAYS AS (
    CASE tipo_assinatura
      WHEN 'PLANO CORTESIA'   THEN (data_inicio_contrato + INTERVAL '15 days')
      WHEN 'PLANO SERVIÇO'    THEN (data_inicio_contrato + INTERVAL '60 days')
      WHEN 'PLANO MENSAL'     THEN (data_inicio_contrato + INTERVAL '30 days')
      WHEN 'PLANO ESCRITÓRIO' THEN (data_inicio_contrato + INTERVAL '30 days')
      ELSE (data_inicio_contrato + INTERVAL '30 days')
    END
  ) STORED;

-- 3. saldo_creditos(): avulso vencido não conta no saldo exibido
CREATE OR REPLACE FUNCTION public.saldo_creditos(p_cpf text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_gestor  BOOLEAN;
  v_plano   INTEGER := 0;
  v_avulso  INTEGER := 0;
  v_fim_avulso DATE;
BEGIN
  SELECT COALESCE(is_gestor, false) INTO v_gestor
    FROM inspetor WHERE cpf_inspetor = p_cpf;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('existe', false);
  END IF;

  SELECT COALESCE(saldo_quantidade_plano, 0) INTO v_plano
    FROM contratos_inspetor
   WHERE cpf_inspetor = p_cpf AND data_fim_contrato >= current_date
   ORDER BY data_inicio_contrato DESC, ctid DESC
   LIMIT 1;
  v_plano := COALESCE(v_plano, 0);

  SELECT COALESCE(saldo_quantidade_avulso, 0), data_fim_avulso
    INTO v_avulso, v_fim_avulso
    FROM contratos_inspetor
   WHERE cpf_inspetor = p_cpf
   ORDER BY data_inicio_contrato DESC, ctid DESC
   LIMIT 1;
  v_avulso := COALESCE(v_avulso, 0);
  IF v_fim_avulso IS NOT NULL AND v_fim_avulso < current_date THEN
    v_avulso := 0;
  END IF;

  RETURN jsonb_build_object(
    'existe',        true,
    'isento',        v_gestor,
    'saldo_plano',   v_plano,
    'saldo_avulso',  v_avulso,
    'saldo_total',   v_plano + v_avulso,
    'fim_avulso',    v_fim_avulso
  );
END;
$function$;

-- 4. consumir_creditos(): avulso vencido não é usado no débito
CREATE OR REPLACE FUNCTION public.consumir_creditos(p_cpf text, p_custo integer, p_codigo_servico text DEFAULT NULL::text, p_cnpjoucpf text DEFAULT NULL::text, p_referencia text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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

  IF v_gestor THEN
    RETURN jsonb_build_object(
      'ok', true, 'isento', true, 'debitado_plano', 0, 'debitado_avulso', 0
    );
  END IF;

  PERFORM 1 FROM contratos_inspetor
    WHERE cpf_inspetor = p_cpf
    ORDER BY data_inicio_contrato, ctid
    FOR UPDATE;

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
  IF r_recente.data_fim_avulso IS NOT NULL AND r_recente.data_fim_avulso < current_date THEN
    v_avulso_disp := 0;
  END IF;

  IF v_plano_disp + v_avulso_disp < p_custo THEN
    RETURN jsonb_build_object(
      'ok', false, 'motivo', 'saldo_insuficiente',
      'necessario', p_custo,
      'saldo_plano', v_plano_disp, 'saldo_avulso', v_avulso_disp
    );
  END IF;

  v_deb_plano  := LEAST(v_plano_disp, p_custo);
  v_deb_avulso := p_custo - v_deb_plano;

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
$function$;

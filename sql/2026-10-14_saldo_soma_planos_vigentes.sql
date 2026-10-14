-- AIMÊ — Saldo e débito de créditos passam a somar TODOS os planos vigentes
-- Data: 14/10/2026 — pedido de Celso
--
-- PROBLEMA: um inspetor com dois planos vigentes ao mesmo tempo (ex.: Cortesia com 66 CR, que vale 15 dias, e Serviço com 50 CR, que vale 60) só
-- enxergava o contrato mais recente: o saldo mostrava 50 e um laudo de 100 CR era recusado, embora ele tivesse 116. Cada plano novo é um
-- contrato novo, e o saldo do anterior ficava parado onde estava (o estorno, revogarCreditos, já percorria todos os contratos vigentes).
--
-- REGRA NOVA:
--   * saldo_creditos(): o saldo de PLANO é a SOMA dos saldos dos contratos vigentes (data_fim_contrato >= hoje).
--   * consumir_creditos(): o plano é debitado primeiro do contrato que VENCE ANTES (o crédito que ia vencer é usado primeiro; em empate,
--     o mais antigo), e o que faltar vem do contrato seguinte. O AVULSO segue como antes: vem do contrato mais recente, e vencido não conta.
--   * Nada muda para quem tem um plano só. Os contratos não são alterados por esta migração (só funções).
--
-- DESFAZER: reaplicar os dois blocos CREATE OR REPLACE FUNCTION de sql/2026-10-02_validade_servico_e_avulso.sql.
-- Idempotente: pode ser executada de novo sem efeito colateral.

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

  -- Plano: SOMA dos contratos vigentes (antes: só o mais recente)
  SELECT COALESCE(SUM(saldo_quantidade_plano), 0) INTO v_plano
    FROM contratos_inspetor
   WHERE cpf_inspetor = p_cpf AND data_fim_contrato >= current_date;
  v_plano := COALESCE(v_plano, 0);

  -- Avulso: contrato mais recente; vencido não conta (inalterado)
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

CREATE OR REPLACE FUNCTION public.consumir_creditos(p_cpf text, p_custo integer, p_codigo_servico text DEFAULT NULL::text, p_cnpjoucpf text DEFAULT NULL::text, p_referencia text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_gestor      BOOLEAN;
  r_recente     RECORD;
  r_plano       RECORD;
  v_plano_disp  INTEGER;
  v_avulso_disp INTEGER;
  v_deb_plano   INTEGER;
  v_deb_avulso  INTEGER;
  v_resta       INTEGER;
  v_tira        INTEGER;
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

  -- Trava todos os contratos do inspetor em ordem determinística, serializando débitos simultâneos do mesmo CPF.
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

  -- Avulso: contrato mais recente (inalterado)
  SELECT * INTO r_recente
    FROM contratos_inspetor
   WHERE cpf_inspetor = p_cpf
   ORDER BY data_inicio_contrato DESC, ctid DESC
   LIMIT 1;

  -- Plano: SOMA dos contratos vigentes (antes: só o mais recente)
  SELECT COALESCE(SUM(saldo_quantidade_plano), 0) INTO v_plano_disp
    FROM contratos_inspetor
   WHERE cpf_inspetor = p_cpf AND data_fim_contrato >= current_date;
  v_plano_disp  := COALESCE(v_plano_disp, 0);
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

  -- Plano: debita primeiro o contrato que vence antes; o que faltar vem do seguinte. Atualiza pela CHAVE PRIMÁRIA (e não pelo ctid, que
  -- muda a cada UPDATE).
  v_resta := v_deb_plano;
  FOR r_plano IN
    SELECT tipo_assinatura, data_inicio_contrato, saldo_quantidade_plano AS saldo
      FROM contratos_inspetor
     WHERE cpf_inspetor = p_cpf AND data_fim_contrato >= current_date AND saldo_quantidade_plano > 0
     ORDER BY data_fim_contrato, data_inicio_contrato, tipo_assinatura
  LOOP
    EXIT WHEN v_resta <= 0;
    v_tira := LEAST(v_resta, r_plano.saldo);
    UPDATE contratos_inspetor
       SET saldo_quantidade_plano = saldo_quantidade_plano - v_tira
     WHERE cpf_inspetor = p_cpf
       AND tipo_assinatura = r_plano.tipo_assinatura
       AND data_inicio_contrato = r_plano.data_inicio_contrato;
    v_resta := v_resta - v_tira;
  END LOOP;

  IF v_deb_avulso > 0 THEN
    UPDATE contratos_inspetor
       SET saldo_quantidade_avulso = saldo_quantidade_avulso - v_deb_avulso
     WHERE cpf_inspetor = p_cpf
       AND tipo_assinatura = r_recente.tipo_assinatura
       AND data_inicio_contrato = r_recente.data_inicio_contrato;
  END IF;

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

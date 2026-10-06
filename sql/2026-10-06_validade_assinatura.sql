-- AIMÊ — Contrato de ASSINATURA vale até o PRÓXIMO VENCIMENTO (decisão de Celso, 06/10/2026)
--
-- Problema: o contrato dura 30 dias fixos, mas a cobrança mensal cai no mesmo dia do mês
-- seguinte. Em mês de 31 dias o plano vencia um dia ANTES da renovação (ex.: contrato de
-- 06/10 até 05/11, próxima cobrança em 06/11), deixando o inspetor sem plano por horas.
--
-- Solução: nova coluna data_fim_assinatura (nula nos contratos comuns). Quando preenchida,
-- manda no fim do contrato; quando nula, vale a regra de sempre (Cortesia 15, Serviço 60,
-- demais 30 dias). Compra de um mês avulso continua com 30 dias.
-- data_fim_contrato é coluna GERADA, então é recriada (como em 2026-10-02): os contratos que
-- já existem ficam com exatamente as mesmas datas de antes.
-- RODAR ANTES do deploy desta versão.

ALTER TABLE public.contratos_inspetor ADD COLUMN IF NOT EXISTS data_fim_assinatura DATE;

ALTER TABLE public.contratos_inspetor DROP COLUMN data_fim_contrato;
ALTER TABLE public.contratos_inspetor ADD COLUMN data_fim_contrato DATE
  GENERATED ALWAYS AS (
    COALESCE(
      data_fim_assinatura,
      (CASE tipo_assinatura
        WHEN 'PLANO CORTESIA'   THEN (data_inicio_contrato + INTERVAL '15 days')
        WHEN 'PLANO SERVIÇO'    THEN (data_inicio_contrato + INTERVAL '60 days')
        WHEN 'PLANO MENSAL'     THEN (data_inicio_contrato + INTERVAL '30 days')
        WHEN 'PLANO ESCRITÓRIO' THEN (data_inicio_contrato + INTERVAL '30 days')
        ELSE (data_inicio_contrato + INTERVAL '30 days')
      END)::date
    )
  ) STORED;

-- Recriar a coluna derruba qualquer índice que a usasse; este atende as consultas de saldo
-- (por CPF e data de fim) e é seguro repetir.
CREATE INDEX IF NOT EXISTS idx_contratos_cpf_fim
  ON public.contratos_inspetor (cpf_inspetor, data_fim_contrato);

NOTIFY pgrst, 'reload schema';

-- Conferência: os contratos existentes devem manter as datas; data_fim_assinatura vazia neles.
SELECT cpf_inspetor, tipo_assinatura, data_inicio_contrato, data_fim_assinatura, data_fim_contrato
FROM public.contratos_inspetor ORDER BY data_inicio_contrato DESC LIMIT 10;

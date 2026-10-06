-- AIMÊ — Assinaturas mensais (PLANO MENSAL e PLANO ESCRITÓRIO) via Asaas
-- Decisão de Celso, 05/10/2026: Mensal e Escritório passam a poder ser ASSINATURA (cobrança
-- mensal automática no cartão); Serviço e Avulso continuam compra única.
-- RODAR ANTES do deploy desta versão.

CREATE TABLE IF NOT EXISTS public.assinaturas (
  id                    BIGSERIAL PRIMARY KEY,
  cpf_inspetor          VARCHAR(11) NOT NULL REFERENCES public.inspetor(cpf_inspetor),
  tipo                  TEXT NOT NULL CHECK (tipo IN ('PLANO MENSAL', 'PLANO ESCRITÓRIO')),
  asaas_subscription_id TEXT,
  valor                 NUMERIC(10,2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'aguardando_primeiro_pagamento'
                        CHECK (status IN ('aguardando_primeiro_pagamento', 'ativa', 'inadimplente', 'cancelada')),
  proxima_cobranca      DATE,
  criada_em             TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'),
  cancelada_em          TIMESTAMP
);

-- o webhook acha a assinatura pelo id do Asaas
CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_asaas_unico
  ON public.assinaturas (asaas_subscription_id) WHERE asaas_subscription_id IS NOT NULL;

-- no máximo UMA assinatura em andamento por inspetor
CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_uma_em_andamento
  ON public.assinaturas (cpf_inspetor)
  WHERE status IN ('aguardando_primeiro_pagamento', 'ativa', 'inadimplente');

-- cada cobrança mensal vira um pedido, ligado à assinatura
ALTER TABLE public.pedidos_credito
  ADD COLUMN IF NOT EXISTS assinatura_id BIGINT REFERENCES public.assinaturas(id);

-- acesso só pelo servidor (chave de serviço); nenhuma política pública
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pedidos_credito' AND column_name = 'assinatura_id';

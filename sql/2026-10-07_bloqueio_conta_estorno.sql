-- AIMÊ — Bloqueio de conta por estorno, chargeback ou cartão recusado 3 vezes (decisão de Celso, 07/10/2026)
-- RODAR ANTES do deploy desta versão. Seguro repetir.
--
--  inspetor.conta_bloqueada / bloqueio_motivo / bloqueio_em : a conta está bloqueada, por quê e desde quando
--  pedidos_credito.estornado_em / motivo_estorno            : o pedido já foi estornado (evita tratar o mesmo estorno duas vezes)
--  assinaturas.falhas_payment_ids                           : ids das cobranças recusadas/vencidas SEGUIDAS da assinatura
--                                                             (zera quando uma cobrança é paga); na 3ª a conta é bloqueada

ALTER TABLE public.inspetor
  ADD COLUMN IF NOT EXISTS conta_bloqueada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bloqueio_motivo TEXT,
  ADD COLUMN IF NOT EXISTS bloqueio_em TIMESTAMPTZ;

ALTER TABLE public.pedidos_credito
  ADD COLUMN IF NOT EXISTS estornado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_estorno TEXT;

ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS falhas_payment_ids TEXT[] NOT NULL DEFAULT '{}';

-- A listagem de contas bloqueadas do Painel do Gestor filtra por esta coluna.
CREATE INDEX IF NOT EXISTS idx_inspetor_bloqueada ON public.inspetor (conta_bloqueada) WHERE conta_bloqueada;

NOTIFY pgrst, 'reload schema';

-- Conferência: devem aparecer 6 colunas.
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'inspetor' AND column_name IN ('conta_bloqueada','bloqueio_motivo','bloqueio_em'))
    OR (table_name = 'pedidos_credito' AND column_name IN ('estornado_em','motivo_estorno'))
    OR (table_name = 'assinaturas' AND column_name = 'falhas_payment_ids'))
ORDER BY table_name, column_name;

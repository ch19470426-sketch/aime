-- =====================================================================
-- AIMÊ — Origem da venda e envio de compras ao Google Analytics 4 (marketing)
-- Data: 28/10/2026 — branch feature/webhook-asaas-ga4
--
-- O que cria (tudo NOVO; nenhuma tabela existente é alterada):
--   1. atribuicao_compra — origem da visita que gerou a compra (client_id e sessão do GA4, gclid/utm_*, consentimento),
--                          ligada ao pedido (compra única) ou à assinatura (renovações reaproveitam a 1ª cobrança).
--   2. ga4_envios        — fila/registro de envios ao GA4 (purchase, renovacao, refund), UM por (cobrança, evento).
--   3. eventos_asaas     — eventos recebidos do Asaas (id do evento + cobrança): idempotência e auditoria do webhook.
-- Segurança: RLS ligado e SEM políticas = só a service_role (servidor) lê e grava. Nada é exposto ao navegador.
--
-- COMO DESFAZER (as tabelas são independentes; o código tolera a ausência delas):
--   drop table if exists public.atribuicao_compra, public.ga4_envios, public.eventos_asaas;
-- =====================================================================

create table if not exists public.atribuicao_compra (
  id              bigserial primary key,
  pedido_id       bigint references public.pedidos_credito(id) on delete cascade,
  assinatura_id   bigint,
  ga_client_id    text,
  ga_session_id   text,
  origem          jsonb       not null default '{}'::jsonb,
  consentimento   text,
  plano           text,
  valor           numeric(12,2),
  tipo            text        not null default 'nova' check (tipo in ('nova','renovacao')),
  criado_em       timestamptz not null default now(),
  check (pedido_id is not null or assinatura_id is not null)
);
create unique index if not exists atribuicao_compra_pedido_unico     on public.atribuicao_compra (pedido_id);
create unique index if not exists atribuicao_compra_assinatura_unica on public.atribuicao_compra (assinatura_id);
alter table public.atribuicao_compra enable row level security;

create table if not exists public.ga4_envios (
  id              bigserial primary key,
  transaction_id  text        not null,                       -- payment.id do Asaas
  evento          text        not null check (evento in ('purchase','renovacao','refund')),
  payload         jsonb       not null,                       -- corpo do Measurement Protocol (SEM chave e SEM measurement_id)
  status          text        not null default 'pendente' check (status in ('pendente','enviado','falhou')),
  tentativas      integer     not null default 0,
  ultimo_erro     text,
  criado_em       timestamptz not null default now(),
  enviado_em      timestamptz,
  unique (transaction_id, evento)
);
create index if not exists ga4_envios_pendentes on public.ga4_envios (criado_em) where status = 'pendente';
alter table public.ga4_envios enable row level security;

create table if not exists public.eventos_asaas (
  evento_id       text primary key,                           -- campo "id" do aviso do Asaas
  evento          text        not null,
  payment_id      text,
  status_no_aviso text,
  situacao        text        not null default 'recebido' check (situacao in ('recebido','processado','erro')),
  erro            text,
  recebido_em     timestamptz not null default now(),
  processado_em   timestamptz
);
create index if not exists eventos_asaas_erro on public.eventos_asaas (recebido_em) where situacao <> 'processado';
alter table public.eventos_asaas enable row level security;

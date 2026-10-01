-- AIMÊ — Relaxar a restrição de "múltiplo de 600" em qde_contratada_avulso
-- Data: 01/10/2026
--
-- Contexto: até aqui, avulso só vinha de COMPRAS (sempre em pacotes de
-- 600), então a restrição fazia sentido. Com a nova lógica de TROCA DE
-- PLANO (concederCreditos em src/lib/creditos.ts), o saldo não usado do
-- plano antigo passa a migrar para o avulso do novo contrato — e esse
-- saldo pode ser qualquer valor (ex.: sobraram 947 CR de um Mensal
-- parcialmente usado), não necessariamente múltiplo de 600.
--
-- Decisão de Celso: isso nunca deveria ter sido uma restrição de banco,
-- e sim um critério de CONTRATAÇÃO (aplicado em /api/creditos/pedido, que
-- já valida isso no corpo da requisição antes de criar o pedido). A
-- restrição no banco ficava redundante para compra, e impeditiva para
-- migração.

ALTER TABLE contratos_inspetor DROP CONSTRAINT ck_qde_avulso;
ALTER TABLE contratos_inspetor ADD CONSTRAINT ck_qde_avulso CHECK (qde_contratada_avulso >= 0);

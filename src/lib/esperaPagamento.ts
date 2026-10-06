// src/lib/esperaPagamento.ts
// AIMÊ — Uma rodada de espera por pagamento na tela Meu Plano e Créditos.
//
// Problema que isto resolve (06/10/2026): a tela só atualizava quando A CONFERÊNCIA liberava os
// créditos. Se o aviso do Asaas (webhook) chegasse ANTES, a conferência não achava mais nada
// pendente, não recarregava a lista, e a tela ficava para sempre em "Aguardando a confirmação do
// pagamento" com o pedido já pago. Agora cada rodada confere no servidor E recarrega a lista de
// pedidos, e "confirmado" é decidido pela lista: algum dos pedidos que estavam pendentes agora
// está pago — não importa quem liberou.

export type PedidoDaLista = { id: number | string; status: string }

export async function rodadaDeEspera(
  pendentesIds: Array<number | string>,
  conferirNoServidor: () => Promise<void>,
  recarregarPedidos: () => Promise<PedidoDaLista[]>,
): Promise<{ confirmado: boolean; restaPendente: boolean }> {
  try { await conferirNoServidor() } catch { /* a lista abaixo é a fonte da verdade; tenta de novo no próximo ciclo */ }
  const lista = await recarregarPedidos()
  return {
    confirmado: lista.some(p => pendentesIds.includes(p.id) && p.status === 'pago'),
    restaPendente: lista.some(p => p.status === 'aguardando_pagamento'),
  }
}

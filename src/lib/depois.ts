// src/lib/depois.ts
// AIMÊ — Roda uma tarefa DEPOIS de a resposta ser enviada (after() do Next.js), para o webhook responder ao Asaas sem esperar
// o GA4. Fora de uma requisição (testes, scripts) o after() lança erro: aí a tarefa simplesmente roda em seguida.
// A tarefa nunca derruba nada: qualquer erro dela é descartado.
import { after } from 'next/server'

export function depoisDaResposta(tarefa: () => Promise<unknown>): void {
  const segura = () => tarefa().catch(() => { /* tarefa de apoio: erro não afeta a resposta */ })
  try { after(segura) } catch { void segura() }
}

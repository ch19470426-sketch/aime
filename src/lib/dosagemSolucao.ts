// src/lib/dosagemSolucao.ts
// AIMÊ — Dosagem da solução sugerida pela IA (SNC e Procedimento corretivo) conforme o grau de risco (0 a 100).
// DECISÃO de Celso (05/11/2026): soluções exageradas para itens de risco baixo ou médio. A faixa é a MESMA de src/lib/prioridade.ts;
// avaliação por engenheiro especialista só é permitida com grau SUPERIOR A 80.
import { prioridadeDoGrau } from '@/lib/prioridade'

const REGRA_GERAL = 'Proponha apenas o necessário para eliminar a não conformidade e a sua causa provável; não inclua demolição, substituição integral, serviços de outros sistemas nem avaliações complementares, salvo quando indispensáveis e permitidos pela faixa acima.'

/** Texto de dosagem para o prompt. Sem grau de risco válido, devolve só a regra geral. */
export function dosagemDaSolucao(grau: unknown, nr = false): string {
  const g = Number(grau)
  if (!Number.isFinite(g) || g <= 0) return 'DOSAGEM DA SOLUÇÃO: proponha apenas o necessário para eliminar a não conformidade e a sua causa provável; não inclua demolição, substituição integral, serviços de outros sistemas nem avaliações complementares, salvo quando indispensáveis.'
  let faixa: string
  if (g > 80) faixa = 'correção completa da não conformidade e da causa; a avaliação por engenheiro especialista é permitida e pode ser recomendada quando necessária'
  else {
    const p = prioridadeDoGrau(g, nr)
    faixa = p === 'Baixa' ? 'intervenção mínima e localizada (limpeza, ajuste, reparo pontual ou monitoramento); NÃO proponha substituição de componente, obra, projeto, ensaios nem avaliação por especialista'
      : p === 'Média' ? 'reparo localizado do componente afetado e da causa provável; NÃO proponha avaliação por especialista, ensaios, projeto nem substituição integral'
      : 'correção completa da não conformidade e da causa; avaliação por engenheiro especialista NÃO é necessária nesta faixa'
  }
  return `DOSAGEM DA SOLUÇÃO (grau de risco ${g} numa escala de 0 a 100): ${faixa}. ${REGRA_GERAL}`
}

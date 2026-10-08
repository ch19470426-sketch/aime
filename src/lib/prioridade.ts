// src/lib/prioridade.ts
// AIMÊ — Critério ÚNICO de prioridade a partir do grau de risco (0 a 100).
//
// DECISÃO de Celso (08/10/2026, opção A): vale o critério DECLARADO no texto dos laudos.
//   PREDIAL (serviços 31–34, 41–44, 51–54): Alta com grau SUPERIOR A 59 (60 ou mais); Média de 30 a 59; Baixa abaixo de 30.
//   NR      (serviços 35–38, 45–48, 55–58): Muito Alta acima de 80; Alta de 50 a 80; Média de 30 a 49; Baixa abaixo de 30.
//
// PROBLEMA QUE ISTO ENCERRA: a prioridade era calculada em ~39 pontos com faixas diferentes (vistoria 59/30, homologação
// 64/35 e 75 na NR, DOCX 64/35, plano de manutenção na escala de NR), então o item 4.1 (que mostrava a prioridade GRAVADA
// pela homologação) divergia do Anexo 2 (que recalculava), e uma NC "Alta" na vistoria saía "Média" depois de homologada
// mesmo sem edição. Toda tela e todo gerador devem chamar ESTAS funções.

export type Prioridade = 'Muito Alta' | 'Alta' | 'Média' | 'Baixa' | '—'
export type Semaforo = 'vermelho' | 'ambar' | 'amarelo' | 'verde'

/** Serviços que usam a escala de NR (4 níveis). Os demais usam a escala predial (3 níveis). */
export const TIPOS_NR = ['35', '36', '37', '38', '45', '46', '47', '48', '55', '56', '57', '58']
export function ehFamiliaNR(tipoServico: unknown): boolean { return TIPOS_NR.includes(String(tipoServico ?? '').trim()) }

const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

/** Sem grau de risco (0): predial devolve "—" (ainda não classificada) e NR devolve "Baixa", como as telas já faziam. */
export function prioridadeDoGrau(grau: unknown, nr = false): Prioridade {
  const g = num(grau)
  if (g <= 0) return nr ? 'Baixa' : '—'
  if (nr) return g > 80 ? 'Muito Alta' : g >= 50 ? 'Alta' : g >= 30 ? 'Média' : 'Baixa'
  return g >= 60 ? 'Alta' : g >= 30 ? 'Média' : 'Baixa'
}

export function semaforoDoGrau(grau: unknown, nr = false): Semaforo {
  const g = num(grau)
  if (nr) return g > 80 ? 'vermelho' : g >= 50 ? 'ambar' : g >= 30 ? 'amarelo' : 'verde'
  return g >= 60 ? 'vermelho' : g >= 30 ? 'ambar' : 'verde'
}

/** Cores das TELAS (vistoria e homologação): texto/barra e fundo do selo. */
export const COR_TELA: Record<Semaforo, string> = { vermelho: '#E24B4A', ambar: '#E8A000', amarelo: '#EAB308', verde: '#1A7A3C' }
export const FUNDO_TELA: Record<Semaforo, string> = { vermelho: '#FCEBEB', ambar: '#FFF0C2', amarelo: '#FFF7CC', verde: '#E6F5EE' }
export const corTelaDoGrau = (grau: unknown, nr = false): string => COR_TELA[semaforoDoGrau(grau, nr)]
export const fundoTelaDoGrau = (grau: unknown, nr = false): string => FUNDO_TELA[semaforoDoGrau(grau, nr)]

/** "Alta" e "Média" entram na relação do laudo; compara sem diferenciar maiúscula nem acento ("Muito alta", "Muito Alta", "Media"). */
export function ehPrioridadeAltaOuMedia(p: unknown): boolean {
  const t = String(p ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  return t === 'muito alta' || t === 'alta' || t === 'media'
}

/**
 * Recalcula a prioridade de cada NC a partir do grau de risco, para o laudo inteiro (item 4.1, estatísticas, Anexo 2) falar a
 * mesma coisa, independente do que foi GRAVADO antes (por homologações antigas, com outras faixas). Sem grau de risco, mantém
 * o rótulo que veio.
 */
export function normalizarPrioridades<T extends Record<string, any>>(ncs: T[] | null | undefined, nr: boolean): T[] {
  return (ncs ?? []).map(nc => {
    const g = num(nc?.grauRisco ?? nc?.grau_risco)
    return g > 0 ? { ...nc, prioridade: prioridadeDoGrau(g, nr) } : nc
  })
}

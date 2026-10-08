// src/lib/descSistemas.ts
// AIMÊ — Descrição dos sistemas construtivos no item 4.1 dos laudos 41 a 44.
//
// PROBLEMA (08/10/2026, Imóvel Novo): a tabela do item 4.1 mostrava "Sistema: <nome>" no lugar da descrição. O laudo
// usava só um dicionário FIXO no código, e os sistemas do Imóvel Novo (que vêm do banco, tabela sistemas_construtivos)
// não estavam nele. A tabela JÁ TEM a coluna descricao_sistema, mantida pelo gestor na tela /sistemas, e o laudo de NR
// (45 a 48) já a usava; os laudos 41 a 44 só buscavam o nome.
//
// ORDEM DE BUSCA: banco (nome exato) -> banco (nome normalizado) -> dicionário fixo (exato) -> dicionário fixo
// (normalizado) -> "" (quem chama decide o que mostrar). A normalização ignora o prefixo numérico ("01-", "2_"),
// maiúsculas, acentos e sublinhado, porque o mesmo sistema já foi gravado com prefixos diferentes.

export type LinhaSistema = { sistema?: string | null; descricao_sistema?: string | null }

const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function normalizarSistema(s: unknown): string {
  return semAcento(String(s ?? '')).trim().replace(/^\d+\s*[-_]\s*/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Um mapa sistema -> descrição, com a primeira descrição NÃO vazia de cada sistema (a tabela tem uma linha por subsistema). */
export function mapaDeDescricoes(linhas: LinhaSistema[]): Record<string, string> {
  const mapa: Record<string, string> = {}
  for (const l of linhas ?? []) {
    const nome = String(l?.sistema ?? '').trim()
    const desc = String(l?.descricao_sistema ?? '').trim()
    if (nome && desc && !mapa[nome]) mapa[nome] = desc
  }
  return mapa
}

function buscar(mapa: Record<string, string>, sistema: string): string {
  if (mapa[sistema]) return mapa[sistema]
  const alvo = normalizarSistema(sistema)
  if (!alvo) return ''
  for (const k of Object.keys(mapa)) if (mapa[k] && normalizarSistema(k) === alvo) return mapa[k]
  return ''
}

export function descricaoDoSistema(sistema: string, doBanco: Record<string, string>, fixas: Record<string, string>): string {
  return buscar(doBanco, sistema) || buscar(fixas, sistema)
}

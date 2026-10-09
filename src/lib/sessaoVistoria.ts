// src/lib/sessaoVistoria.ts
// AIMÊ — Token da "sessão de vistoria" (parâmetro ?sessao= da URL), que liga o rascunho e a foto guardados no aparelho
// à vistoria em andamento (sem ele, um rascunho antigo poderia aparecer numa vistoria nova).
//
// PROBLEMA (08/10/2026, vistoria do serviço 39): o Painel abria /vistoria-eletrica SEM o token (as duas aberturas do item
// 39), então a tela 32 em modo elétrico ficava com sessao vazia. A restauração exige token presente e igual, e por isso
// NEM o rascunho NEM a foto voltavam depois de a aba cair, sem nenhum aviso: a tela voltava vazia e muda.
//
// AGORA: o Painel gera o token, e, se a URL ainda assim vier sem ele, a tela gera um e o guarda na ABA (sessionStorage),
// que sobrevive a recarregamentos e à restauração de aba descartada. Token da URL, quando existe, tem prioridade.

const CHAVE = 'aime_sessao_vistoria'

export function novaSessaoToken(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function tokenDaSessao(daUrl: string | null | undefined): string {
  if (daUrl) return daUrl
  try {
    let t = sessionStorage.getItem(CHAVE)
    if (!t) { t = novaSessaoToken(); sessionStorage.setItem(CHAVE, t) }
    return t
  } catch { return '' }   // sem sessionStorage (ex.: no servidor): comportamento antigo
}

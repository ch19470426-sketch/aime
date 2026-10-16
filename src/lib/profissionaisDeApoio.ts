// src/lib/profissionaisDeApoio.ts
// AIMÊ — Profissionais de apoio da vistoria 39: o engenheiro elétrico e o engenheiro mecânico complementam a vistoria 32 de um inspetor
// civil/arquiteto, cada um nos SEUS sistemas. Uma regra só, usada pelas telas e pelo servidor (função pura, sem acesso a banco).
//
//   Eng Elétrico → 07-Instalações elétricas
//   Eng Mecânico → 09-Climatização e 10-Acessibilidade/elevadores
//
// O vínculo (tabela art_profissional) é o mesmo para os dois: cpf_eletrico guarda o CPF do profissional de apoio, qualquer que seja a
// especialidade (o nome da coluna ficou da primeira versão). A especialidade vem do título profissional do cadastro (inspetor.titulo_profissional).

export type TituloApoio = 'Eng Elétrico' | 'Eng Mecânico'

export interface PerfilApoio {
  titulo: TituloApoio
  /** "39 — Vistoria Inspeção Elétrica" / "... Mecânica" */
  rotulo: 'Elétrica' | 'Mecânica'
  /** códigos de 2 dígitos dos sistemas da vistoria 32 que o profissional pode vistoriar */
  sistemas: string[]
  /** nomes dos sistemas, como estão na tabela de sistemas (a tela filtra pelo CÓDIGO; o nome é o que aparece) */
  nomes: string[]
  /** como os textos das telas chamam esses sistemas: "acesso liberado {ao}" e "não conformidades {de}" */
  ao: string
  de: string
  /** ícone e nome da faixa da homologação */
  faixa: string
}

export const PERFIS_APOIO: Record<TituloApoio, PerfilApoio> = {
  'Eng Elétrico': {
    titulo: 'Eng Elétrico', rotulo: 'Elétrica', sistemas: ['07'], nomes: ['07-Instalações elétricas'],
    ao: 'ao sistema elétrico', de: 'do sistema elétrico', faixa: '⚡ Sistema Elétrico',
  },
  'Eng Mecânico': {
    titulo: 'Eng Mecânico', rotulo: 'Mecânica', sistemas: ['09', '10'], nomes: ['09-Climatização', '10-Acessibilidade/elevadores'],
    ao: 'aos sistemas de climatização e de acessibilidade/elevadores', de: 'dos sistemas de climatização e de acessibilidade/elevadores', faixa: '⚙ Sistemas Mecânicos',
  },
}

/** O perfil de apoio de um título profissional, ou null se o título não é de profissional de apoio. */
export function perfilDoTitulo(titulo: unknown): PerfilApoio | null {
  const t = String(titulo ?? '').trim()
  return Object.prototype.hasOwnProperty.call(PERFIS_APOIO, t) ? PERFIS_APOIO[t as TituloApoio] : null
}

/** Código de 2 dígitos no começo do nome do sistema: "07-Instalações elétricas" → "07", "9_Clima" → "09", "Outro" → "". */
export function codigoDoSistema(sistema: unknown): string {
  const m = String(sistema ?? '').trim().match(/^(\d{1,2})(?=\D|$)/)
  return m ? m[1].padStart(2, '0') : ''
}

/** O sistema é um dos que o perfil pode vistoriar? */
export function sistemaPermitido(perfil: PerfilApoio, sistema: unknown): boolean {
  return perfil.sistemas.includes(codigoDoSistema(sistema))
}

/** Valor do parâmetro sistema_fixo das telas: os nomes dos sistemas separados por "|" (um só, no caso do elétrico). */
export function sistemaFixoDoPerfil(perfil: PerfilApoio): string {
  return perfil.nomes.join('|')
}

/** Lê o parâmetro sistema_fixo de volta: "a|b" → ["a", "b"]; vazio → []. */
export function sistemasDoParametro(sistemaFixo: unknown): string[] {
  return String(sistemaFixo ?? '').split('|').map(s => s.trim()).filter(Boolean)
}

/** O perfil dono de um sistema (07 → elétrico; 09 e 10 → mecânico), ou null se o sistema não é de nenhum profissional de apoio. */
export function perfilDoSistema(sistema: unknown): PerfilApoio | null {
  const c = codigoDoSistema(sistema)
  return Object.values(PERFIS_APOIO).find(p => p.sistemas.includes(c)) ?? null
}

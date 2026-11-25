// src/lib/planoDoLaudo.ts
// AIMÊ — O laudo (41 a 48) só é gerado se o Plano de Trabalho do mesmo tipo existir (decisão de Celso, 25/11/2026, opção A): sem ele a seção
// 1.3 e o Anexo 1 saíam incompletos e o plano (que debita créditos próprios) podia ser pulado.
const PLANOS: Record<string, { slug: string; titulo: string }> = {
  '41': { slug: 'plano_autovistoria', titulo: 'Autovistoria' },
  '42': { slug: 'plano_inspecao', titulo: 'Inspeção Predial' },
  '43': { slug: 'plano_imovel_novo', titulo: 'Vistoria de Imóvel Novo' },
  '44': { slug: 'plano_fachada', titulo: 'Inspeção de Fachada' },
  '45': { slug: 'plano_elevador', titulo: 'Inspeção de Elevadores' },
  '46': { slug: 'plano_nr10', titulo: 'Inspeção NR-10' },
  '47': { slug: 'plano_nr12', titulo: 'Inspeção NR-12' },
  '48': { slug: 'plano_nr13', titulo: 'Inspeção NR-13' },
}

/** Nome do arquivo do Plano de Trabalho deste laudo (pasta documentos_inspetor), ou null se o tipo não exige plano. */
export function nomeDoPlanoDoLaudo(chaveInspetor: unknown, cnpjoucpf: unknown, tipoServico: unknown): string | null {
  const p = PLANOS[String(tipoServico ?? '').trim()]
  const chave = String(chaveInspetor ?? '').trim()
  const doc = String(cnpjoucpf ?? '').replace(/\D/g, '')
  if (!p || !chave || !doc) return null
  return `${chave}_${doc}_${p.slug}.html`
}

export function mensagemSemPlano(tipoServico: unknown): string {
  const p = PLANOS[String(tipoServico ?? '').trim()]
  return `Gere o Plano de Trabalho${p ? ` de ${p.titulo}` : ''} para este estabelecimento antes de gerar o laudo.`
}

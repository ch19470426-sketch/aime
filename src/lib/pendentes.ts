// src/lib/pendentes.ts
// AIMÊ — Regras puras sobre vistorias de terceiros e pendentes antigas (testáveis sem banco).

/** Só as linhas cujo cpf_inspetor está no conjunto permitido. Sem conjunto (vazio), nada passa. */
export function apenasDosCpfs<T extends { cpf_inspetor?: unknown }>(linhas: T[] | null | undefined, permitidos: Set<string>): T[] {
  return (linhas ?? []).filter(d => permitidos.has(String(d.cpf_inspetor)))
}

/** Nomes (em vistorias/) das pendentes da combinação chave + CNPJ/CPF + serviço: <chave>_<cnpjoucpf>_<serviço>_<NNN>.json */
export function pendentesDaCombinacao(nomes: string[], chave: string, cnpjoucpf: string, tipoServico: string): string[] {
  const inicio = `${chave}_${cnpjoucpf}_${tipoServico}_`.toUpperCase()
  return nomes.filter(n => n.toUpperCase().startsWith(inicio) && /^\d+\.json$/i.test(n.slice(inicio.length)))
}

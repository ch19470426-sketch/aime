// src/lib/copiaSeguranca.ts
// AIMÊ — cópia semanal das fotos homologadas (pasta "vistorias_homologadas/") para "copias_seguranca/AAAA-MM-DD/".
// O backup do Supabase NÃO inclui os arquivos do Storage; esta cópia protege contra apagamento por engano ou falha.
// Mantém só as últimas cópias (padrão 4 semanas), o que também limita por quanto tempo dado já eliminado pela higienização
// (cláusula 6.3 do Termo) permanece em cópia.

export const PASTA_ORIGEM = 'vistorias_homologadas'
export const PASTA_COPIAS = 'copias_seguranca'
export const COPIAS_MANTIDAS = 4

const PASTA_DATADA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Pastas de cópia que devem ser apagadas: as mais antigas, mantendo as `manter` mais recentes.
 * SEGURANÇA: só considera nomes no formato AAAA-MM-DD; qualquer outro nome é ignorado e nunca apagado.
 */
export function copiasParaApagar(nomes: string[], manter: number = COPIAS_MANTIDAS): string[] {
  const datadas = nomes.filter(n => PASTA_DATADA.test(n)).sort()
  if (manter < 1) return []   // proteção: nunca apagar tudo
  return datadas.slice(0, Math.max(0, datadas.length - manter))
}

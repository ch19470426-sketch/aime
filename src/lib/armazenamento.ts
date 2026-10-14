// src/lib/armazenamento.ts
// AIMÊ — Listagem de arquivos de uma pasta do armazenamento, sem perder nenhum.
//
// Por que existe: as pastas (documentos_inspetor, vistorias_homologadas, vistorias) são COMPARTILHADAS por todos os inspetores, e cada
// não conformidade homologada é um arquivo. As listagens liam só as primeiras 500 ou 1000 entradas da pasta INTEIRA (ordenadas por nome):
// passado o limite, os arquivos de alguns inspetores sumiam da lista sem nenhum erro, e o laudo podia sair SEM as não conformidades.
// Agora o filtro pelo nome do inspetor é feito no próprio armazenamento (parâmetro search, que filtra pelo trecho do nome) e TODAS as
// páginas são lidas, em ordem estável.
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'aime'
const POR_PAGINA = 1000
const MAX_PAGINAS = 200            // trava de segurança (200 mil arquivos de um mesmo inspetor): nunca fica em laço infinito

export type ArquivoListado = { name: string; created_at?: string | null; updated_at?: string | null; metadata?: Record<string, unknown> | null }

/** Todos os arquivos da `pasta` cujo nome COMEÇA por `prefixo` (sem diferenciar maiúsculas de minúsculas). Lança erro se a listagem falhar. */
export async function listarArquivosComPrefixo(sb: SupabaseClient, pasta: string, prefixo: string): Promise<ArquivoListado[]> {
  const achados: ArquivoListado[] = []
  if (!prefixo) return achados
  const inicio = prefixo.toUpperCase()
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const { data, error } = await sb.storage.from(BUCKET).list(pasta, {
      limit: POR_PAGINA,
      offset: pagina * POR_PAGINA,
      search: prefixo,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(error.message)
    for (const objeto of data ?? []) if (objeto.name.toUpperCase().startsWith(inicio)) achados.push(objeto)
    if (!data || data.length < POR_PAGINA) break
  }
  return achados
}

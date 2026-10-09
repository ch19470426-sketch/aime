// src/lib/dataBR.ts
// AIMÊ — Data no formato brasileiro (dd/mm/aaaa). O laudo mostrava a data da vistoria como veio do banco ou do espelho
// (aaaa-mm-dd ou aaaa/mm/dd, pedido de Celso em 08/10/2026). Aceita ISO, com barra, com ponto, com hora e já em dd/mm/aaaa.

const dois = (n: string) => n.padStart(2, '0')
const valida = (d: number, m: number) => m >= 1 && m <= 12 && d >= 1 && d <= 31

export function formatarDataBR(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return ''
    return `${dois(String(v.getUTCDate()))}/${dois(String(v.getUTCMonth() + 1))}/${v.getUTCFullYear()}`
  }
  const s = String(v).trim()
  if (!s) return ''
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/.exec(s)        // aaaa-mm-dd, aaaa/mm/dd, aaaa.mm.dd (com ou sem hora)
  if (m && valida(Number(m[3]), Number(m[2]))) return `${dois(m[3])}/${dois(m[2])}/${m[1]}`
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s].*)?$/.exec(s)            // dd/mm/aaaa, dd-mm-aaaa, dd.mm.aaaa
  if (m && valida(Number(m[1]), Number(m[2]))) return `${dois(m[1])}/${dois(m[2])}/${m[3]}`
  return s                                                                    // formato desconhecido: não inventa, mostra como veio
}

/** Normaliza a data da vistoria de cada NC (campos dataVistoria e data). */
export function normalizarDatas<T extends Record<string, any>>(ncs: T[] | null | undefined): T[] {
  return (ncs ?? []).map(nc => {
    if (!nc) return nc
    const out: Record<string, any> = { ...nc }
    if (nc.dataVistoria !== undefined) out.dataVistoria = formatarDataBR(nc.dataVistoria)
    if (nc.data !== undefined) out.data = formatarDataBR(nc.data)
    return out as T
  })
}

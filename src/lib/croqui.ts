// src/lib/croqui.ts
// AIMÊ — Croqui de localização gerado pelo endereço (CEP + número), na tela de Coleta de Dados Básicos para Geração de Laudos.
// (31/10/2026, Celso: o croqui era previsto desde o início e ficou só como envio manual de imagem.)
//
// Dois serviços do Google, os dois com a MESMA chave (GOOGLE_MAPS_API_KEY, só no servidor, nunca no navegador nem em log):
//   1. Geocoding API: endereço -> latitude e longitude.
//   2. Maps Static API: latitude e longitude -> imagem do mapa com um marcador. Tamanho 450x350 (x2 = 900x700 px), quase a proporção do quadro do laudo
//      (cerca de 90x70 mm): a imagem enche o quadro e os nomes das ruas saem maiores do que no formato largo 640x400 (02/11/2026, pouca visibilidade). A imagem já traz o logotipo e o texto de direitos do Google:
//      não pode ser cortada nem receber nada por cima.
// Cada croqui = 1 chamada de cada (10.000 de cada por mês sem custo, conferido em 31/10/2026 na página de preços do Google).
// As coordenadas NÃO são guardadas: só servem para pedir a imagem na hora (os termos do Google limitam a guarda delas).

export type EnderecoCroqui = { cep?: string; numero?: string; logradouro?: string; bairro?: string; cidade?: string; uf?: string }

export type ResultadoCroqui =
  | { ok: true; imagem: string; aproximado: boolean }
  | { ok: false; status: number; erro: string }

const LIMITE_BYTES_IMAGEM = 3 * 1024 * 1024
const TEMPO_MAXIMO_MS = 8000

const limpar = (v: unknown, max = 120) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max)

/** "Rua X, 123 - Bairro, Cidade - UF, 29000-000, Brasil" com o que houver. */
export function enderecoParaBusca(e: EnderecoCroqui): string {
  const cep = limpar(e.cep, 20).replace(/\D/g, '')
  const ruaNumero = [limpar(e.logradouro), limpar(e.numero, 20)].filter(Boolean).join(', ')
  const cidadeUf = [limpar(e.cidade), limpar(e.uf, 2)].filter(Boolean).join(' - ')
  return [ruaNumero, limpar(e.bairro), cidadeUf, cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : '', 'Brasil'].filter(Boolean).join(', ')
}

/** Dá para localizar? Precisa de CEP completo ou de rua + cidade. */
export function enderecoSuficiente(e: EnderecoCroqui): boolean {
  const cep = limpar(e.cep, 20).replace(/\D/g, '')
  return cep.length === 8 || (!!limpar(e.logradouro) && !!limpar(e.cidade))
}

export function urlGeocode(endereco: string, chave: string): string {
  const q = new URLSearchParams({ address: endereco, components: 'country:BR', region: 'br', language: 'pt-BR', key: chave })
  return `https://maps.googleapis.com/maps/api/geocode/json?${q.toString()}`
}

export function urlMapa(lat: number, lng: number, chave: string): string {
  const centro = `${lat.toFixed(6)},${lng.toFixed(6)}`
  const q = new URLSearchParams({ center: centro, zoom: '17', size: '450x350', scale: '2', maptype: 'roadmap', language: 'pt-BR', markers: `color:red|${centro}`, key: chave })
  return `https://maps.googleapis.com/maps/api/staticmap?${q.toString()}`
}

async function comTempo(url: string, fetchFn: typeof fetch): Promise<Response> {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TEMPO_MAXIMO_MS)
  try { return await fetchFn(url, { signal: c.signal, cache: 'no-store' }) } finally { clearTimeout(t) }
}

export async function gerarCroqui(e: EnderecoCroqui, chave: string, fetchFn: typeof fetch = fetch): Promise<ResultadoCroqui> {
  const indisponivel: ResultadoCroqui = { ok: false, status: 502, erro: 'O serviço de mapas não respondeu agora. Tente de novo em instantes ou envie a imagem manualmente.' }
  try {
    const rg = await comTempo(urlGeocode(enderecoParaBusca(e), chave), fetchFn)
    if (!rg.ok) { console.error('[croqui] geocoding http=%s', rg.status); return indisponivel }
    const g = await rg.json() as { status?: string; results?: { geometry?: { location?: { lat: number; lng: number }; location_type?: string }; partial_match?: boolean }[] }
    if (g.status === 'ZERO_RESULTS') return { ok: false, status: 404, erro: 'Endereço não localizado no mapa. Confira o CEP e o número ou envie a imagem manualmente.' }
    const r0 = g.status === 'OK' ? g.results?.[0] : undefined
    const loc = r0?.geometry?.location
    if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) { console.error('[croqui] geocoding status=%s', g.status ?? '-'); return indisponivel }

    const tipo = r0?.geometry?.location_type ?? ''
    const aproximado = !(tipo === 'ROOFTOP' || tipo === 'RANGE_INTERPOLATED') || r0?.partial_match === true || !limpar(e.numero)

    const rm = await comTempo(urlMapa(loc.lat, loc.lng, chave), fetchFn)
    const mime = (rm.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!rm.ok || !mime.startsWith('image/')) { console.error('[croqui] mapa http=%s tipo=%s', rm.status, mime || '-'); return indisponivel }
    const bytes = Buffer.from(await rm.arrayBuffer())
    if (bytes.length === 0 || bytes.length > LIMITE_BYTES_IMAGEM) return indisponivel
    return { ok: true, imagem: `data:${mime};base64,${bytes.toString('base64')}`, aproximado }
  } catch (err) {
    console.error('[croqui] falha: %s', err instanceof Error ? err.name : 'erro')
    return indisponivel
  }
}

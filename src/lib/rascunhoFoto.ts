// src/lib/rascunhoFoto.ts
// AIMÊ — Foto do RASCUNHO da vistoria (telas 31 a 38), guardada no aparelho.
//
// PROBLEMA (08/10/2026, serviço 32): em celulares e tablets, abrir a câmera costuma fazer o navegador DESCARTAR a aba por
// falta de memória; ao voltar, a tela recarrega. O rascunho automático recuperava os campos, mas NÃO a foto, que sumia:
// era preciso tirar a foto de novo e só então salvar ("salvou no segundo ciclo"), a cada vistoria. O aviso ainda dizia
// "problema de salvamento", o que parecia falha do servidor.
//
// SOLUÇÃO: a foto (já comprimida pela tela) é guardada em IndexedDB (que aguenta imagens; o localStorage só serve de
// reserva) atrelada à chave do rascunho e ao token da sessão, e é restaurada depois do recarregamento. É apagada quando
// a vistoria é salva ou a foto é removida; foto de outra sessão ou com mais de 12 h é descartada.
// Nada aqui lança erro: se o aparelho não deixar guardar, a tela segue como antes.

const BANCO = 'aime-rascunho'
const LOJA = 'fotos'
export const VALIDADE_FOTO_MS = 12 * 60 * 60 * 1000

type Registro = { sessao: string; dataUrl: string; quando: number }

function abrir(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(BANCO, 1)
      req.onupgradeneeded = () => { try { req.result.createObjectStore(LOJA) } catch { /* já existe */ } }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch { resolve(null) }
  })
}

async function idb<T>(modo: IDBTransactionMode, fn: (loja: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null | undefined> {
  const db = await abrir()
  if (!db) return undefined               // IndexedDB indisponível: o chamador usa a reserva
  return new Promise(resolve => {
    try {
      const tx = db.transaction(LOJA, modo)
      const req = fn(tx.objectStore(LOJA))
      tx.oncomplete = () => { db.close(); resolve(req ? (req.result as T) : null) }
      tx.onerror = tx.onabort = () => { db.close(); resolve(undefined) }
    } catch { try { db.close() } catch { /* */ } resolve(undefined) }
  })
}

const chaveReserva = (chave: string) => `${chave}__foto`

export async function guardarFotoDoRascunho(chave: string, sessao: string, dataUrl: string): Promise<void> {
  if (!chave || !dataUrl) return
  const reg: Registro = { sessao, dataUrl, quando: Date.now() }
  const r = await idb('readwrite', loja => loja.put(reg, chave))
  if (r === undefined) { try { localStorage.setItem(chaveReserva(chave), JSON.stringify(reg)) } catch { /* sem espaço: segue sem guardar */ } }
}

/** A foto guardada para este rascunho, ou null. Descarta (apaga) a de outra sessão ou muito antiga. */
export async function lerFotoDoRascunho(chave: string, sessao: string): Promise<string | null> {
  if (!chave) return null
  let reg = (await idb<Registro>('readonly', loja => loja.get(chave) as IDBRequest<Registro>)) ?? null
  if (!reg) { try { const r = localStorage.getItem(chaveReserva(chave)); if (r) reg = JSON.parse(r) } catch { /* */ } }
  if (!reg || !reg.dataUrl) return null
  const velha = Date.now() - (reg.quando || 0) > VALIDADE_FOTO_MS
  if (velha || !reg.sessao || reg.sessao !== sessao) { await apagarFotoDoRascunho(chave); return null }
  return reg.dataUrl
}

export async function apagarFotoDoRascunho(chave: string): Promise<void> {
  if (!chave) return
  await idb('readwrite', loja => loja.delete(chave))
  try { localStorage.removeItem(chaveReserva(chave)) } catch { /* */ }
}

// ── Marca de "câmera aberta" ──────────────────────────────────────────────────────────────────────────────────
// Se a aba cair com a câmera aberta, a foto nunca chega à tela e, quando a foto é tirada ANTES de preencher o resto,
// não existe rascunho: a tela voltava vazia e muda. A marca grava que a câmera foi aberta; na recarga, a tela avisa o
// que houve. É limpa quando a foto chega, ou quando a página sobrevive à câmera.
export const VALIDADE_MARCA_CAMERA_MS = 15 * 60 * 1000
const chaveCamera = (chave: string) => `${chave}__camera`

export function marcarCameraAberta(chave: string, sessao: string): void {
  try { localStorage.setItem(chaveCamera(chave), JSON.stringify({ sessao, quando: Date.now() })) } catch { /* sem espaço: segue */ }
}

export function limparMarcaCamera(chave: string): void {
  try { localStorage.removeItem(chaveCamera(chave)) } catch { /* */ }
}

/** A câmera ficou aberta e a aba recarregou? (mesma sessão, até 15 min). Lê e APAGA a marca. */
export function cameraFicouAberta(chave: string, sessao: string): boolean {
  try {
    const r = localStorage.getItem(chaveCamera(chave))
    if (!r) return false
    localStorage.removeItem(chaveCamera(chave))
    const m = JSON.parse(r) as { sessao?: string; quando?: number }
    return !!m.sessao && m.sessao === sessao && Date.now() - (m.quando || 0) <= VALIDADE_MARCA_CAMERA_MS
  } catch { return false }
}

import { chaveParaSincronizar } from '@/lib/nomeArquivo'
// Utilitário para salvar/recuperar vistorias offline via IndexedDB

const DB_NAME    = 'aime-offline'
const DB_VERSION = 2
const STORE_NAME = 'vistorias_pendentes'

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result)
    req.onerror   = () => reject(req.error)
  })
}

export async function salvarOffline(dados: Record<string, unknown>): Promise<number> {
  const db  = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite')
    const str = tx.objectStore(STORE_NAME)
    const req = str.add({ ...dados, savedOfflineAt: new Date().toISOString() })
    req.onsuccess = () => resolve(req.result as number)
    req.onerror   = () => reject(req.error)
  })
}

export async function listarPendentes(): Promise<any[]> {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly')
    const str = tx.objectStore(STORE_NAME)
    const req = str.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

export async function removerPendente(id: number): Promise<void> {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite')
    const str = tx.objectStore(STORE_NAME)
    const req = str.delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

/**
 * Guarda no item da fila o número da foto obtido na sincronização. Se o app for interrompido depois de o servidor gravar a vistoria e
 * antes de apagar o item, a próxima tentativa REAPROVEITA este número: reenvia o mesmo arquivo (sobrescreve) e o débito, que usa o
 * número como referência, não se repete. Sem isso, cada tentativa pedia um número novo, gravava um segundo arquivo e cobrava de novo.
 */
async function guardarNumeroDaFoto(id: number, nr: string): Promise<void> {
  try {
    const db = await abrirDB()
    await new Promise<void>(resolve => {
      const tx  = db.transaction(STORE_NAME, 'readwrite')
      const str = tx.objectStore(STORE_NAME)
      const get = str.get(id)
      get.onsuccess = () => { const registro = get.result; if (registro) { registro.nrSincronizacao = nr; str.put(registro) } }
      tx.oncomplete = () => resolve()
      tx.onerror    = () => resolve()
      tx.onabort    = () => resolve()
    })
  } catch { /* se não conseguir guardar, segue como antes */ }
}

/**
 * Só um sincronizador por vez (o app e o service worker, em segundo plano, percorrem a MESMA fila): o segundo que chegar não faz nada.
 * Usa o Web Locks, compartilhado entre janelas e service worker da mesma origem; sem suporte, segue sem trava (como antes).
 */
async function comTrava<T>(fn: () => Promise<T>, quandoOcupado: T): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? (navigator as any).locks : undefined
  if (!locks?.request) return fn()
  return locks.request('aime-sync-vistorias', { ifAvailable: true }, async (lock: unknown) => (lock ? fn() : quandoOcupado))
}

export async function sincronizarPendentes(
  onProgresso?: (msg: string) => void
): Promise<{ ok: number; erro: number }> {
  return comTrava(() => sincronizarSemTrava(onProgresso), { ok: 0, erro: 0 })
}

async function sincronizarSemTrava(
  onProgresso?: (msg: string) => void
): Promise<{ ok: number; erro: number }> {
  const pendentes = await listarPendentes()
  if (pendentes.length === 0) return { ok: 0, erro: 0 }

  let ok = 0, erro = 0

  for (const item of pendentes) {
    try {
      onProgresso?.(`Sincronizando vistoria ${ok + erro + 1}/${pendentes.length}...`)

      // Se NC/CP estão vazias e tem dados suficientes para gerar — chama a IA primeiro
      let { nc, cp } = item.payload ?? item
      const precisa_ia = (!nc || !cp) && item.payload?.sistema && item.payload?.anomalia

      if (precisa_ia) {
        onProgresso?.(`Gerando NC/CP via IA para vistoria ${ok + 1}...`)
        try {
          const resIA = await fetch('/api/gerar-nc-cp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sistema:      item.payload?.sistema,
              subsistema:   item.payload?.subsistema,
              anomalia:     item.payload?.anomalia,
              local:        item.payload?.local,
              complemento:  item.payload?.complemento,
              origem:       item.payload?.origem,
              abrangencia:  item.payload?.descAbrangencia ?? item.payload?.abrangencia,
            })
          })
          if (resIA.ok) {
            const d = await resIA.json()
            nc = d.nc || d.nao_conformidade || nc
            cp = d.cp || d.causa_provavel || cp
          }
        } catch {}
      }

      // Obter número da foto: reaproveita o da tentativa anterior, se houve (ver guardarNumeroDaFoto)
      let nrFinal = item.nrSincronizacao as string | undefined
      if (!nrFinal) {
        const nrRes = await fetch('/api/foto-nr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpf_inspetor: item.cpfInspetor ?? item.payload?.cpfInspetor,
            cnpjoucpf:    item.cnpjoucpf   ?? item.payload?.cnpjoucpf,
            tipo_servico: item.tipoServico  ?? item.payload?.tipoServico,
          })
        })
        const nrData = await nrRes.json()
        nrFinal = nrData?.formatado ?? item.payload?.fotoNr ?? item.fotoNr
        if (nrFinal) await guardarNumeroDaFoto(item.id, String(nrFinal))
      }

      // Chave INS-nnn guardada antes da migração para o CPF vira o CPF do dono (senão o servidor recusa o arquivo e ele fica preso na fila)
      const chave  = chaveParaSincronizar(
        item.chaveInspetor ?? item.payload?.chaveInspetor,
        item.cpfEletrico ?? item.payload?.cpfEletrico ?? item.cpfInspetor ?? item.payload?.cpfInspetor,
      )
      const cnpj   = item.cnpjoucpf    ?? item.payload?.cnpjoucpf
      const tipo   = item.tipoServico  ?? item.payload?.tipoServico
      const nomeArquivo = `${chave}_${cnpj}_${tipo}_${nrFinal}.json`

      const payload = { ...(item.payload ?? item), nc, cp, fotoNr: nrFinal, chaveInspetor: chave }
      delete payload.id
      delete payload.savedOfflineAt

      const res = await fetch('/api/salvar-vistoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeArquivo, payload })
      })

      if (res.ok) {
        await removerPendente(item.id)
        ok++
        onProgresso?.(`✅ Vistoria ${ok} sincronizada com sucesso!`)
      } else {
        erro++
      }
    } catch {
      erro++
    }
  }

  return { ok, erro }
}

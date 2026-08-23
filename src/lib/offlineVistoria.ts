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

export async function sincronizarPendentes(
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

      // Obter número da foto
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
      const nrFinal = nrData?.formatado ?? item.payload?.fotoNr ?? item.fotoNr

      const chave  = item.chaveInspetor ?? item.payload?.chaveInspetor
      const cnpj   = item.cnpjoucpf    ?? item.payload?.cnpjoucpf
      const tipo   = item.tipoServico  ?? item.payload?.tipoServico
      const nomeArquivo = `${chave}_${cnpj}_${tipo}_${nrFinal}.json`

      const payload = { ...(item.payload ?? item), nc, cp, fotoNr: nrFinal }
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

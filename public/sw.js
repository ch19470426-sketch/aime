// AIMÊ Service Worker — offline para vistorias 31-38
const CACHE_STATIC = 'aime-static-v1'
const CACHE_PAGES  = 'aime-pages-v1'
const SYNC_TAG     = 'aime-sync-vistoria'

// Assets que devem estar disponíveis offline
const ASSETS_STATIC = [
  '/',
  '/dashboard',
  '/logo.png',
  '/mie_orienta.png',
  '/mie_informa.png',
  '/mie_solicita.png',
  '/mie_obridado.png',
  '/fluxo-aime.png',
]

// Rotas de vistoria que devem funcionar offline
const VISTORIA_ROUTES = [
  '/vistoria/tela31', '/vistoria/tela32', '/vistoria/tela33', '/vistoria/tela34',
  '/vistoria/tela35', '/vistoria/tela36', '/vistoria/tela37', '/vistoria/tela38',
]

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(cache =>
      cache.addAll([...ASSETS_STATIC, ...VISTORIA_ROUTES])
    ).catch(() => {}) // não bloqueia se algum asset falhar
  )
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_STATIC && k !== CACHE_PAGES)
        .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Ignorar: extensões do Chrome, Supabase (dados online), não-GET
  if (request.method !== 'GET') return
  if (url.hostname.includes('supabase')) return
  if (url.protocol === 'chrome-extension:') return

  // Assets estáticos (_next/static, imagens): Cache First
  if (url.pathname.startsWith('/_next/static') ||
      url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?)$/)) {
    e.respondWith(
      caches.match(request).then(cached => cached ||
        fetch(request).then(res => {
          const clone = res.clone()
          caches.open(CACHE_STATIC).then(c => c.put(request, clone))
          return res
        })
      )
    )
    return
  }

  // Telas de vistoria: Network First com fallback para cache
  const isVistoria = VISTORIA_ROUTES.some(r => url.pathname.startsWith(r))
  if (isVistoria || url.pathname === '/dashboard' || url.pathname === '/') {
    e.respondWith(
      fetch(request).then(res => {
        const clone = res.clone()
        caches.open(CACHE_PAGES).then(c => c.put(request, clone))
        return res
      }).catch(() => caches.match(request))
    )
    return
  }

  // Demais: Network First simples
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})

// ── Background Sync ───────────────────────────────────────────────────────────
// Quando o inspetor salva uma vistoria offline, ela fica em IndexedDB.
// Ao recuperar conexão, o sync é disparado automaticamente.
self.addEventListener('sync', (e) => {
  if (e.tag === SYNC_TAG) {
    e.waitUntil(syncVistorias())
  }
})

async function syncVistorias() {
  // Abre o IndexedDB 'aime-offline' e envia os registros pendentes
  try {
    const db = await openDB()
    const registros = await getAllPendentes(db)
    for (const reg of registros) {
      try {
        const res = await fetch('/api/salvar-vistoria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reg.payload),
        })
        if (res.ok) await deletePendente(db, reg.id)
      } catch { /* mantém na fila */ }
    }
  } catch { /* IndexedDB indisponível */ }
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('aime-offline', 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('pendentes', { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getAllPendentes(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendentes', 'readonly')
    const req = tx.objectStore('pendentes').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function deletePendente(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendentes', 'readwrite')
    const req = tx.objectStore('pendentes').delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

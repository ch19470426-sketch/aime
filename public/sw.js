// AIMÊ Service Worker — offline para vistorias 31-38
const CACHE_VER     = 'aime-v4'
const CACHE_STATIC  = CACHE_VER + '-static'
const CACHE_PAGES   = CACHE_VER + '-pages'
const CACHE_API     = CACHE_VER + '-api'

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

const VISTORIA_ROUTES = [
  '/vistoria/tela31', '/vistoria/tela32', '/vistoria/tela33', '/vistoria/tela34',
  '/vistoria/tela35', '/vistoria/tela36', '/vistoria/tela37', '/vistoria/tela38',
]

// APIs que devem ter resposta offline quando falham
const API_OFFLINE_RESPONSES = {
  '/api/gerar-nc-cp': {
    ok: false,
    status: 503,
    body: JSON.stringify({
      erro: 'Sem conexão com internet. A NC foi registrada localmente. Sincronize quando reconectar.',
      offline: true
    })
  },
  '/api/criticidade-gut': {
    ok: true,
    status: 200,
    body: JSON.stringify({ valorGut: {}, percentuais: {} }) // usa fallback hardcoded
  },
  '/api/tabela-parametros': {
    ok: true,
    status: 200,
    body: JSON.stringify([])
  }
}

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(cache =>
      cache.addAll([...ASSETS_STATIC, ...VISTORIA_ROUTES])
    ).then(() => self.skipWaiting())
  )
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_STATIC && k !== CACHE_PAGES && k !== CACHE_API)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Ignorar: extensões do Chrome, Supabase (dados online)
  if (url.protocol === 'chrome-extension:') return
  if (url.hostname.includes('supabase')) return

  // ── APIs: Network First com fallback offline específico ──────────────────
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request.clone()).then(res => {
        // Cachear APIs GET bem-sucedidas
        if (request.method === 'GET' && res.ok) {
          const clone = res.clone()
          caches.open(CACHE_API).then(c => c.put(request, clone))
        }
        return res
      }).catch(async () => {
        // Tentar cache para GETs
        if (request.method === 'GET') {
          const cached = await caches.match(request)
          if (cached) return cached
        }
        // Resposta offline configurada
        const apiPath = url.pathname
        const offlineResp = API_OFFLINE_RESPONSES[apiPath]
        if (offlineResp) {
          return new Response(offlineResp.body, {
            status: offlineResp.status,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        // Fallback genérico para APIs desconhecidas
        return new Response(
          JSON.stringify({ erro: 'Sem conexão. Tente novamente quando reconectar.', offline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      })
    )
    return
  }

  // ── Assets estáticos: Cache First ────────────────────────────────────────
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

  // ── Telas de vistoria e dashboard: Network First + cache fallback ─────────
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

  // ── Demais: Network First com fallback de cache ───────────────────────────
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', (e) => {
  if (e.tag === 'aime-sync-vistoria') {
    e.waitUntil(sincronizarVistorias())
  }
})

async function sincronizarVistorias() {
  const req = indexedDB.open('aime-offline', 1)
  req.onsuccess = async () => {
    const db = req.result
    if (!db.objectStoreNames.contains('vistorias_pendentes')) return
    const tx  = db.transaction('vistorias_pendentes', 'readwrite')
    const str = tx.objectStore('vistorias_pendentes')
    const all = str.getAll()
    all.onsuccess = async () => {
      for (const item of all.result) {
        try {
          const res = await fetch('/api/salvar-vistoria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          })
          if (res.ok) str.delete(item.id)
        } catch {}
      }
    }
  }
}

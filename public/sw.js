// AIMÊ Service Worker — offline para vistorias 31-38
const CACHE_VER     = 'aime-v7'
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
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
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
    // Não interceptar requisições de sync (marcadas com Cache-Control: no-store)
    if (request.headers.get('Cache-Control') === 'no-store') {
      return  // deixar passar direto para a rede
    }
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

async function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('aime-offline', 2)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('vistorias_pendentes'))
        db.createObjectStore('vistorias_pendentes', { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror   = () => reject(req.error)
  })
}

async function sincronizarVistorias() {
  const db      = await abrirDB()
  const tx      = db.transaction('vistorias_pendentes', 'readwrite')
  const store   = tx.objectStore('vistorias_pendentes')
  const pendentes = await new Promise(res => { const r = store.getAll(); r.onsuccess = () => res(r.result) })

  for (const item of pendentes) {
    try {
      const payload = item.payload ?? item
      let { nc, cp } = payload

      // Gerar NC/CP via IA se estiver pendente
      if (item.nc_pendente && payload.sistema && payload.anomalia) {
        try {
          const resIA = await fetch('/api/gerar-nc-cp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sistema: payload.sistema, subsistema: payload.subsistema,
              anomalia: payload.anomalia, local: payload.local,
              complemento: payload.complemento, origem: payload.origem,
              abrangencia: payload.descAbrangencia ?? payload.abrangencia,
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
          cpf_inspetor: payload.cpfInspetor,
          cnpjoucpf:    payload.cnpjoucpf,
          tipo_servico: payload.tipoServico,
        })
      })
      const nrData  = await nrRes.json()
      const nrFinal = nrData?.formatado ?? payload.fotoNr

      const nomeArquivo = `${payload.chaveInspetor}_${payload.cnpjoucpf}_${payload.tipoServico}_${nrFinal}.json`
      const dadosFinal  = { ...payload, nc, cp, fotoNr: nrFinal, savedAt: new Date().toISOString() }
      delete dadosFinal.nc_pendente

      const res = await fetch('/api/salvar-vistoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeArquivo, payload: dadosFinal })
      })

      if (res.ok) {
        const tx2  = db.transaction('vistorias_pendentes', 'readwrite')
        const str2 = tx2.objectStore('vistorias_pendentes')
        str2.delete(item.id)
      }
    } catch {}
  }
}

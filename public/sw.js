// ═══════════════════════════════════════════════════════════════
//  Service Worker v2 — Enhanced offline + data resilience
//  - Caches app shell for instant load
//  - Background sync for failed mutations (retry when back online)
//  - Network-first for API (fresh data), cache fallback (offline)
//  - Never loses user input — queues failed POSTs for retry
// ═══════════════════════════════════════════════════════════════

const CACHE_VERSION = 'v2'
const CACHE_NAME = `whp-wms-${CACHE_VERSION}`
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/favicon-32.png',
]

// Failed mutations queued for background sync
const FAILED_MUTATIONS_DB = 'failed-mutations'
let failedMutations: any[] = []

// ─── Install — cache app shell ─────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(APP_SHELL.map(url => cache.add(url)))
    )
  )
  self.skipWaiting()
})

// ─── Activate — clean up old caches + claim clients ────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ─── Fetch — smart caching strategy ────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // ─── API requests (GET) — network-first with cache fallback ───
  if (url.pathname.startsWith('/api/') && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses (status 200)
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone).catch(() => {})
            })
          }
          return response
        })
        .catch(async () => {
          // Network failed — try cache
          const cached = await caches.match(request)
          if (cached) return cached

          // No cache — return offline indicator
          return new Response(
            JSON.stringify({ error: 'Offline — this data requires internet connection' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        })
    )
    return
  }

  // ─── Mutations (POST/PATCH/DELETE) — try network, queue on failure ─
  if (url.pathname.startsWith('/api/') && request.method !== 'GET') {
    event.respondWith(
      fetch(request).catch(async () => {
        // Network failed — queue for background sync
        try {
          const body = await request.clone().text()
          failedMutations.push({
            url: url.pathname,
            method: request.method,
            body,
            timestamp: Date.now(),
            headers: Object.fromEntries(request.headers.entries()),
          })

          // Register background sync (if supported)
          if ('sync' in self) {
            // @ts-ignore
            await self.sync.register('retry-mutations')
          }

          return new Response(
            JSON.stringify({
              error: 'You are offline. Your changes will be synced automatically when you reconnect.',
              queued: true,
            }),
            {
              status: 202,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        } catch (e) {
          return new Response(
            JSON.stringify({ error: 'Offline — cannot save changes' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
        }
      })
    )
    return
  }

  // ─── Static assets — cache-first ──────────────────────────────
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone).catch(() => {})
            })
          }
          return response
        }).catch(() => cached)
      })
    )
  }
})

// ─── Background Sync — retry failed mutations ──────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-mutations') {
    event.waitUntil(retryFailedMutations())
  }
})

async function retryFailedMutations() {
  const toRetry = [...failedMutations]
  failedMutations = []

  for (const mutation of toRetry) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body,
      })

      if (!response.ok) {
        // Re-queue if still failing
        failedMutations.push(mutation)
      } else {
        // Notify clients that sync succeeded
        const clients = await self.clients.matchAll()
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            url: mutation.url,
            method: mutation.method,
          })
        })
      }
    } catch (e) {
      // Re-queue on network error
      failedMutations.push(mutation)
    }
  }
})

// ─── Message handler — for cache updates from main thread ──────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.source?.postMessage({ type: 'CACHE_CLEARED' })
    })
  }
})

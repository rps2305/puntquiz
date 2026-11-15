/* PuntQuiz service worker. Purpose: make the app installable and give a friendly page when offline.
 * Safety rule: live quiz data is NEVER cached or intercepted (/api, /socket.io, cross-origin, non-GET),
 * so a player can never see a stale question, score or timer from this worker. */
const VERSION = 'pq-v2'
const STATIC = `${VERSION}-static`
const OFFLINE = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC).then((c) => c.addAll([OFFLINE, '/icons/icon-192.png', '/icons/icon-512.png'])).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // Authentik, fonts, YouTube: the browser handles these
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return // live data: network only, untouched

  // Pages: always the network; only when offline show the friendly fallback.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)))
    return
  }

  // Build assets have content-hashed names, so cache-first is safe and makes repeat visits fast on weak mobile networks.
  if (url.pathname.startsWith('/_nuxt/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      }),
    )
  }
})

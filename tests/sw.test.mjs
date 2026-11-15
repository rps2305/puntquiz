// Unit test of the service worker's fetch rules with a mocked browser environment: node tests/sw.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const listeners = {}
const store = new Map() // cache name -> Map(url -> response)
const fetched = []
let online = true

const caches = {
  open: async (name) => {
    if (!store.has(name)) store.set(name, new Map())
    const m = store.get(name)
    return { addAll: async (urls) => urls.forEach((u) => m.set(new URL(u, 'https://x.nl').pathname, 'cached:' + u)), match: async (req) => m.get(new URL(req.url).pathname), put: async (req, res) => m.set(new URL(req.url).pathname, res), keys: async () => [...m.keys()] }
  },
  keys: async () => [...store.keys()],
  delete: async (k) => store.delete(k),
  match: async (u) => { for (const m of store.values()) if (m.has(u)) return m.get(u) },
}
const self = { location: { origin: 'https://puntquiz.test' }, addEventListener: (t, fn) => (listeners[t] = fn), skipWaiting: async () => {}, clients: { claim: async () => {} } }
const fetchMock = async (req) => { fetched.push(req.url); if (!online) throw new Error('offline'); return { ok: true, url: req.url, clone() { return this } } }
vm.runInNewContext(readFileSync(new URL('../apps/web/public/sw.js', import.meta.url), 'utf8'), { self, caches, fetch: fetchMock, URL, Promise })

const run = async (type, extra = {}) => {
  let waited = null, responded = false, result
  await listeners[type]({ waitUntil: (p) => (waited = p), respondWith: (p) => ((responded = true), (result = p)), ...extra })
  if (waited) await waited
  return { responded, value: responded ? await result : undefined }
}
const req = (url, o = {}) => ({ request: { url: 'https://puntquiz.test' + url, method: 'GET', mode: 'cors', ...o } })

await run('install')
assert.ok(store.get('pq-v2-static').has('/offline.html'), 'offline page is precached')

// live data is never intercepted
for (const u of ['/api/live/123', '/api/health', '/api/media/abc', '/socket.io/?EIO=4']) assert.equal((await run('fetch', req(u))).responded, false, `${u} must pass through untouched`)
assert.equal((await run('fetch', req('/x', { method: 'POST' }))).responded, false, 'non-GET is ignored')
assert.equal((await run('fetch', { request: { url: 'https://auth.example/x', method: 'GET', mode: 'cors' } })).responded, false, 'cross-origin is ignored')

// pages: network first, offline fallback only when the network fails
let r = await run('fetch', req('/play/ABC', { mode: 'navigate' }))
assert.equal(r.responded, true); assert.equal(r.value.url, 'https://puntquiz.test/play/ABC', 'online: real page, not a cached copy')
online = false
r = await run('fetch', req('/play/ABC', { mode: 'navigate' }))
assert.equal(r.value, 'cached:/offline.html', 'offline: friendly fallback page')
online = true

// hashed build assets are cache-first
await run('fetch', req('/_nuxt/entry.abc123.js'))
const before = fetched.length
await run('fetch', req('/_nuxt/entry.abc123.js'))
assert.equal(fetched.length, before, 'second request is served from cache, no network')

// old caches are removed on activate
store.set('pq-v1-static', new Map())
await run('activate')
assert.ok(!store.has('pq-v1-static') && store.has('pq-v2-static'))
console.log('service worker rules OK')

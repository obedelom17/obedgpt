// ═══════════════════════════════════════════════════════════════
//  Cloudflare Pages Functions : adaptateur pour les routes /api/*
//  Les handlers du dossier api/ (écrits pour Vercel : req/res de type Node)
//  sont réutilisés tels quels. Ce fichier traduit Request/Response (Workers)
//  vers un faux req/res, y compris le streaming NDJSON du chat.
//  Les modules sont importés à la demande, APRÈS avoir copié les variables
//  d'environnement Cloudflare dans process.env (ils les lisent au chargement).
// ═══════════════════════════════════════════════════════════════
const ROUTES = {
  chat: () => import('../../api/chat.js'),
  code: () => import('../../api/code.js'),
  models: () => import('../../api/models.js'),
  transcribe: () => import('../../api/transcribe.js'),
  speech: () => import('../../api/speech.js'),
  agent: () => import('../../api/agent.js'),
  tools: () => import('../../api/tools.js'),
  batch: () => import('../../api/batch.js'),
  share: () => import('../../api/share.js'),
  auth: () => import('../../api/auth.js'),
  sync: () => import('../../api/sync.js'),
  image: () => import('../../api/image.js'),
}

// Limite globale par IP (120 requêtes/min, par instance Workers). Complète les limites par route.
const GLOBAL = new Map()
function globalLimit(ip) {
  const now = Date.now()
  if (GLOBAL.size > 3000) GLOBAL.clear()
  const e = GLOBAL.get(ip)
  if (!e || now > e.reset) { GLOBAL.set(ip, { n: 1, reset: now + 60_000 }); return 0 }
  return ++e.n > 120 ? Math.ceil((e.reset - now) / 1000) : 0
}

const jsonResponse = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })

function makeRes(signal) {
  let status = 200
  const headers = new Headers()
  const closeCbs = []
  let resolve
  const promise = new Promise(r => { resolve = r })
  let writer = null
  const enc = new TextEncoder()
  signal.addEventListener('abort', () => closeCbs.forEach(f => { try { f() } catch {} }))

  const startStream = () => {
    if (writer) return
    const { readable, writable } = new TransformStream()
    writer = writable.getWriter()
    res.headersSent = true
    resolve(new Response(readable, { status, headers }))
  }
  const finish = body => {
    res.headersSent = true
    resolve(new Response(status === 204 || status === 304 ? null : body, { status, headers }))
  }
  const res = {
    headersSent: false,
    status(s) { status = s; return res },
    setHeader(k, v) { headers.set(k, Array.isArray(v) ? v.join(', ') : String(v)) },
    getHeader(k) { return headers.get(k) },
    writeHead(s, h) { status = s; for (const k in h || {}) headers.set(k, h[k]); startStream(); return res },
    write(c) { if (!writer) startStream(); writer.write(typeof c === 'string' ? enc.encode(c) : c).catch(() => {}); return true },
    end(c) {
      if (writer) { if (c != null) writer.write(typeof c === 'string' ? enc.encode(c) : c).catch(() => {}); writer.close().catch(() => {}) }
      else finish(c ?? null)
    },
    json(o) { if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8'); finish(JSON.stringify(o)); return res },
    send(b) { finish(b); return res },
    on(ev, f) { if (ev === 'close') closeCbs.push(f) },
  }
  return { res, promise }
}

export async function onRequest(context) {
  const { request, env, params } = context
  const name = Array.isArray(params.route) ? params.route[0] : params.route
  const load = ROUTES[name]
  if (!load) return jsonResponse(404, { error: 'Route inconnue.', type: 'NOT_FOUND' })
  const wait = globalLimit(request.headers.get('cf-connecting-ip') || 'unknown')
  if (wait) return jsonResponse(429, { error: `Trop de requêtes. Réessayez dans ${wait}s.`, type: 'RATE_LIMIT', retryAfter: wait })

  // Bindings (KV) accessibles aux handlers ; variables texte → process.env
  globalThis.__CF_ENV = env
  // Variables Cloudflare (secrets et variables du projet) → process.env
  globalThis.process ??= { env: {} }
  process.env ??= {}
  for (const [k, v] of Object.entries(env || {})) if (typeof v === 'string') process.env[k] = v

  let mod
  try { mod = await load() } catch (e) { return jsonResponse(500, { error: 'Chargement impossible : ' + e.message, type: 'SERVER' }) }
  const handler = mod.default

  const url = new URL(request.url)
  const headers = Object.fromEntries(request.headers)
  headers['x-real-ip'] = headers['cf-connecting-ip'] || headers['x-real-ip'] || ''
  const rawBody = mod.config?.api?.bodyParser === false
  let body
  if (!rawBody && request.method !== 'GET' && request.method !== 'HEAD') {
    const ct = headers['content-type'] || ''
    try { body = ct.includes('application/json') ? await request.json() : await request.text() } catch { body = undefined }
  }
  const req = {
    method: request.method, url: url.pathname + url.search, headers, body,
    query: Object.fromEntries(url.searchParams), socket: { remoteAddress: headers['x-real-ip'] }, on() {},
    async *[Symbol.asyncIterator]() { if (request.body) for await (const c of request.body) yield c },
  }
  const { res, promise } = makeRes(request.signal)
  const run = Promise.resolve(handler(req, res)).catch(e => {
    if (!res.headersSent) res.status(500).json({ error: 'Erreur serveur : ' + (e?.message || e), type: 'SERVER' })
    else try { res.end() } catch {}
  })
  context.waitUntil?.(run)
  return promise
}

// ═══════════════════════════════════════════════════════════════
//  groqCore : socle commun de toutes les routes API ObedGPT.
//  Appelle l'API Groq (compatible OpenAI) avec `fetch` pour ne dépendre
//  d'aucune version de SDK : chat, vision, audio, TTS, batch, MCP...
//  Rotation automatique entre plusieurs clés (GROQ_API_KEYS=k1,k2,k3).
// ═══════════════════════════════════════════════════════════════

// GROQ_BASE_URL permet de passer par Cloudflare AI Gateway (cache, logs, limites) ou un proxy.
export const BASE = (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '')
const KEYS = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean)
export const hasKeys = () => KEYS.length > 0
export const keyCount = () => KEYS.length
export const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
let cursor = 0

// ─── Limitation par IP (par « seau » : chat, audio, outils...) ───
const RATE_MAX = Number(process.env.RATE_LIMIT_MAX) || 20
const RATE_WINDOW = 60_000
const buckets = new Map()
export function clientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown'
}
export function checkRate(req, bucket = 'chat', max = RATE_MAX) {
  const now = Date.now()
  if (buckets.size > 2000) buckets.clear()
  const k = `${bucket}:${clientIP(req)}`
  const e = buckets.get(k)
  if (!e || now > e.resetAt) { buckets.set(k, { count: 1, resetAt: now + RATE_WINDOW }); return { ok: true } }
  if (e.count >= max) return { ok: false, retryAfter: Math.ceil((e.resetAt - now) / 1000) }
  e.count++
  return { ok: true }
}

export function fail(res, status, error, type = 'ERROR', extra = {}) {
  if (res.headersSent) { try { res.end() } catch {} ; return }
  return res.status(status).json({ error, type, ...extra })
}

// Garde-fous communs : retourne true si la réponse a déjà été envoyée.
export function guard(req, res, bucket = 'chat', max) {
  const r = checkRate(req, bucket, max)
  if (!r.ok) { fail(res, 429, `Trop de requêtes. Réessayez dans ${r.retryAfter}s.`, 'RATE_LIMIT', { retryAfter: r.retryAfter }); return true }
  if (!hasKeys()) { fail(res, 503, 'Aucune clé Groq configurée (variable GROQ_API_KEYS).', 'NO_GROQ_KEYS'); return true }
  return false
}

// ─── Appel avec rotation de clés ───
// `run(key)` doit retourner une Response fetch. On passe à la clé suivante
// uniquement sur 429 (quota) ; toute autre réponse est rendue telle quelle.
export async function withKeys(run) {
  let last = null
  for (let i = 0; i < KEYS.length; i++) {
    const idx = (cursor + i) % KEYS.length
    let r
    try { r = await run(KEYS[idx], idx) } catch (e) { if (e.name === 'AbortError') throw e; last = last || { status: 502, networkError: e }; continue }
    if (r.status === 429) { last = r; continue }
    cursor = idx
    return { res: r, keyIndex: idx }
  }
  return { res: last && last.status ? last : null, keyIndex: -1, exhausted: true }
}

export const jsonInit = (payload, signal) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal })
export const groqFetch = (path, init, key) => fetch(BASE + path, { ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${key}` } })

export async function readError(r) {
  if (!r) return { status: 503, message: 'Service Groq injoignable.', code: 'NETWORK' }
  let body = null
  try { body = await r.json() } catch {}
  return { status: r.status, message: body?.error?.message || `Erreur Groq (HTTP ${r.status})`, code: body?.error?.code || body?.error?.type || '' }
}

// Convertit une erreur Groq en réponse JSON claire pour l'interface.
export function sendGroqError(res, err, exhausted) {
  if (exhausted || err.status === 429) return fail(res, 429, 'Quota Groq atteint sur toutes les clés. Réessayez dans quelques instants.', 'ALL_SERVICES_DOWN')
  if (err.status === 401) return fail(res, 503, 'Clé Groq invalide ou expirée.', 'BAD_KEY')
  if (/terms/i.test(err.message)) return fail(res, 403, "Ce modèle demande d'accepter ses conditions dans la console Groq (console.groq.com → Playground → ce modèle).", 'TERMS_REQUIRED')
  return fail(res, err.status >= 400 && err.status < 600 ? err.status : 502, err.message, 'GROQ_ERROR')
}

export function quotaFrom(h) {
  const g = n => h.get(n)
  const num = v => (v == null || v === '' ? null : Number(v))
  return {
    reqLimit: num(g('x-ratelimit-limit-requests')), reqRemaining: num(g('x-ratelimit-remaining-requests')), reqReset: g('x-ratelimit-reset-requests'),
    tokLimit: num(g('x-ratelimit-limit-tokens')), tokRemaining: num(g('x-ratelimit-remaining-tokens')), tokReset: g('x-ratelimit-reset-tokens'),
  }
}

// ─── Catalogue de modèles ───
export function classify(id) {
  const m = { id, kind: 'chat', vision: false, reasoning: false }
  if (/whisper/i.test(id)) m.kind = 'stt'
  else if (/orpheus|playai/i.test(id)) m.kind = 'tts'
  else if (/guard|safeguard/i.test(id)) m.kind = 'guard'
  else if (/^groq\/compound/i.test(id)) m.kind = 'compound'
  if (/llama-4|scout|maverick|vision|-vl\b|vl-/i.test(id)) m.vision = true
  if (/gpt-oss|qwen3|deepseek-r1|kimi/i.test(id)) m.reasoning = true
  return m
}
const FALLBACK = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3-32b', 'meta-llama/llama-4-scout-17b-16e-instruct',
  'groq/compound', 'groq/compound-mini', 'whisper-large-v3', 'whisper-large-v3-turbo', 'canopylabs/orpheus-v1-english', 'canopylabs/orpheus-arabic-saudi', 'openai/gpt-oss-safeguard-20b', 'meta-llama/llama-prompt-guard-2-86m']
let modelCache = { at: 0, list: null, live: false }
export async function getModels() {
  if (modelCache.list && Date.now() - modelCache.at < 10 * 60_000) return modelCache
  try {
    const { res } = await withKeys(k => groqFetch('/models', {}, k))
    if (res?.ok) {
      const j = await res.json()
      const list = (j.data || []).filter(x => x.active !== false).map(x => ({ ...classify(x.id), ctx: x.context_window || null, owner: x.owned_by || '', maxOut: x.max_completion_tokens || null }))
      if (list.length) { modelCache = { at: Date.now(), list, live: true }; return modelCache }
    }
  } catch {}
  if (!modelCache.list) modelCache = { at: Date.now() - 9 * 60_000, list: FALLBACK.map(classify), live: false }
  return modelCache
}
export const hasModel = (cache, id) => cache.list.some(m => m.id === id)
export function pickVision(cache) {
  const v = cache.list.filter(m => m.kind === 'chat' && m.vision)
  return (v.find(m => /scout/i.test(m.id)) || v[0])?.id || 'meta-llama/llama-4-scout-17b-16e-instruct'
}

// ─── Appel chat non streamé avec rotation ───
export async function chatOnce(payload, signal) {
  const { res, exhausted } = await withKeys(k => groqFetch('/chat/completions', jsonInit({ ...payload, stream: false }, signal), k))
  if (!res || !res.ok) return { error: await readError(res), exhausted }
  const data = await res.json()
  return { data, quota: quotaFrom(res.headers) }
}

export async function* sse(body) {
  const dec = new TextDecoder()
  let buf = ''
  for await (const chunk of body) {
    buf += dec.decode(chunk, { stream: true })
    let i
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const ev = buf.slice(0, i); buf = buf.slice(i + 2)
      for (const line of ev.split('\n')) {
        if (!line.startsWith('data:')) continue
        const d = line.slice(5).trim()
        if (d === '[DONE]') return
        try { yield JSON.parse(d) } catch {}
      }
    }
  }
}

// Outils exécutés côté Groq (modèles Compound) : normalisés pour l'interface.
export function normalizeTools(list) {
  if (!Array.isArray(list)) return []
  return list.map(t => {
    let args = {}
    try { args = typeof t.arguments === 'string' ? JSON.parse(t.arguments) : (t.arguments || {}) } catch {}
    const results = (t.search_results?.results || []).map(r => ({ title: r.title || r.url, url: r.url })).filter(r => r.url).slice(0, 8)
    return { type: t.type || 'tool', query: args.query || args.url || '', code: args.code || '', output: typeof t.output === 'string' ? t.output.slice(0, 4000) : '', results }
  })
}

export function sanitizeMessages(messages, max = 20) {
  const out = []
  let images = 0
  for (const m of (Array.isArray(messages) ? messages : []).slice(-max)) {
    if (!m || !['user', 'assistant', 'system'].includes(m.role)) continue
    if (typeof m.content === 'string') { out.push({ role: m.role, content: m.content.slice(0, 60000) }); continue }
    if (Array.isArray(m.content) && m.role === 'user') {
      const parts = []
      for (const p of m.content) {
        if (p?.type === 'text' && typeof p.text === 'string') parts.push({ type: 'text', text: p.text.slice(0, 60000) })
        else if (p?.type === 'image_url' && typeof p.image_url?.url === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(p.image_url.url) && p.image_url.url.length < 5_600_000 && images < 5) {
          parts.push({ type: 'image_url', image_url: { url: p.image_url.url } }); images++
        }
      }
      if (parts.length) out.push({ role: 'user', content: parts })
    }
  }
  return { messages: out, images }
}
export const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }

// Appel sur une clé précise (les lots Batch appartiennent à la clé qui les a créés).
export async function withKeyAt(idx, run) {
  const i = Number.isInteger(idx) && idx >= 0 && idx < KEYS.length ? idx : 0
  return run(KEYS[i], i)
}
export const parseJSON = s => { try { return JSON.parse(s) } catch { const m = /\{[\s\S]*\}|\[[\s\S]*\]/.exec(s || ''); if (m) { try { return JSON.parse(m[0]) } catch {} } return null } }

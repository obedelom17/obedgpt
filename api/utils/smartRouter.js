import { Groq } from 'groq-sdk'

// ═══════════════════════════════════════════════════════════════
//  SmartRouter — Groq uniquement, avec rotation de clés
//  Pour usage multi-utilisateurs (classe, amis, etc.)
// ═══════════════════════════════════════════════════════════════

// ─── Configuration ───
// GROQ_API_KEYS accepte plusieurs clés séparées par des virgules : en cas de
// quota atteint sur une clé, la suivante prend automatiquement le relais.
const GROQ_KEYS = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean)

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10       // 10 req/min par IP
const CACHE_TTL_MS = 3 * 60_000 // 3 minutes

// ─── Budget de tokens ───
// Beaucoup d'utilisateurs partagent les mêmes clés gratuites : on garde les
// réponses raisonnablement courtes et on limite l'historique envoyé au
// modèle (le coût d'un tour croît avec TOUT l'historique renvoyé).
const MAX_OUTPUT_TOKENS_CHAT = 2048
const MAX_OUTPUT_TOKENS_CODE = 4096
const MAX_HISTORY_MESSAGES = 16 // ~8 échanges user/assistant

// ─── State ───
// Limitation connue : sur Vercel, chaque instance serverless a sa propre
// mémoire, donc rate limit et cache ne sont garantis qu'entre deux requêtes
// traitées par la même instance « chaude ».
let currentGroqIndex = 0
const rateLimitMap = new Map()
const cacheMap = new Map()
const MAX_TRACKED_IPS = 500
const MAX_CACHE_ENTRIES = 200

function pruneExpired(map) {
  const now = Date.now()
  for (const [key, entry] of map) {
    const expiry = entry.resetAt ?? entry.expiresAt
    if (now > expiry) map.delete(key)
  }
  const limit = map === cacheMap ? MAX_CACHE_ENTRIES : MAX_TRACKED_IPS
  if (map.size > limit) map.clear()
}

// ─── Helpers ───
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown'
}

function checkRateLimit(ip) {
  pruneExpired(rateLimitMap)
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count }
}

function getCacheKey(body) {
  const str = JSON.stringify(body)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return String(hash)
}

function getCached(hash) {
  pruneExpired(cacheMap)
  const entry = cacheMap.get(hash)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { cacheMap.delete(hash); return null }
  return entry.data
}

function setCached(hash, data) {
  cacheMap.set(hash, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

function isQuotaError(err) {
  const msg = (err.message || '').toLowerCase()
  return err.status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')
    || msg.includes('exhausted') || msg.includes('too many')
}

const rateLimited = (res, retryAfter) => res.status(429).json({
  error: `Rate limit atteint. Réessayez dans ${retryAfter}s.`,
  type: 'RATE_LIMIT',
  retryAfter,
})

const noKeys = res => res.status(503).json({
  error: 'Aucune clé Groq configurée (variable GROQ_API_KEYS).',
  type: 'NO_GROQ_KEYS',
})

const allDown = res => res.status(503).json({
  error: 'Le service est temporairement indisponible (quota Groq atteint). Réessayez dans quelques minutes.',
  type: 'ALL_SERVICES_DOWN',
})

const withSystem = (body, messages) => (body.systemPrompt
  ? [{ role: 'system', content: body.systemPrompt }, ...messages]
  : messages)

// ─── Chat (réponse complète) ───
async function callGroq(body, keyIndex) {
  const groq = new Groq({ apiKey: GROQ_KEYS[keyIndex] })
  const messages = (body.messages || []).slice(-MAX_HISTORY_MESSAGES)
  const completion = await groq.chat.completions.create({
    messages: withSystem(body, messages),
    model: GROQ_MODEL,
    temperature: 0.7,
    max_tokens: MAX_OUTPUT_TOKENS_CHAT,
  })
  return { text: completion.choices[0]?.message?.content || '' }
}

// ─── Chat (streaming) ───
// On n'écrit les en-têtes HTTP qu'une fois le flux Groq ouvert sans erreur :
// tant qu'aucun octet n'est parti, on peut encore passer à la clé suivante.
async function streamGroq(body, res, markStarted) {
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const keyIndex = (currentGroqIndex + i) % GROQ_KEYS.length
    try {
      const groq = new Groq({ apiKey: GROQ_KEYS[keyIndex] })
      const messages = (body.messages || []).slice(-MAX_HISTORY_MESSAGES)
      const stream = await groq.chat.completions.create({
        messages: withSystem(body, messages),
        model: GROQ_MODEL,
        temperature: 0.7,
        max_tokens: MAX_OUTPUT_TOKENS_CHAT,
        stream: true,
      })

      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      })
      markStarted()
      let full = ''
      for await (const part of stream) {
        const delta = part.choices?.[0]?.delta?.content || ''
        if (delta) { full += delta; res.write(delta) }
      }
      res.end()
      currentGroqIndex = keyIndex
      return full
    } catch (err) {
      if (isQuotaError(err)) continue
      throw err
    }
  }
  throw new Error('ALL_KEYS_EXHAUSTED')
}

// ─── Routeur principal (chat) ───
export async function smartRoute(req, res, body) {
  const rate = checkRateLimit(getClientIP(req))
  if (!rate.allowed) return rateLimited(res, rate.retryAfter)
  if (GROQ_KEYS.length === 0) return noKeys(res)

  if (body.stream) {
    let started = false
    try {
      const full = await streamGroq(body, res, () => { started = true })
      setCached(getCacheKey(body), { text: full })
      return
    } catch {
      if (started) { try { res.end() } catch {} ; return }
      return allDown(res)
    }
  }

  const cacheKey = getCacheKey(body)
  const cached = getCached(cacheKey)
  if (cached) return res.status(200).json({ ...cached, _cached: true })

  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const keyIndex = (currentGroqIndex + i) % GROQ_KEYS.length
    try {
      const data = await callGroq(body, keyIndex)
      currentGroqIndex = keyIndex
      setCached(cacheKey, data)
      return res.status(200).json(data)
    } catch (err) {
      if (isQuotaError(err)) continue
      console.error('[SmartRouter] Groq error:', err?.message)
      break
    }
  }
  return allDown(res)
}

// ─── Routeur code ───
export async function smartRouteCode(req, res, body) {
  const rate = checkRateLimit(getClientIP(req))
  if (!rate.allowed) return rateLimited(res, rate.retryAfter)
  if (GROQ_KEYS.length === 0) return noKeys(res)

  const cacheKey = getCacheKey({ ...body, _type: 'code' })
  const cached = getCached(cacheKey)
  if (cached) return res.status(200).json({ ...cached, _cached: true })

  const userPrompt = body.context?.trim()
    ? `Contexte du projet : ${body.context.trim()}\n\n${body.prompt}`
    : body.prompt

  const systemPrompt = body.mode === 'explain'
    ? "Tu es un développeur senior pédagogue. Explique le code fourni de façon claire et structurée : ce qu'il fait globalement, comment il fonctionne étape par étape, et les pièges ou améliorations possibles. Cite les passages pertinents dans des blocs de code."
    : (body.language
        ? `Tu es un expert en ${body.language}. Génère du code production-ready avec commentaires.`
        : 'Tu es un développeur senior. Génère du code production-ready avec commentaires.')

  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const keyIndex = (currentGroqIndex + i) % GROQ_KEYS.length
    try {
      const groq = new Groq({ apiKey: GROQ_KEYS[keyIndex] })
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: MAX_OUTPUT_TOKENS_CODE,
      })
      const data = { text: completion.choices[0]?.message?.content || '' }
      currentGroqIndex = keyIndex
      setCached(cacheKey, data)
      return res.status(200).json(data)
    } catch (err) {
      if (isQuotaError(err)) continue
      console.error('[SmartRouter] Groq code error:', err?.message)
      break
    }
  }
  return allDown(res)
}

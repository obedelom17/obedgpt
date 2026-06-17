import { Groq } from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ═══════════════════════════════════════════════════════════════
//  SmartRouter v2 — Rotation Groq + Rotation Gemini
//  Pour usage multi-utilisateurs (classe, amis, etc.)
// ═══════════════════════════════════════════════════════════════

// ─── Configuration ───
const GROQ_KEYS = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean)

const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean)

const FALLBACK_MODEL = 'gemini-2.5-flash'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10       // 10 req/min par IP (augmenté pour classe)
const CACHE_TTL_MS = 3 * 60_000 // 3 minutes (plus agressif)

// ─── Budget de tokens ───
// Beaucoup d'utilisateurs partagent les mêmes clés API gratuites : on garde
// les réponses raisonnablement courtes et on limite l'historique envoyé au
// modèle pour ne pas faire exploser le coût en tokens d'une conversation
// qui s'allonge (le coût d'un tour de chat croît avec TOUT l'historique
// renvoyé à chaque message, pas juste le dernier message).
const MAX_OUTPUT_TOKENS_CHAT = 2048
const MAX_OUTPUT_TOKENS_CODE = 4096
const MAX_OUTPUT_TOKENS_MEDIA = 2048
const MAX_HISTORY_MESSAGES = 16 // ~8 échanges user/assistant max envoyés au modèle

// ─── State ───
// ⚠️ Limitation connue : sur Vercel, chaque instance serverless a sa propre
// mémoire. En cas de cold start ou de scaling horizontal, ce rate limit et
// ce cache ne sont donc pas garantis à 100% (ils restent utiles entre deux
// requêtes traitées par la même instance "chaude"). Pour une garantie
// stricte multi-instances il faudrait un store partagé (ex: Vercel KV /
// Upstash Redis), volontairement non ajouté ici pour rester simple.
let currentGroqIndex = 0
let currentGeminiIndex = 0
const rateLimitMap = new Map()
const cacheMap = new Map()
const MAX_TRACKED_IPS = 500
const MAX_CACHE_ENTRIES = 200

// Nettoyage opportuniste : évite que rateLimitMap/cacheMap grossissent
// indéfiniment sur une instance qui reste "chaude" longtemps.
function pruneExpired(map) {
  const now = Date.now()
  for (const [key, entry] of map) {
    const expiry = entry.resetAt ?? entry.expiresAt
    if (now > expiry) map.delete(key)
  }
  // Garde-fou supplémentaire si trop d'entrées s'accumulent malgré tout
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
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return String(hash)
}

function getCached(hash) {
  pruneExpired(cacheMap)
  const entry = cacheMap.get(hash)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cacheMap.delete(hash)
    return null
  }
  return entry.data
}

function setCached(hash, data) {
  cacheMap.set(hash, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

function getNextGroqKey() {
  if (GROQ_KEYS.length === 0) return null
  const key = GROQ_KEYS[currentGroqIndex]
  currentGroqIndex = (currentGroqIndex + 1) % GROQ_KEYS.length
  return key
}

function getNextGeminiKey() {
  if (GEMINI_KEYS.length === 0) return null
  const key = GEMINI_KEYS[currentGeminiIndex]
  currentGeminiIndex = (currentGeminiIndex + 1) % GEMINI_KEYS.length
  return key
}

// ─── Groq Call ───
async function callGroq(body, keyIndex = 0) {
  const key = GROQ_KEYS[keyIndex]
  if (!key) throw new Error('NO_GROQ_KEYS')

  const groq = new Groq({ apiKey: key })
  const messages = (body.messages || []).slice(-MAX_HISTORY_MESSAGES)
  const systemPrompt = body.systemPrompt

  const chatCompletion = await groq.chat.completions.create({
    messages: systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: MAX_OUTPUT_TOKENS_CHAT,
  })

  return { text: chatCompletion.choices[0]?.message?.content || '' }
}

// ─── Gemini Call ───
async function callGemini(body, keyIndex = 0) {
  const key = GEMINI_KEYS[keyIndex]
  if (!key) throw new Error('NO_GEMINI_KEYS')

  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: FALLBACK_MODEL })

  const messages = (body.messages || []).slice(-MAX_HISTORY_MESSAGES)
  const systemPrompt = body.systemPrompt

  const history = []
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i]
    history.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })
  }

  const lastMsg = messages[messages.length - 1]
  let parts = [{ text: lastMsg?.content || '' }]

  if (body.files && body.files.length > 0) {
    for (const file of body.files) {
      parts.push({
        inlineData: {
          mimeType: file.type || 'application/pdf',
          data: file.base64
        }
      })
    }
  }

  const chat = model.startChat({
    history,
    generationConfig: { temperature: 0.7, maxOutputTokens: MAX_OUTPUT_TOKENS_CHAT },
    systemInstruction: systemPrompt,
  })

  const result = await chat.sendMessage(parts)
  return { text: result.response.text() }
}

// ─── Retryable error check ───
function isQuotaError(err) {
  const msg = (err.message || '').toLowerCase()
  return msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')
    || msg.includes('exhausted') || msg.includes('resource') || msg.includes('too many')
}

// ─── Main Router ───
export async function smartRoute(req, res, body) {
  // 1. Rate Limit
  const ip = getClientIP(req)
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Rate limit atteint. Réessayez dans ${rateCheck.retryAfter}s.`,
      type: 'RATE_LIMIT',
      retryAfter: rateCheck.retryAfter
    })
  }

  // 2. Cache Check
  const cacheKey = getCacheKey(body)
  const cached = getCached(cacheKey)
  if (cached) {
    return res.status(200).json({ ...cached, _cached: true })
  }

  // Si des fichiers sont joints, Groq (llama-3.3, texte seul) ne peut pas les
  // lire : il répondrait à côté en ignorant le fichier, et on aurait quand
  // même consommé un appel pour rien. On va donc directement sur Gemini,
  // seul capable de traiter les pièces jointes.
  const hasFiles = body.files && body.files.length > 0

  // 3. Try ALL Groq keys (texte uniquement)
  let groqError = null
  if (!hasFiles) {
    for (let i = 0; i < GROQ_KEYS.length; i++) {
      try {
        const data = await callGroq(body, (currentGroqIndex + i) % GROQ_KEYS.length)
        setCached(cacheKey, data)
        return res.status(200).json(data)
      } catch (err) {
        groqError = err
        if (isQuotaError(err)) continue
        break // Autre erreur, on passe à Gemini
      }
    }
  }

  // 4. Try ALL Gemini keys
  if (!hasFiles) console.log('[SmartRouter] Groq failed, trying Gemini. Last error:', groqError?.message)
  let geminiError = null
  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    try {
      const data = await callGemini(body, (currentGeminiIndex + i) % GEMINI_KEYS.length)
      setCached(cacheKey, data)
      return res.status(200).json(data)
    } catch (err) {
      geminiError = err
      if (isQuotaError(err)) continue
      break
    }
  }

  // 5. All dead
  console.error('[SmartRouter] All services down. Gemini error:', geminiError?.message)
  return res.status(503).json({
    error: 'Tous les services sont temporairement indisponibles. Réessayez dans quelques minutes.',
    type: 'ALL_SERVICES_DOWN'
  })
}

// ─── Vision Router ───
export async function smartRouteVision(req, res, body) {
  const ip = getClientIP(req)
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: `Rate limit. Retry in ${rateCheck.retryAfter}s.`, type: 'RATE_LIMIT' })
  }

  if (GEMINI_KEYS.length === 0) {
    return res.status(503).json({ error: 'GEMINI_API_KEYS manquante.', type: 'NO_GEMINI_KEYS' })
  }

  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEYS[(currentGeminiIndex + i) % GEMINI_KEYS.length])
      const model = genAI.getGenerativeModel({ model: FALLBACK_MODEL })

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: body.prompt || 'Décris cette image en détail.' },
            { inlineData: { mimeType: body.mimeType || 'image/jpeg', data: body.imageBase64 } }
          ]
        }],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS_MEDIA }
      })

      return res.status(200).json({ text: result.response.text() })
    } catch (err) {
      if (isQuotaError(err)) continue
      break
    }
  }

  return res.status(503).json({ error: 'Tous les services indisponibles.', type: 'ALL_SERVICES_DOWN' })
}

// ─── Audio Router ───
export async function smartRouteAudio(req, res, body) {
  const ip = getClientIP(req)
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: `Rate limit. Retry in ${rateCheck.retryAfter}s.`, type: 'RATE_LIMIT' })
  }

  if (GEMINI_KEYS.length === 0) {
    return res.status(503).json({ error: 'GEMINI_API_KEYS manquante.', type: 'NO_GEMINI_KEYS' })
  }

  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEYS[(currentGeminiIndex + i) % GEMINI_KEYS.length])
      const model = genAI.getGenerativeModel({ model: FALLBACK_MODEL })

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: body.prompt || 'Transcris et analyse cet audio.' },
            { inlineData: { mimeType: body.mimeType || 'audio/mp3', data: body.audioBase64 } }
          ]
        }],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS_MEDIA }
      })

      return res.status(200).json({ text: result.response.text() })
    } catch (err) {
      if (isQuotaError(err)) continue
      break
    }
  }

  return res.status(503).json({ error: 'Tous les services indisponibles.', type: 'ALL_SERVICES_DOWN' })
}

// ─── Code Router ───
export async function smartRouteCode(req, res, body) {
  const ip = getClientIP(req)
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: `Rate limit. Retry in ${rateCheck.retryAfter}s.`, type: 'RATE_LIMIT' })
  }

  const cacheKey = getCacheKey({ ...body, _type: 'code' })
  const cached = getCached(cacheKey)
  if (cached) return res.status(200).json({ ...cached, _cached: true })

  // body.context (contexte du projet saisi côté UI) était reçu mais jamais
  // utilisé : on l'injecte maintenant dans le prompt envoyé au modèle.
  const userPrompt = body.context?.trim()
    ? `Contexte du projet : ${body.context.trim()}\n\n${body.prompt}`
    : body.prompt

  // Try ALL Groq keys
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    try {
      const key = GROQ_KEYS[(currentGroqIndex + i) % GROQ_KEYS.length]
      const groq = new Groq({ apiKey: key })

      const systemPrompt = body.language
        ? `Tu es un expert en ${body.language}. Génère du code production-ready avec commentaires.`
        : 'Tu es un développeur senior. Génère du code production-ready avec commentaires.'

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: MAX_OUTPUT_TOKENS_CODE,
      })

      const data = { text: chatCompletion.choices[0]?.message?.content || '' }
      setCached(cacheKey, data)
      return res.status(200).json(data)
    } catch (err) {
      if (isQuotaError(err)) continue
      break
    }
  }

  // Try ALL Gemini keys
  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEYS[(currentGeminiIndex + i) % GEMINI_KEYS.length])
      const model = genAI.getGenerativeModel({ model: FALLBACK_MODEL })

      const systemPrompt = body.language
        ? `Tu es un expert en ${body.language}. Génère du code production-ready avec commentaires.`
        : 'Tu es un développeur senior. Génère du code production-ready avec commentaires.'

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: systemPrompt,
        generationConfig: { temperature: 0.2, maxOutputTokens: MAX_OUTPUT_TOKENS_CODE }
      })

      const data = { text: result.response.text() }
      setCached(cacheKey, data)
      return res.status(200).json(data)
    } catch (err) {
      if (isQuotaError(err)) continue
      break
    }
  }

  return res.status(503).json({ error: 'Tous les services indisponibles.', type: 'ALL_SERVICES_DOWN' })
}

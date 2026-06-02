import { Groq } from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ═══════════════════════════════════════════════════════════════
//  SmartRouter - Gratuit Maximum (Option A)
//  Rotation Groq + Fallback Gemini + Rate Limit + Cache
// ═══════════════════════════════════════════════════════════════

// ─── Configuration ───
const GROQ_KEYS = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean)

const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const FALLBACK_MODEL = 'gemini-2.5-flash'  // 250 req/jour gratuit
const RATE_LIMIT_WINDOW_MS = 60_000        // 1 minute
const RATE_LIMIT_MAX = 5                   // 5 req/min par IP
const CACHE_TTL_MS = 5 * 60_000            // 5 minutes

// ─── State (persiste tant que la fonction est warm) ───
let currentGroqIndex = 0
const rateLimitMap = new Map()   // ip -> { count, resetAt }
const cacheMap = new Map()       // hash -> { data, expiresAt }

// ─── Helpers ───
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown'
}

function checkRateLimit(ip) {
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
  // Hash simple basé sur le contenu de la requête
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

// ─── Groq Call ───
async function callGroq(body, keyIndex = 0) {
  const key = GROQ_KEYS[keyIndex]
  if (!key) throw new Error('NO_GROQ_KEYS')

  const groq = new Groq({ apiKey: key })

  const messages = body.messages || []
  const systemPrompt = body.systemPrompt

  const chatCompletion = await groq.chat.completions.create({
    messages: systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 8192,
  })

  return { text: chatCompletion.choices[0]?.message?.content || '' }
}

// ─── Gemini Call ───
async function callGemini(body) {
  if (!GEMINI_KEY) throw new Error('NO_GEMINI_KEY')

  const genAI = new GoogleGenerativeAI(GEMINI_KEY)
  const model = genAI.getGenerativeModel({ model: FALLBACK_MODEL })

  const messages = body.messages || []
  const systemPrompt = body.systemPrompt

  // Build history
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

  // Handle attached files
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
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
    systemInstruction: systemPrompt,
  })

  const result = await chat.sendMessage(parts)
  return { text: result.response.text() }
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

  // 3. Try Groq (rotation + failover)
  let lastError = null
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    try {
      const data = await callGroq(body, (currentGroqIndex + i) % GROQ_KEYS.length)
      setCached(cacheKey, data)
      return res.status(200).json(data)
    } catch (err) {
      lastError = err
      const msg = err.message || ''
      // Si c'est un quota/rate limit, on essaie la clé suivante
      if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('exhausted')) {
        continue
      }
      // Autre erreur Groq → on break et on va sur Gemini
      break
    }
  }

  // 4. Fallback Gemini
  console.log('[SmartRouter] Groq failed, falling back to Gemini. Last error:', lastError?.message)
  try {
    const data = await callGemini(body)
    setCached(cacheKey, data)
    return res.status(200).json(data)
  } catch (geminiErr) {
    console.error('[SmartRouter] Gemini fallback failed:', geminiErr.message)
    return res.status(503).json({
      error: 'Tous les services sont temporairement indisponibles. Réessayez dans quelques minutes.',
      type: 'ALL_SERVICES_DOWN'
    })
  }
}

// ─── Vision Router ───
export async function smartRouteVision(req, res, body) {
  const ip = getClientIP(req)
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: `Rate limit. Retry in ${rateCheck.retryAfter}s.`, type: 'RATE_LIMIT' })
  }

  // Vision = toujours Gemini (Groq ne supporte pas bien la vision)
  if (!GEMINI_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY manquante.', type: 'NO_GEMINI_KEY' })
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY)
    const model = genAI.getGenerativeModel({ model: FALLBACK_MODEL })

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: body.prompt || 'Décris cette image en détail.' },
          { inlineData: { mimeType: body.mimeType || 'image/jpeg', data: body.imageBase64 } }
        ]
      }]
    })

    return res.status(200).json({ text: result.response.text() })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur vision', type: 'VISION_ERROR' })
  }
}

// ─── Audio Router ───
export async function smartRouteAudio(req, res, body) {
  const ip = getClientIP(req)
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: `Rate limit. Retry in ${rateCheck.retryAfter}s.`, type: 'RATE_LIMIT' })
  }

  if (!GEMINI_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY manquante.', type: 'NO_GEMINI_KEY' })
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY)
    const model = genAI.getGenerativeModel({ model: FALLBACK_MODEL })

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: body.prompt || 'Transcris et analyse cet audio.' },
          { inlineData: { mimeType: body.mimeType || 'audio/mp3', data: body.audioBase64 } }
        ]
      }]
    })

    return res.status(200).json({ text: result.response.text() })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur audio', type: 'AUDIO_ERROR' })
  }
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

  // Try Groq first
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
          { role: 'user', content: body.prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 8192,
      })

      const data = { text: chatCompletion.choices[0]?.message?.content || '' }
      setCached(cacheKey, data)
      return res.status(200).json(data)
    } catch (err) {
      if ((err.message || '').includes('429') || (err.message || '').includes('quota')) continue
      break
    }
  }

  // Fallback Gemini
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY)
    const model = genAI.getGenerativeModel({ model: FALLBACK_MODEL })

    const systemPrompt = body.language
      ? `Tu es un expert en ${body.language}. Génère du code production-ready avec commentaires.`
      : 'Tu es un développeur senior. Génère du code production-ready avec commentaires.'

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: body.prompt }] }],
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
    })

    const data = { text: result.response.text() }
    setCached(cacheKey, data)
    return res.status(200).json(data)
  } catch (err) {
    return res.status(503).json({ error: 'Tous les services indisponibles.', type: 'ALL_SERVICES_DOWN' })
  }
}

import { applyCors } from './utils/cors.js'
import { checkRate, clientIP, fail, chatOnce } from './utils/groqCore.js'
import { hasStore, sget, sset } from './utils/store.js'

// Génération d'image : Cloudflare Workers AI (binding « AI »), modèle FLUX.1 schnell.
// Plan gratuit : 10 000 neurones/jour pour TOUT le compte. On limite donc aussi par IP et par jour.
const MODEL = '@cf/black-forest-labs/flux-1-schnell'
const DAILY = Number(process.env.IMAGE_DAILY_LIMIT) || 8
const mem = new Map()

async function takeDaily(ip) {
  const key = `img:${ip}:${new Date().toISOString().slice(0, 10)}`
  let n
  if (hasStore()) { n = Number(await sget(key)) || 0; if (n >= DAILY) return false; await sset(key, String(n + 1), { ttl: 90000 }); return true }
  if (mem.size > 2000) mem.clear()
  n = mem.get(key) || 0
  if (n >= DAILY) return false
  mem.set(key, n + 1); return true
}

// FLUX comprend mieux l'anglais : on traduit/enrichit le prompt avec Groq (facultatif, ignoré si indisponible).
async function toEnglish(prompt) {
  try {
    const { data } = await chatOnce({ model: 'openai/gpt-oss-20b', temperature: 0.4, max_tokens: 300, messages: [
      { role: 'system', content: 'Réécris la demande en un prompt anglais détaillé (sujet, style, lumière, composition) pour un générateur d\'images. Réponds uniquement avec le prompt, 60 mots maximum.' },
      { role: 'user', content: prompt }] })
    const t = data?.choices?.[0]?.message?.content?.trim()
    return t && t.length > 5 ? t.slice(0, 1000) : prompt
  } catch { return prompt }
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  const AI = globalThis.__CF_ENV?.AI
  if (!AI) return fail(res, 503, 'Génération d\'images indisponible : binding Workers AI « AI » absent (Cloudflare uniquement).', 'NO_AI')
  const rate = checkRate(req, 'image', 4)
  if (!rate.ok) return fail(res, 429, `Trop de requêtes. Réessayez dans ${rate.retryAfter}s.`, 'RATE_LIMIT')
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : ''
  if (prompt.length < 3 || prompt.length > 1000) return fail(res, 400, 'Décris l\'image en 3 à 1000 caractères.', 'BAD_REQUEST')
  if (!(await takeDaily(clientIP(req)))) return fail(res, 429, `Limite atteinte : ${DAILY} images par jour. Réessaie demain.`, 'DAILY_LIMIT')
  const english = await toEnglish(prompt)
  try {
    const out = await AI.run(MODEL, { prompt: english, steps: 4 })
    if (!out?.image) throw new Error('empty')
    return res.status(200).json({ image: `data:image/jpeg;base64,${out.image}`, prompt: english })
  } catch (e) {
    const msg = String(e?.message || e)
    if (/429|limit|neuron|quota|allocation/i.test(msg)) return fail(res, 429, 'Quota gratuit Cloudflare épuisé pour aujourd\'hui (remise à zéro à minuit UTC).', 'AI_QUOTA')
    if (/nsfw|safety|filter/i.test(msg)) return fail(res, 400, 'Cette demande a été refusée par le filtre de sécurité.', 'FILTERED')
    return fail(res, 502, 'Génération impossible pour le moment.', 'AI_ERROR')
  }
}

import { applyCors } from './utils/cors.js'
import { checkRate, fail } from './utils/groqCore.js'

// Liens de partage COURTS (optionnels). La conversation (déjà compressée par le
// navigateur) est stockée 30 jours dans Upstash Redis (offre gratuite) et
// retrouvée par un identifiant de 10 caractères : /s/Ab3dE5gH7k
// Sans UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN, cette route répond 503
// et l'app retombe sur le lien intégré (conversation contenue dans l'URL).
const URL_ = process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const TTL = 60 * 60 * 24 * 30
const MAX = 150_000
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

const redis = async cmd => {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) })
  if (!r.ok) throw new Error(`redis ${r.status}`)
  return (await r.json()).result
}
const newId = () => { const b = new Uint8Array(10); crypto.getRandomValues(b); return [...b].map(x => ALPHA[x % ALPHA.length]).join('') }

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (!URL_ || !TOKEN) return fail(res, 503, 'Liens courts non configurés.', 'NO_SHORT_LINKS')

  if (req.method === 'GET') {
    const id = String(req.query?.id || new URL(req.url, 'http://x').searchParams.get('id') || '')
    if (!/^[A-Za-z0-9]{10}$/.test(id)) return fail(res, 400, 'Identifiant invalide.', 'BAD_REQUEST')
    try {
      const code = await redis(['GET', `share:${id}`])
      if (!code) return fail(res, 404, 'Ce lien a expiré ou n\'existe pas.', 'NOT_FOUND')
      res.setHeader('Cache-Control', 'public, max-age=300')
      return res.status(200).json({ code })
    } catch { return fail(res, 502, 'Stockage indisponible.', 'STORAGE') }
  }

  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  const rate = checkRate(req, 'share', 10)
  if (!rate.ok) return fail(res, 429, `Trop de requêtes. Réessayez dans ${rate.retryAfter}s.`, 'RATE_LIMIT')
  const code = req.body?.code
  if (typeof code !== 'string' || code.length > MAX || !/^[zr][A-Za-z0-9_-]{20,}$/.test(code)) return fail(res, 400, 'Contenu invalide.', 'BAD_REQUEST')
  try {
    const id = newId()
    await redis(['SET', `share:${id}`, code, 'EX', TTL, 'NX'])
    return res.status(200).json({ id, expiresInDays: 30 })
  } catch { return fail(res, 502, 'Stockage indisponible.', 'STORAGE') }
}

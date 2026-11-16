import { applyCors } from './utils/cors.js'
import { checkRate, fail, hasKeys, keyCount, getModels, pickVision, DEFAULT_MODEL, hasModel } from './utils/groqCore.js'

// GET /api/health : état du service, pour une sonde de surveillance (UptimeRobot, Better Stack...).
// Répond 200 si Groq est joignable ET si le modèle par défaut et un modèle vision existent encore ; sinon 503.
export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed')
  const rate = checkRate(req, 'health', 30)
  if (!rate.ok) return fail(res, 429, 'Trop de requêtes.', 'RATE_LIMIT')
  res.setHeader('Cache-Control', 'no-store')
  if (!hasKeys()) return res.status(503).json({ ok: false, problems: ['Aucune clé Groq (GROQ_API_KEYS).'] })
  const cache = await getModels()
  const problems = []
  if (!cache.live) problems.push('Catalogue Groq injoignable (liste de secours utilisée).')
  if (cache.live && !hasModel(cache, DEFAULT_MODEL)) problems.push(`Modèle par défaut retiré : ${DEFAULT_MODEL}.`)
  const vision = pickVision(cache)
  if (cache.live && !hasModel(cache, vision)) problems.push(`Aucun modèle vision actif (${vision} absent).`)
  return res.status(problems.length ? 503 : 200).json({
    ok: !problems.length, problems, keys: keyCount(), models: cache.list.length, defaultModel: DEFAULT_MODEL, visionModel: vision,
    images: !!globalThis.__CF_ENV?.AI, time: new Date().toISOString(),
  })
}

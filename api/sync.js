import { applyCors } from './utils/cors.js'
import { checkRate, fail } from './utils/groqCore.js'
import { hasStore, sget, sset } from './utils/store.js'
import { userFromRequest } from './utils/auth.js'

// Historique serveur par compte.
// GET  /api/sync → { conversations, deleted }
// PUT  /api/sync {conversations, deleted} → { ok, size }   (le client fusionne avant d'envoyer)
const MAX_BYTES = 1_800_000

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (!process.env.JWT_SECRET || !hasStore()) return fail(res, 503, 'Comptes non configurés.', 'NO_ACCOUNTS')
  const user = await userFromRequest(req)
  if (!user) return fail(res, 401, 'Session expirée.', 'UNAUTHORIZED')
  const rate = checkRate(req, 'sync', 30)
  if (!rate.ok) return fail(res, 429, `Trop de requêtes. Réessayez dans ${rate.retryAfter}s.`, 'RATE_LIMIT')
  const key = `hist:${user.sub}`
  try {
    if (req.method === 'GET') {
      const raw = await sget(key)
      const data = raw ? JSON.parse(raw) : { conversations: [], deleted: {} }
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(data)
    }
    if (req.method === 'PUT') {
      const { conversations, deleted } = req.body || {}
      if (!Array.isArray(conversations) || conversations.length > 200) return fail(res, 400, 'Données invalides.', 'BAD_REQUEST')
      const payload = JSON.stringify({ conversations, deleted: deleted && typeof deleted === 'object' ? deleted : {}, updatedAt: new Date().toISOString() })
      if (payload.length > MAX_BYTES) return fail(res, 413, 'Historique trop volumineux pour la synchronisation.', 'TOO_LARGE')
      await sset(key, payload)
      return res.status(200).json({ ok: true, size: payload.length })
    }
    return fail(res, 405, 'Method not allowed')
  } catch { return fail(res, 502, 'Stockage indisponible.', 'STORAGE') }
}

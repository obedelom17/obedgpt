import { applyCors } from './utils/cors.js'
import { checkRate, fail } from './utils/groqCore.js'
import { hasStore, sget, sset } from './utils/store.js'
import { hashPassword, verifyPassword, signJwt, randomId, normEmail, validEmail, userFromRequest } from './utils/auth.js'

// POST /api/auth {action:'register'|'login', email, password} → { token, user }
// GET  /api/auth → { user } (jeton Bearer)
const LOCK_AFTER = 10, LOCK_TTL = 900

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (!process.env.JWT_SECRET || !hasStore()) return fail(res, 503, 'Comptes non configurés (JWT_SECRET et stockage KV/Upstash requis).', 'NO_ACCOUNTS')

  if (req.method === 'GET') {
    const u = await userFromRequest(req)
    if (!u) return fail(res, 401, 'Session expirée.', 'UNAUTHORIZED')
    return res.status(200).json({ user: { id: u.sub, email: u.email } })
  }
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')

  const rate = checkRate(req, 'auth', 8)
  if (!rate.ok) return fail(res, 429, `Trop de tentatives. Réessayez dans ${rate.retryAfter}s.`, 'RATE_LIMIT')

  const { action, password } = req.body || {}
  const email = normEmail(req.body?.email)
  if (!validEmail(email)) return fail(res, 400, 'Adresse e-mail invalide.', 'BAD_REQUEST')
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) return fail(res, 400, 'Mot de passe : 8 caractères minimum.', 'BAD_REQUEST')

  try {
    const key = `user:${email}`
    if (action === 'register') {
      if (await sget(key)) return fail(res, 409, 'Un compte existe déjà avec cet e-mail.', 'EXISTS')
      const user = { id: randomId(12), email, ...(await hashPassword(password)), createdAt: new Date().toISOString() }
      await sset(key, JSON.stringify(user))
      return res.status(200).json({ token: await signJwt({ sub: user.id, email }, process.env.JWT_SECRET), user: { id: user.id, email } })
    }
    if (action === 'login') {
      const lockKey = `lock:${email}`
      const fails = Number(await sget(lockKey)) || 0
      if (fails >= LOCK_AFTER) return fail(res, 429, 'Compte temporairement bloqué (trop d\'échecs). Réessayez dans 15 minutes.', 'LOCKED')
      const raw = await sget(key)
      const user = raw ? JSON.parse(raw) : null
      if (!user || !(await verifyPassword(password, user))) {
        await sset(lockKey, String(fails + 1), { ttl: LOCK_TTL })
        return fail(res, 401, 'E-mail ou mot de passe incorrect.', 'BAD_CREDENTIALS')
      }
      if (fails) await sset(lockKey, '0', { ttl: 60 })
      return res.status(200).json({ token: await signJwt({ sub: user.id, email }, process.env.JWT_SECRET), user: { id: user.id, email } })
    }
    return fail(res, 400, 'Action inconnue.', 'BAD_REQUEST')
  } catch { return fail(res, 502, 'Stockage indisponible.', 'STORAGE') }
}

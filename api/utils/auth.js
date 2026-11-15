// Authentification sans dépendance : Web Crypto uniquement (Workers, Node 20+, navigateur).
//  - mot de passe : PBKDF2-SHA256 + sel aléatoire
//  - session : JWT HS256 signé avec JWT_SECRET, valable 30 jours
const enc = new TextEncoder()
const dec = new TextDecoder()
export const ITERATIONS = () => Number(process.env.PBKDF2_ITERATIONS) || 100_000
const TOKEN_TTL = 60 * 60 * 24 * 30

const b64u = buf => { let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
const unb64u = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u }

export function randomId(bytes = 16) { const b = new Uint8Array(bytes); crypto.getRandomValues(b); return b64u(b) }

async function pbkdf2(password, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256)
}

export async function hashPassword(password, iter = ITERATIONS()) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { salt: b64u(salt), hash: b64u(await pbkdf2(password, salt, iter)), iter }
}

export async function verifyPassword(password, { salt, hash, iter }) {
  const got = new Uint8Array(await pbkdf2(password, unb64u(salt), iter))
  const want = unb64u(hash)
  if (got.length !== want.length) return false
  let d = 0
  for (let i = 0; i < got.length; i++) d |= got[i] ^ want[i]
  return d === 0
}

const hmacKey = secret => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])

export async function signJwt(payload, secret, ttl = TOKEN_TTL) {
  const now = Math.floor(Date.now() / 1000)
  const head = b64u(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64u(enc.encode(JSON.stringify({ ...payload, iat: now, exp: now + ttl })))
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(`${head}.${body}`))
  return `${head}.${body}.${b64u(sig)}`
}

export async function verifyJwt(token, secret) {
  try {
    const [h, b, s] = String(token).split('.')
    if (!h || !b || !s) return null
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64u(s), enc.encode(`${h}.${b}`))
    if (!ok) return null
    const p = JSON.parse(dec.decode(unb64u(b)))
    if (!p.exp || p.exp < Math.floor(Date.now() / 1000)) return null
    return p
  } catch { return null }
}

export const normEmail = e => String(e || '').trim().toLowerCase()
export const validEmail = e => e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)

export async function userFromRequest(req) {
  const secret = process.env.JWT_SECRET
  if (!secret) return null
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
  return m ? verifyJwt(m[1], secret) : null
}

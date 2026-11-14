// ─── CORS ───
// L'API n'accepte que l'app elle-même (et ses déploiements preview Vercel),
// pour qu'un autre site ne puisse pas consommer le quota Groq partagé.

const ALLOWED_ORIGINS = [
  'https://obedgpt.vercel.app',
  'http://localhost:5173', // dev local (vite)
  'http://localhost:3000',
]
const PREVIEW_ORIGIN_RE = /^https:\/\/obedgpt-[a-z0-9-]+\.vercel\.app$/

function isOriginAllowed(origin) {
  if (!origin) return false
  return ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN_RE.test(origin)
}

/** @returns {boolean} true si la requête était un OPTIONS déjà traité. */
export function applyCors(req, res) {
  const origin = req.headers.origin
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(204).end(); return true }
  return false
}

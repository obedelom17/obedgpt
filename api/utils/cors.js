// ─── CORS ───
// vercel.json appliquait auparavant `Access-Control-Allow-Origin: *` sur
// toutes les routes /api/*. N'importe quel autre site pouvait donc appeler
// ces endpoints depuis le navigateur d'un visiteur et consommer le quota de
// tokens partagé (Groq/Gemini) sans jamais passer par obedgpt.vercel.app.
// On restreint maintenant l'origine à l'app elle-même + ses previews Vercel.

const ALLOWED_ORIGINS = [
  'https://obedgpt.vercel.app',
  'http://localhost:5173', // dev local (vite)
]

// Les déploiements preview Vercel ressemblent à https://obedgpt-xxxxxxx.vercel.app
const PREVIEW_ORIGIN_RE = /^https:\/\/obedgpt-[a-z0-9-]+\.vercel\.app$/

function isOriginAllowed(origin) {
  if (!origin) return false
  return ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN_RE.test(origin)
}

/**
 * Applique les headers CORS et répond directement aux requêtes OPTIONS.
 * @returns {boolean} true si la requête a déjà été traitée (OPTIONS) et que
 *                     le handler appelant doit s'arrêter là.
 */
export function applyCors(req, res) {
  const origin = req.headers.origin
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

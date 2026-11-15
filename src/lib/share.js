// Partage par lien : la conversation est compressée (deflate) puis encodée
// dans la partie « # » de l'URL. Le fragment n'est JAMAIS envoyé au serveur :
// rien n'est stocké nulle part, et seule une personne qui possède le lien peut lire.
const MAX_JSON = 2_000_000

const toB64u = bytes => {
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64u = str => { const b = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u }

async function pipe(bytes, Stream) {
  const out = new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw'))
  const reader = out.getReader(); const parts = []; let size = 0
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX_JSON) throw new Error('Contenu trop volumineux'); parts.push(value) }
  const all = new Uint8Array(size); let o = 0; for (const p of parts) { all.set(p, o); o += p.length }
  return all
}

export async function encodeShare({ title, messages }) {
  const payload = { v: 1, t: String(title || '').slice(0, 80), d: Date.now(), m: messages.filter(m => m.content).map(m => [m.role === 'user' ? 'u' : 'a', m.content]) }
  const raw = new TextEncoder().encode(JSON.stringify(payload))
  if (typeof CompressionStream !== 'undefined') return 'z' + toB64u(await pipe(raw, CompressionStream))
  return 'r' + toB64u(raw)
}

export async function decodeShare(code) {
  const kind = code[0]; const bytes = fromB64u(code.slice(1))
  let raw = bytes
  if (kind === 'z') { if (typeof DecompressionStream === 'undefined') throw new Error('Navigateur trop ancien pour ouvrir ce lien.'); raw = await pipe(bytes, DecompressionStream) }
  else if (kind !== 'r') throw new Error('Lien invalide.')
  const data = JSON.parse(new TextDecoder().decode(raw))
  if (data?.v !== 1 || !Array.isArray(data.m)) throw new Error('Lien invalide.')
  return {
    title: String(data.t || '').slice(0, 80), date: Number(data.d) || null,
    messages: data.m.slice(0, 200).filter(x => Array.isArray(x) && typeof x[1] === 'string').map(([r, c]) => ({ role: r === 'u' ? 'user' : 'assistant', content: c.slice(0, 60000) })),
  }
}

export const shareUrl = code => `${location.origin}${location.pathname}#s=${code}`
export const readShareHash = () => (location.hash.startsWith('#s=') ? location.hash.slice(3) : null)
export const readShareId = () => { const m = /^\/s\/([A-Za-z0-9]{10})\/?$/.exec(location.pathname); return m ? m[1] : null }
export const hasShareLink = () => !!(readShareHash() || readShareId())

// Lien court hébergé 30 jours (si le serveur a Upstash configuré). Retourne null sinon.
export async function createShortLink(code) {
  try {
    const r = await fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
    if (!r.ok) return null
    const { id } = await r.json()
    return id ? `${location.origin}/s/${id}` : null
  } catch { return null }
}
// Résout le code compressé depuis un lien (hash intégré ou identifiant court).
export async function resolveShareCode() {
  const h = readShareHash(); if (h) return h
  const id = readShareId(); if (!id) return null
  const r = await fetch(`/api/share?id=${id}`)
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.code) throw new Error(j.error || 'Lien introuvable.')
  return j.code
}

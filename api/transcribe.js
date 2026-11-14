import { applyCors } from './utils/cors.js'
import { guard, fail, withKeys, groqFetch, readError, sendGroqError, quotaFrom, clamp } from './utils/groqCore.js'

// Whisper : transcription (langue d'origine) ou traduction vers l'anglais.
// Le corps de la requête est le fichier audio brut (octets) ; les options
// passent dans l'URL. Le client découpe les longs fichiers en morceaux < 4 Mo.
export const config = { api: { bodyParser: false } }

const MAX_BYTES = 4_400_000
async function readRaw(req) {
  const chunks = []; let size = 0
  for await (const c of req) { size += c.length; if (size > MAX_BYTES) throw Object.assign(new Error('TOO_BIG'), { code: 'TOO_BIG' }); chunks.push(c) }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (guard(req, res, 'audio', 20)) return
  const q = new URL(req.url, 'http://x').searchParams
  let buf
  try { buf = await readRaw(req) } catch (e) { return fail(res, e.code === 'TOO_BIG' ? 413 : 400, e.code === 'TOO_BIG' ? 'Fichier audio trop lourd pour un envoi (4 Mo max par morceau).' : 'Lecture audio impossible.', 'BAD_AUDIO') }
  if (buf.length < 200) return fail(res, 400, 'Audio vide.', 'BAD_AUDIO')

  const translate = q.get('translate') === '1'
  // whisper-large-v3-turbo ne sait pas traduire : on force large-v3 dans ce cas.
  const model = translate ? 'whisper-large-v3' : (q.get('model') === 'whisper-large-v3' ? 'whisper-large-v3' : 'whisper-large-v3-turbo')
  const name = (q.get('filename') || 'audio.wav').replace(/[^\w.-]/g, '_').slice(0, 60)
  const type = req.headers['content-type'] || 'audio/wav'

  const build = () => {
    const f = new FormData()
    f.append('file', new Blob([buf], { type }), name)
    f.append('model', model)
    f.append('response_format', 'verbose_json')
    f.append('temperature', String(clamp(q.get('temperature'), 0, 1, 0)))
    if (!translate) { f.append('timestamp_granularities[]', 'segment'); f.append('timestamp_granularities[]', 'word') }
    const lang = q.get('language'); if (!translate && lang && /^[a-z]{2,3}$/.test(lang)) f.append('language', lang)
    const prompt = q.get('prompt'); if (prompt) f.append('prompt', prompt.slice(0, 600))
    return f
  }
  const path = translate ? '/audio/translations' : '/audio/transcriptions'
  const { res: up, exhausted } = await withKeys(k => groqFetch(path, { method: 'POST', body: build() }, k))
  if (!up?.ok) return sendGroqError(res, await readError(up), exhausted)
  const j = await up.json()
  return res.status(200).json({
    text: j.text || '', language: j.language || '', duration: j.duration || 0, model,
    segments: (j.segments || []).map(s => ({ start: s.start, end: s.end, text: s.text })),
    words: (j.words || []).map(w => ({ start: w.start, end: w.end, word: w.word })),
    quota: quotaFrom(up.headers),
  })
}

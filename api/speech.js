import { applyCors } from './utils/cors.js'
import { guard, fail, withKeys, groqFetch, jsonInit, readError, sendGroqError, clamp } from './utils/groqCore.js'

// Synthèse vocale Orpheus (Groq). 200 caractères max par requête : le client
// découpe les textes longs en phrases et enchaîne les appels.
const VOICES = {
  'canopylabs/orpheus-v1-english': ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'],
  'canopylabs/orpheus-arabic-saudi': ['abdullah', 'fahad', 'sultan', 'lulwa', 'noura', 'aisha'],
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (guard(req, res, 'speech', 30)) return
  const b = req.body || {}
  const model = VOICES[b.model] ? b.model : 'canopylabs/orpheus-v1-english'
  const voice = VOICES[model].includes(b.voice) ? b.voice : VOICES[model][0]
  const input = String(b.text || '').trim()
  if (!input) return fail(res, 400, 'Texte vide.', 'BAD_REQUEST')
  if (input.length > 200) return fail(res, 400, 'Texte trop long (200 caractères max par requête).', 'BAD_REQUEST')
  const payload = { model, voice, input, response_format: 'wav', speed: clamp(b.speed, 0.5, 5, 1) }
  const { res: up, exhausted } = await withKeys(k => groqFetch('/audio/speech', jsonInit(payload), k))
  if (!up?.ok) return sendGroqError(res, await readError(up), exhausted)
  const audio = Buffer.from(await up.arrayBuffer())
  res.setHeader('Content-Type', 'audio/wav')
  res.setHeader('Cache-Control', 'private, max-age=600')
  return res.status(200).send(audio)
}

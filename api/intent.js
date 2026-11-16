import { applyCors } from './utils/cors.js'
import { guard, fail, chatOnce, getModels, hasModel, parseJSON, DEFAULT_MODEL } from './utils/groqCore.js'

// POST /api/intent { text, lastImagePrompt? } → { image: boolean, prompt: string }
// Petit classifieur (un modèle rapide, réponse JSON) : l'utilisateur demande-t-il qu'on lui CRÉE / MONTRE une image ?
// Appelé seulement quand l'heuristique locale hésite (voir src/lib/imageIntent.js).
const SYS = `Tu décides si le message d'un utilisateur demande à un assistant, qui PEUT générer des images, de CRÉER ou de MONTRER une image (photo, illustration, dessin, logo, affiche, portrait, fond d'écran...).
image=true : demande explicite ou implicite d'obtenir une image. Exemples : « j'aimerais bien voir à quoi ressemble un lion », « montre-moi un coucher de soleil à Lomé », « je veux voir une maison moderne », « fais-en une version en noir et blanc » (modification de la dernière image).
image=false : question de connaissance ou d'explication, demande de texte, de code, de document, d'analyse d'une image envoyée, de description écrite, conversation courante. En cas de doute : false.
Si une dernière image est fournie et que le message demande de la modifier ou d'en refaire une variante, fusionne la demande avec le prompt de cette image.
Schéma : {"image":boolean,"prompt":string}. « prompt » = description visuelle concise (sujet, décor, style) dans la langue de l'utilisateur, vide si image=false.
Réponds UNIQUEMENT avec l'objet JSON.`

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (guard(req, res, 'intent', 40)) return
  const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 600) : ''
  if (text.length < 4) return fail(res, 400, 'Texte vide.', 'BAD_REQUEST')
  const last = typeof req.body?.lastImagePrompt === 'string' ? req.body.lastImagePrompt.slice(0, 500) : ''
  const cache = await getModels()
  const model = hasModel(cache, 'openai/gpt-oss-20b') ? 'openai/gpt-oss-20b' : DEFAULT_MODEL
  const user = (last ? `Dernière image générée : « ${last} »\n` : '') + `Message : ${text}`
  const payload = { model, temperature: 0, max_tokens: 500, response_format: { type: 'json_object' }, reasoning_effort: 'low', messages: [{ role: 'system', content: SYS }, { role: 'user', content: user }] }
  let r = await chatOnce(payload)
  if (r.error && r.error.status === 400) { delete payload.reasoning_effort; r = await chatOnce(payload) }
  if (r.error) return res.status(200).json({ image: false, prompt: '', degraded: true })
  const j = parseJSON(r.data.choices?.[0]?.message?.content || '')
  const image = j?.image === true
  return res.status(200).json({ image, prompt: image ? String(j.prompt || text).slice(0, 900) : '' })
}

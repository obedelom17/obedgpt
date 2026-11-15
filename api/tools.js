import { applyCors } from './utils/cors.js'
import { guard, fail, chatOnce, sendGroqError, getModels, pickVision, sanitizeMessages, clamp, parseJSON, normalizeTools, DEFAULT_MODEL } from './utils/groqCore.js'

// Atelier : outils à une étape (traduire, résumer, JSON structuré, quiz,
// modération, détection d'injection, exécution de code, analyse d'image...).
const LANGS = { fr: 'français', en: 'anglais', es: 'espagnol', de: 'allemand', pt: 'portugais', it: 'italien', ar: 'arabe', zh: 'chinois', ja: 'japonais', ee: 'éwé (au mieux)', yo: 'yoruba (au mieux)', sw: 'swahili' }
const lim = (s, n = 24000) => String(s || '').slice(0, n)

const DEFAULT_POLICY = `Interdit : violence explicite ou menaces, harcèlement et haine envers un groupe, contenu sexuel explicite, incitation à l'automutilation, aide à des actes illégaux graves, divulgation de données personnelles. Autorisé : discussion éducative, fiction non explicite, débat respectueux, humour sans attaque ciblée.`

const J = 'Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour ni balises de code.'

function plan(tool, b, cache) {
  const text = lim(b.text), o = b.options || {}
  switch (tool) {
    case 'keywords': return { sys: `Extrais de la question 6 à 12 mots-clés de recherche : noms, termes techniques, synonymes et variantes proches, dans la langue de la question (et en anglais si pertinent). Schéma : {"keywords":[string]}. ${J}`, user: text.slice(0, 2000), json: true, model: cache.list.find(m => m.id === 'llama-3.1-8b-instant')?.id }
    case 'translate': return { sys: `Tu es traducteur professionnel. Traduis fidèlement vers ${LANGS[o.target] || 'anglais'}. Conserve le ton, la mise en forme et les noms propres. Réponds uniquement avec la traduction.`, user: text }
    case 'summarize': return { sys: `Tu résumes des textes. Format : ${o.style === 'bullets' ? 'liste à puces' : o.style === 'tldr' ? 'une seule phrase (TL;DR)' : 'paragraphes courts'}. Longueur : ${o.length === 'long' ? 'détaillée' : o.length === 'short' ? 'très courte' : 'moyenne'}. Langue : celle du texte. Ne rajoute aucune information.`, user: text }
    case 'rewrite': return { sys: `Reformule le texte avec un ton ${o.tone || 'professionnel'}. Garde le sens, la langue et les faits. Réponds uniquement avec le texte reformulé.`, user: text }
    case 'correct': return { sys: "Corrige orthographe, grammaire et ponctuation sans changer le sens ni le style. Réponds avec le texte corrigé, puis après une ligne '---' la liste brève des corrections principales.", user: text }
    case 'email': return { sys: `Rédige un e-mail ${o.tone || 'professionnel'} en ${LANGS[o.language] || 'français'} : ligne « Objet : », salutation, corps clair, formule de politesse. Réponds uniquement avec l'e-mail.`, user: text }
    case 'extract_json': return { sys: `Extrais du texte les informations demandées. Champs souhaités : ${lim(o.fields || 'les entités importantes', 500)}. Valeur null si absente. ${J}`, user: text, json: true }
    case 'quiz': return { sys: `Crée un quiz de ${clamp(o.count, 3, 15, 6)} questions de niveau ${o.level || 'intermédiaire'} à partir du contenu fourni (ou du sujet). Langue : celle du contenu. Schéma : {"title":string,"cards":[{"q":string,"choices":[string,string,string,string],"answer":number (index 0-3),"explanation":string}]}. ${J}`, user: text, json: true }
    case 'moderate': return { sys: `Tu es un modérateur de contenu. Politique :\n${lim(o.policy || DEFAULT_POLICY, 3000)}\nÉvalue le contenu de l'utilisateur. Schéma : {"violation":0|1,"category":string,"confidence":"low"|"medium"|"high","rationale":string}. ${J}`, user: text, json: true, model: cache.list.find(m => m.kind === 'guard' && /safeguard/i.test(m.id))?.id }
    case 'injection': return { raw: true, model: cache.list.find(m => /prompt-guard/i.test(m.id))?.id || 'meta-llama/llama-prompt-guard-2-86m', user: lim(text, 2000) }
    case 'run_code': return { sys: "Tu résous la tâche en exécutant du code Python avec l'outil code_interpreter, puis tu expliques le résultat brièvement. Montre le code utile dans un bloc ```python.", user: text, model: 'groq/compound-mini', compound: ['code_interpreter'] }
    default: return null
  }
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (guard(req, res, 'tools', 15)) return
  const b = req.body || {}
  const cache = await getModels()

  // Analyse d'image (vision)
  if (b.tool === 'vision') {
    const { messages, images } = sanitizeMessages([{ role: 'user', content: [{ type: 'text', text: lim(b.prompt || 'Décris cette image.', 4000) }, ...(Array.isArray(b.images) ? b.images.slice(0, 5).map(u => ({ type: 'image_url', image_url: { url: u } })) : [])] }])
    if (!images) return fail(res, 400, 'Aucune image valide (PNG, JPEG, WebP ou GIF).', 'BAD_REQUEST')
    const sys = { describe: 'Décris précisément ce que montrent les images.', ocr: "Transcris fidèlement tout le texte visible dans les images (OCR), en conservant la structure (titres, tableaux en Markdown).", explain: "Explique ce que montrent les images (schéma, graphique, capture d'écran, exercice) étape par étape. Si c'est un exercice, résous-le.", table: 'Extrais les données tabulaires visibles en tableau Markdown.' }[b.mode] || 'Réponds à la demande en t\'appuyant sur les images.'
    const r = await chatOnce({ model: pickVision(cache), messages: [{ role: 'system', content: `${sys} Réponds dans la langue de l'utilisateur.` }, ...messages], temperature: 0.2, max_tokens: 2500 })
    if (r.error) return sendGroqError(res, r.error, r.exhausted)
    return res.status(200).json({ text: r.data.choices?.[0]?.message?.content || '', model: pickVision(cache), quota: r.quota })
  }

  const p = plan(b.tool, b, cache)
  if (!p) return fail(res, 400, 'Outil inconnu.', 'BAD_REQUEST')
  if (!String(b.text || '').trim()) return fail(res, 400, 'Texte vide.', 'BAD_REQUEST')
  if (b.tool === 'moderate' && !p.model) p.model = DEFAULT_MODEL

  const payload = { model: p.model || DEFAULT_MODEL, messages: p.raw ? [{ role: 'user', content: p.user }] : [{ role: 'system', content: p.sys }, { role: 'user', content: p.user }], temperature: p.raw ? 0 : 0.3, max_tokens: p.raw ? 20 : 3000 }
  if (p.compound) payload.compound_custom = { tools: { enabled_tools: p.compound } }
  else if (p.json && !/safeguard/i.test(payload.model)) payload.response_format = { type: 'json_object' }
  let r = await chatOnce(payload)
  if (r.error && r.error.status === 400 && (payload.response_format || payload.compound_custom)) { delete payload.response_format; delete payload.compound_custom; r = await chatOnce(payload) }
  if (r.error) return sendGroqError(res, r.error, r.exhausted)
  const msg = r.data.choices?.[0]?.message || {}
  const out = { text: msg.content || '', model: payload.model, quota: r.quota, usage: r.data.usage }
  if (p.json) out.json = parseJSON(out.text)
  if (b.tool === 'injection') { const sc = parseFloat(out.text); out.score = Number.isFinite(sc) ? sc : null; out.label = out.score == null ? out.text.trim() : out.score >= 0.5 ? 'risque' : 'sûr' }
  if (p.compound) out.tools = normalizeTools(msg.executed_tools)
  return res.status(200).json(out)
}

import { guard, fail, withKeys, groqFetch, jsonInit, readError, sendGroqError, quotaFrom, getModels, hasModel, pickVision, visionCandidates, sanitizeMessages, clamp, sse, normalizeTools, DEFAULT_MODEL, chatOnce } from './groqCore.js'

// Chat complet : choix du modèle, vision, raisonnement, recherche web et
// exécution de code (Compound), mode JSON. Flux NDJSON :
//   {t:'c',v}=texte  {t:'r',v}=raisonnement  {t:'tools',v}  {t:'quota',v}  {t:'meta',v}  {t:'usage',v}

const MAX_HISTORY = Number(process.env.MAX_HISTORY_MESSAGES) || 20
const EFFORTS = ['low', 'medium', 'high']

function buildPlan(body, cache) {
  const { messages, images } = sanitizeMessages(body.messages, MAX_HISTORY)
  const sys = typeof body.systemPrompt === 'string' && body.systemPrompt.trim()
    ? [{ role: 'system', content: body.systemPrompt.slice(0, 8000) }] : []
  const ctx = typeof body.context === 'string' && body.context.trim() ? [{ role: 'system', content: body.context.slice(0, 60000) }] : []
  const wantTools = !!(body.webSearch || body.codeExec)
  let model = hasModel(cache, body.model) ? body.model : null
  if (model && ['stt', 'tts', 'guard'].includes(cache.list.find(m => m.id === model)?.kind)) model = null

  const payload = { messages: [...sys, ...ctx, ...messages], temperature: clamp(body.temperature, 0, 2, 0.7), max_tokens: clamp(body.maxTokens, 64, 8192, 2048) }
  const features = []
  if (images > 0) {
    model = pickVision(cache); features.push('vision')
  } else if (wantTools) {
    model = 'groq/compound'
    const enabled = []
    if (body.webSearch) { enabled.push('web_search', 'visit_website'); features.push('web') }
    if (body.codeExec) { enabled.push('code_interpreter'); features.push('code') }
    payload.compound_custom = { tools: { enabled_tools: enabled } }
  } else {
    model = model || DEFAULT_MODEL
    const info = cache.list.find(m => m.id === model)
    if (/gpt-oss/i.test(model) && EFFORTS.includes(body.reasoning)) { payload.reasoning_effort = body.reasoning; payload.include_reasoning = true; features.push('reasoning') }
    else if (/qwen3/i.test(model)) { payload.reasoning_format = 'parsed'; payload.reasoning_effort = body.reasoning === 'low' ? 'none' : 'default'; features.push('reasoning') }
    if (body.json && !info?.vision) payload.response_format = { type: 'json_object' }
  }
  payload.model = model
  const alts = images > 0 ? visionCandidates(cache).filter(m => m !== model) : []
  return { payload, features, model, alts }
}

// Retire les options que le modèle choisi refuse (erreur 400) puis réessaie.
const EXTRAS = ['reasoning_effort', 'include_reasoning', 'reasoning_format', 'compound_custom', 'response_format']
const strip = p => { const n = { ...p }; EXTRAS.forEach(k => delete n[k]); return n }

const hasImages = p => p.messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'image_url'))

const OVERLOAD = e => e?.status === 503 || /over capacity|overloaded|try again/i.test(e?.message || '')
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function open(payload, signal, alts = []) {
  let p = payload, retries = 0
  for (let attempt = 0; attempt < 6; attempt++) {
    const { res, exhausted } = await withKeys(k => groqFetch('/chat/completions', jsonInit({ ...p, stream: true }, signal), k))
    if (res?.ok) return { up: res, payload: p }
    const err = await readError(res)
    // Modèle saturé : on bascule sur un autre modèle vision, sinon on réessaie après une courte pause.
    if (OVERLOAD(err) && res?.status !== 429) {
      if (alts.length) { p = { ...p, model: alts.shift() }; continue }
      if (retries++ < 2) { await sleep(1200 * retries); continue }
    }
    if (res?.status === 400 && attempt === 0 && EXTRAS.some(k => k in p)) { p = strip(p); continue }
    if ([400, 404].includes(res?.status) && /decommission|not found|does not exist|no longer supported/i.test(err.message) && p.model !== DEFAULT_MODEL && !hasImages(p)) { p = { ...strip(p), model: DEFAULT_MODEL }; continue }
    return { err, exhausted }
  }
  return { err: { status: 502, message: 'Échec après plusieurs tentatives.' } }
}

export async function handleChat(req, res) {
  if (guard(req, res, 'chat')) return
  const body = req.body || {}
  const cache = await getModels()
  const { payload, features, model, alts } = buildPlan(body, cache)
  if (!payload.messages.some(m => m.role === 'user')) return fail(res, 400, 'Message vide.', 'BAD_REQUEST')

  const ac = new AbortController()
  res.on('close', () => ac.abort())

  if (!body.stream) {
    const r = await chatOnce(payload, ac.signal)
    if (r.error) return sendGroqError(res, r.error, r.exhausted)
    const msg = r.data.choices?.[0]?.message || {}
    return res.status(200).json({ text: msg.content || '', reasoning: msg.reasoning || '', tools: normalizeTools(msg.executed_tools), usage: r.data.usage, model, quota: r.quota })
  }

  const opened = await open(payload, ac.signal, alts)
  if (opened.err) return sendGroqError(res, opened.err, opened.exhausted)
  const { up, payload: used } = opened
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' })
  const send = o => { try { res.write(JSON.stringify(o) + '\n') } catch {} }
  send({ t: 'quota', v: quotaFrom(up.headers) })
  send({ t: 'meta', v: { model: used.model, features } })

  const toolsSeen = new Map()
  try {
    for await (const ev of sse(up.body)) {
      const ch = ev.choices?.[0]
      const d = ch?.delta || {}
      if (d.reasoning) send({ t: 'r', v: d.reasoning })
      if (d.content) send({ t: 'c', v: d.content })
      for (const src of [d.executed_tools, ch?.message?.executed_tools, ev.x_groq?.executed_tools]) {
        if (Array.isArray(src)) src.forEach((t, i) => toolsSeen.set(t.index ?? `${toolsSeen.size}-${i}`, t))
      }
      const usage = ev.x_groq?.usage || ev.usage
      if (usage) send({ t: 'usage', v: { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens } })
    }
    if (toolsSeen.size) send({ t: 'tools', v: normalizeTools([...toolsSeen.values()]) })
  } catch (e) {
    if (e.name !== 'AbortError') send({ t: 'err', v: 'Flux interrompu.' })
  }
  try { res.end() } catch {}
}

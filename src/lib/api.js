import { setQuota } from './quota'

async function parse(res) {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const data = await res.json().catch(() => { throw new Error('Réponse serveur invalide (JSON attendu)') })
    if (data.quota) setQuota(data.quota)
    if (data.error) throw new Error(data.error)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return data
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res
}

export async function postJson(url, body, signal) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
  return parse(res)
}

let modelsPromise = null
export function fetchModels(force = false) {
  if (!modelsPromise || force) modelsPromise = fetch('/api/models').then(parse).catch(e => { modelsPromise = null; throw e })
  return modelsPromise
}

// Transcription Whisper : `blob` = audio (WAV de préférence, < 4 Mo).
export async function transcribeBlob(blob, { language, translate, prompt, model, filename = 'audio.wav', signal } = {}) {
  const qs = new URLSearchParams({ filename })
  if (language && language !== 'auto') qs.set('language', language)
  if (translate) qs.set('translate', '1')
  if (prompt) qs.set('prompt', prompt)
  if (model) qs.set('model', model)
  const res = await fetch(`/api/transcribe?${qs}`, { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/wav' }, body: blob, signal })
  return parse(res)
}

// Synthèse vocale Orpheus : retourne un Blob audio/wav.
export async function speakChunk(text, { voice, model, speed, signal } = {}) {
  const res = await fetch('/api/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice, model, speed }), signal })
  const r = await parse(res)
  return r.blob()
}

// Lecture du flux NDJSON du chat. `h` : { onChunk, onReasoning, onMeta, onTools, onUsage }.
export async function streamChat(body, h, signal) {
  const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, stream: true }), signal })
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`) }
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''; let text = ''
  const handle = line => {
    let e; try { e = JSON.parse(line) } catch { return }
    if (e.t === 'c') { text += e.v; h.onChunk?.(e.v) }
    else if (e.t === 'r') h.onReasoning?.(e.v)
    else if (e.t === 'meta') h.onMeta?.(e.v)
    else if (e.t === 'tools') h.onTools?.(e.v)
    else if (e.t === 'usage') h.onUsage?.(e.v)
    else if (e.t === 'quota') setQuota(e.v)
    else if (e.t === 'err') throw new Error(e.v)
  }
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l) handle(l) }
  }
  if (buf.trim()) handle(buf.trim())
  return text
}

const FR = /\b(le|la|les|des|une|est|et|que|pour|dans|avec|pas|vous|nous|je|il|elle|sur|qui|mais|ou|sont|c'est|ce|au|du)\b/gi
const EN = /\b(the|and|is|are|to|of|in|that|for|with|you|this|it|on|as|be|have|not|can|will)\b/gi
export function guessLang(text) {
  const t = String(text).slice(0, 1500)
  if (/[\u0600-\u06FF]/.test(t)) return 'ar'
  const fr = (t.match(FR) || []).length + (t.match(/[éèêàçùô]/g) || []).length * 0.5
  const en = (t.match(EN) || []).length
  return fr > en ? 'fr' : en > 0 ? 'en' : 'other'
}

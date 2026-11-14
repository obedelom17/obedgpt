import { applyCors } from './utils/cors.js'
import { guard, fail, groqFetch, jsonInit, readError, sendGroqError, withKeyAt, withKeys, getModels, hasModel, clamp, DEFAULT_MODEL } from './utils/groqCore.js'

// API Batch Groq : traiter jusqu'à 200 prompts en lot (-50 % de coût côté
// payant, quota séparé). Le client garde ses propres identifiants de lots :
// il n'existe volontairement AUCUNE route « lister tous les lots » (la clé est
// partagée entre utilisateurs).
export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (guard(req, res, 'batch', 15)) return
  const b = req.body || {}

  if (b.action === 'create') {
    const prompts = (Array.isArray(b.prompts) ? b.prompts : []).map(p => String(p).trim().slice(0, 4000)).filter(Boolean).slice(0, 200)
    if (!prompts.length) return fail(res, 400, 'Aucun prompt.', 'BAD_REQUEST')
    const cache = await getModels()
    const model = hasModel(cache, b.model) ? b.model : DEFAULT_MODEL
    const system = String(b.system || '').slice(0, 2000)
    const jsonl = prompts.map((p, i) => JSON.stringify({ custom_id: `req-${i + 1}`, method: 'POST', url: '/v1/chat/completions', body: { model, max_tokens: clamp(b.maxTokens, 64, 4096, 1024), messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: p }] } })).join('\n')
    const upload = await withKeys(async (k, idx) => {
      const f = new FormData(); f.append('purpose', 'batch'); f.append('file', new Blob([jsonl], { type: 'application/jsonl' }), 'obedgpt-batch.jsonl')
      const r = await groqFetch('/files', { method: 'POST', body: f }, k); r._idx = idx; return r
    })
    if (!upload.res?.ok) return sendGroqError(res, await readError(upload.res), upload.exhausted)
    const file = await upload.res.json()
    const key = upload.keyIndex
    const r = await withKeyAt(key, k => groqFetch('/batches', jsonInit({ input_file_id: file.id, endpoint: '/v1/chat/completions', completion_window: '24h' }), k))
    if (!r.ok) return sendGroqError(res, await readError(r))
    const j = await r.json()
    return res.status(200).json({ id: j.id, key, status: j.status, count: prompts.length, model })
  }

  const id = String(b.id || '').replace(/[^\w-]/g, '')
  if (!id) return fail(res, 400, 'Identifiant manquant.', 'BAD_REQUEST')
  const key = Number(b.key) || 0

  if (b.action === 'status' || b.action === 'cancel') {
    const r = await withKeyAt(key, k => groqFetch(`/batches/${id}${b.action === 'cancel' ? '/cancel' : ''}`, b.action === 'cancel' ? { method: 'POST' } : {}, k))
    if (!r.ok) return sendGroqError(res, await readError(r))
    const j = await r.json()
    return res.status(200).json({ id: j.id, status: j.status, counts: j.request_counts || null, outputFileId: j.output_file_id || null, errorFileId: j.error_file_id || null, expiresAt: j.expires_at || null })
  }

  if (b.action === 'results') {
    const fid = String(b.fileId || '').replace(/[^\w-]/g, '')
    const r = await withKeyAt(key, k => groqFetch(`/files/${fid}/content`, {}, k))
    if (!r.ok) return sendGroqError(res, await readError(r))
    const lines = (await r.text()).split('\n').filter(Boolean)
    const items = lines.map(l => { try { const o = JSON.parse(l); return { id: o.custom_id, text: o.response?.body?.choices?.[0]?.message?.content ?? '', error: o.error?.message || (o.response?.status_code >= 400 ? `HTTP ${o.response.status_code}` : '') } } catch { return null } }).filter(Boolean)
    items.sort((a, c) => (parseInt(a.id.split('-')[1]) || 0) - (parseInt(c.id.split('-')[1]) || 0))
    return res.status(200).json({ items })
  }
  return fail(res, 400, 'Action inconnue.', 'BAD_REQUEST')
}

import { applyCors } from './utils/cors.js'
import { guard, fail, chatOnce, withKeys, groqFetch, jsonInit, readError, sendGroqError, getModels, hasModel, sanitizeMessages, clamp, DEFAULT_MODEL } from './utils/groqCore.js'
import { TOOL_DEFS, runTool } from './utils/agentTools.js'

// Agent : appel de fonctions (outils locaux) ou serveurs MCP distants via
// l'API Responses de Groq. Réponse complète (pas de flux) avec la liste des étapes.
const SYSTEM = "Tu es ObedGPT, un assistant créé par Obed Elom AGBEBAVI. Utilise les outils quand ils rendent la réponse plus fiable (calculs, dates, conversions). Réponds dans la langue de l'utilisateur."

function cleanMcp(list) {
  return (Array.isArray(list) ? list : []).slice(0, 3).map((s, i) => {
    let url; try { url = new URL(s.url) } catch { return null }
    if (url.protocol !== 'https:') return null
    const headers = {}
    if (s.token) headers.Authorization = `Bearer ${String(s.token).slice(0, 500)}`
    return { type: 'mcp', server_label: String(s.label || `mcp${i + 1}`).replace(/[^\w-]/g, '_').slice(0, 30), server_url: url.toString(), require_approval: 'never', ...(s.token ? { headers } : {}) }
  }).filter(Boolean)
}

async function runMcp(body, mcp, model, sys) {
  const { messages } = sanitizeMessages(body.messages, 12)
  const input = messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : m.content.filter(p => p.type === 'text').map(p => p.text).join('\n') }))
  const payload = { model, input, instructions: sys, tools: mcp, temperature: clamp(body.temperature, 0, 2, 0.4), max_output_tokens: clamp(body.maxTokens, 64, 8192, 2048) }
  const { res, exhausted } = await withKeys(k => groqFetch('/responses', jsonInit(payload), k))
  if (!res?.ok) return { error: await readError(res), exhausted }
  const j = await res.json()
  const steps = []; let text = ''
  for (const o of j.output || []) {
    if (o.type === 'mcp_call') steps.push({ name: `${o.server_label || 'mcp'}.${o.name}`, args: safeParse(o.arguments), result: safeParse(o.output) ?? o.error })
    else if (o.type === 'message') text += (o.content || []).map(c => c.text || '').join('')
  }
  return { text: text || j.output_text || '', steps }
}
const safeParse = v => { if (typeof v !== 'string') return v ?? null; try { return JSON.parse(v) } catch { return v.slice(0, 2000) } }

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (guard(req, res, 'agent', 12)) return
  const body = req.body || {}
  const cache = await getModels()
  const model = hasModel(cache, body.model) && !/compound|whisper|orpheus|guard/i.test(body.model) ? body.model : DEFAULT_MODEL
  const sys0 = typeof body.systemPrompt === 'string' && body.systemPrompt.trim() ? body.systemPrompt.slice(0, 8000) : SYSTEM
  const sys = typeof body.context === 'string' && body.context.trim() ? `${sys0}\n\n${body.context.slice(0, 60000)}` : sys0

  const mcp = cleanMcp(body.mcpServers)
  if (mcp.length) {
    const r = await runMcp(body, mcp, model, sys)
    if (r.error) return sendGroqError(res, r.error, r.exhausted)
    return res.status(200).json({ text: r.text, steps: r.steps, model, mode: 'mcp' })
  }

  const { messages } = sanitizeMessages(body.messages, 16)
  const convo = [{ role: 'system', content: sys }, ...messages]
  const steps = []
  for (let round = 0; round < 6; round++) {
    const r = await chatOnce({ model, messages: convo, tools: TOOL_DEFS, tool_choice: 'auto', temperature: clamp(body.temperature, 0, 2, 0.4), max_tokens: clamp(body.maxTokens, 64, 8192, 2048) })
    if (r.error) return sendGroqError(res, r.error, r.exhausted)
    const msg = r.data.choices?.[0]?.message
    if (!msg) return fail(res, 502, 'Réponse vide.')
    const calls = msg.tool_calls || []
    if (!calls.length) return res.status(200).json({ text: msg.content || '', steps, model, mode: 'functions', quota: r.quota })
    convo.push({ role: 'assistant', content: msg.content || '', tool_calls: calls })
    for (const c of calls) {
      let args = {}; try { args = JSON.parse(c.function.arguments || '{}') } catch {}
      const result = runTool(c.function.name, args)
      steps.push({ name: c.function.name, args, result })
      convo.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(result) })
    }
  }
  return res.status(200).json({ text: 'Trop d\'étapes sans conclusion. Reformule ta demande.', steps, model, mode: 'functions' })
}

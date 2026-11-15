import { useSyncExternalStore } from 'react'

// Réglages Groq persistés (modèle, raisonnement, outils, voix...).
const KEY = 'obedgpt-prefs-v1'
export const DEFAULT_PREFS = {
  model: 'auto',        // 'auto' = modèle serveur par défaut
  reasoning: 'off',     // off | low | medium | high
  temperature: 0.7,
  maxTokens: 2048,
  webSearch: false,     // Compound : recherche web
  codeExec: false,      // Compound : exécution Python
  agent: false,         // function calling + MCP
  jsonMode: false,
  autoSpeak: false,     // lire chaque réponse à voix haute
  ttsEngine: 'auto',    // auto | groq | browser
  voice: 'autumn',
  speed: 1,
  sttLanguage: 'auto',
  docDepth: 'normal',   // courte | normale | large (documents importés)
  mcpServers: [],       // [{label,url,token}]
}
let state = load()
const subs = new Set()
function load() { try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...DEFAULT_PREFS } } }
export function getPrefs() { return state }
export function setPrefs(patch) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
  subs.forEach(f => f())
}
export function usePrefs() {
  const prefs = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => state, () => state)
  return [prefs, setPrefs]
}

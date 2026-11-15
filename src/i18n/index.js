import { useSyncExternalStore } from 'react'
import EN from './en.json'
import { RULES } from './rules'

// Traduction légère FR → EN. Le code source reste en français : en mode anglais,
// chaque texte affiché est traduit au moment du rendu (voir jsx-runtime.js).
const KEY = 'obedgpt-lang'
const detect = () => {
  try {
    const q = new URLSearchParams(location.search).get('lang')
    if (q === 'en' || q === 'fr') { localStorage.setItem(KEY, q); return q }
    const s = localStorage.getItem(KEY); if (s === 'en' || s === 'fr') return s
    return (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en'
  } catch { return 'fr' }
}
let lang = typeof window === 'undefined' ? 'fr' : detect()
if (typeof document !== 'undefined') document.documentElement.lang = lang
const subs = new Set()
const cache = new Map()

export const getLang = () => lang
export function setLang(l) {
  if (l === lang) return
  lang = l; cache.clear()
  try { localStorage.setItem(KEY, l) } catch {}
  document.documentElement.lang = l
  document.title = l === 'en' ? 'ObedGPT — AI assistant' : 'ObedGPT — Assistant IA'
  subs.forEach(f => f())
}
export const useLang = () => [useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => lang, () => 'fr'), setLang]

function core(s) {
  const hit = EN[s]; if (hit !== undefined) return hit
  for (const [re, fn] of RULES) { const m = re.exec(s); if (m) return fn(m, core) }
  return undefined
}
export function tr(s) {
  if (lang !== 'en' || typeof s !== 'string' || !s) return s
  const c = cache.get(s); if (c !== undefined) return c
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s)
  const out = m[2] ? core(m[2]) : undefined
  const res = out === undefined ? s : m[1] + out + m[3]
  if (cache.size > 3000) cache.clear()
  cache.set(s, res)
  return res
}

// Outils exécutés par ObedGPT lui-même (function calling Groq).
// Aucun `eval` : le calculateur est un petit analyseur d'expressions.

const FN = { sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan, log: Math.log10, ln: Math.log, round: Math.round, floor: Math.floor, ceil: Math.ceil, exp: Math.exp }
const CONST = { pi: Math.PI, e: Math.E }

function calc(src) {
  const s = src.toLowerCase().replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.')
  let i = 0
  const peek = () => s[i]
  function num() {
    const m = /^\d*\.?\d+(e[+-]?\d+)?/.exec(s.slice(i)); if (!m) throw new Error('Nombre attendu')
    i += m[0].length; return parseFloat(m[0])
  }
  function atom() {
    if (peek() === '(') { i++; const v = expr(); if (peek() !== ')') throw new Error('Parenthèse manquante'); i++; return v }
    if (peek() === '-') { i++; return -pow() }
    if (peek() === '+') { i++; return pow() }
    const id = /^[a-z]+/.exec(s.slice(i))
    if (id) {
      i += id[0].length
      if (id[0] in CONST) return CONST[id[0]]
      if (id[0] in FN && peek() === '(') { i++; const v = expr(); if (peek() !== ')') throw new Error('Parenthèse manquante'); i++; return FN[id[0]](v) }
      throw new Error(`Inconnu : ${id[0]}`)
    }
    return num()
  }
  function pow() { let b = atom(); while (peek() === '^') { i++; b = Math.pow(b, pow()) } return b }
  function term() { let v = pow(); while (peek() === '*' || peek() === '/' || peek() === '%') { const o = s[i++]; const r = pow(); v = o === '*' ? v * r : o === '/' ? v / r : v % r } return v }
  function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const o = s[i++]; const r = term(); v = o === '+' ? v + r : v - r } return v }
  const v = expr()
  if (i < s.length) throw new Error('Expression invalide')
  return v
}

const UNITS = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254, yd: 0.9144 },
  mass: { kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.0283495, t: 1000 },
  volume: { l: 1, ml: 0.001, m3: 1000, gal: 3.78541, cup: 0.236588 },
  speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, kn: 0.514444 },
}
function convert(value, from, to) {
  const f = String(from).toLowerCase(), t = String(to).toLowerCase()
  const T = { c: x => x, f: x => (x - 32) * 5 / 9, k: x => x - 273.15 }
  const U = { c: x => x, f: x => x * 9 / 5 + 32, k: x => x + 273.15 }
  if (f in T && t in U && ['c', 'f', 'k'].includes(f) && ['c', 'f', 'k'].includes(t)) return U[t](T[f](value))
  for (const g of Object.values(UNITS)) if (f in g && t in g) return value * g[f] / g[t]
  throw new Error('Conversion non supportée')
}

export const TOOL_DEFS = [
  { type: 'function', function: { name: 'calculate', description: 'Évalue une expression mathématique exacte (+ - * / ^ %, parenthèses, sqrt, sin, cos, tan, log, ln, abs, round, pi, e).', parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] } } },
  { type: 'function', function: { name: 'get_datetime', description: "Donne la date et l'heure actuelles dans un fuseau horaire IANA (défaut Africa/Lome).", parameters: { type: 'object', properties: { timezone: { type: 'string' } } } } },
  { type: 'function', function: { name: 'convert_units', description: 'Convertit une valeur entre unités (longueur, masse, volume, vitesse, températures c/f/k).', parameters: { type: 'object', properties: { value: { type: 'number' }, from: { type: 'string' }, to: { type: 'string' } }, required: ['value', 'from', 'to'] } } },
  { type: 'function', function: { name: 'text_stats', description: "Compte mots, caractères, phrases et temps de lecture d'un texte.", parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } },
  { type: 'function', function: { name: 'random_number', description: 'Tire un entier aléatoire entre min et max inclus.', parameters: { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } }, required: ['min', 'max'] } } },
]

export function runTool(name, args) {
  try {
    switch (name) {
      case 'calculate': { const v = calc(String(args.expression || '')); return { result: Number.isFinite(v) ? Number(v.toPrecision(14)) : String(v) } }
      case 'get_datetime': {
        const tz = args.timezone || 'Africa/Lome'
        const d = new Date()
        return { timezone: tz, iso: d.toISOString(), local: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'medium', timeZone: tz }).format(d) }
      }
      case 'convert_units': return { result: Number(convert(Number(args.value), args.from, args.to).toPrecision(10)), unit: args.to }
      case 'text_stats': { const t = String(args.text || ''); const w = (t.match(/\S+/g) || []).length; return { words: w, characters: t.length, sentences: (t.match(/[.!?]+/g) || []).length || (t.trim() ? 1 : 0), readingMinutes: Math.max(1, Math.round(w / 200)) } }
      case 'random_number': { const lo = Math.ceil(Number(args.min)), hi = Math.floor(Number(args.max)); return { result: lo + Math.floor(Math.random() * (hi - lo + 1)) } }
      default: return { error: `Outil inconnu : ${name}` }
    }
  } catch (e) { return { error: e.message } }
}

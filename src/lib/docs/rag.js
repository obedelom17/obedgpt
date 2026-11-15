import MiniSearch from 'minisearch'

// Recherche par mots-clés (BM25) dans les documents : Groq n'a pas d'embeddings,
// donc on cherche localement les passages utiles et on n'envoie que ceux-là.
const STOP = new Set(('le la les l un une des du de d et ou en au aux a à ce ces cet cette ca ça que qui quoi dont où est sont etre être suis es sera ete été avoir ai as ont avait pas ne ni se sa son ses leur leurs sur sous dans par pour avec sans entre vers chez comme mais donc or car si plus moins tres très tout tous toute toutes il elle ils elles on nous vous je tu me te lui y mon ma mes ton ta tes notre votre nos vos ' +
  'the a an and or of to in on at by for with from as is are was were be been it its this that these those i you he she we they my your his her our their not no do does did have has had will would can could should what which who whom how when where why about into over than then so if').split(/\s+/))
const fold = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const stem = w => (w.length > 5 ? w.replace(/(ements?|ations?|atrices?|ateurs?|euses?|ments?|ives?|ifs?|ing|ed|es|s|x)$/, '') : w.length > 3 ? w.replace(/(s|x)$/, '') : w)
const processTerm = t => { const f = fold(t); return f.length < 2 || STOP.has(f) ? null : stem(f) }

const W = 300, OV = 40, MIN = 120
export function chunkDoc(doc) {
  const out = []; let acc = [], from = null, to = null
  const ref = (a, b) => (a === b ? a.label || `p. ${a.n}` : a.label && b.label ? `${a.label} – ${b.label}` : `p. ${a.n}-${b.n}`)
  const push = (words, a, b) => out.push({ id: `${doc.id}:${out.length}`, docId: doc.id, name: doc.name, ref: ref(a, b), text: words.join(' ') })
  for (const pg of doc.pages) {
    const words = pg.text.split(/\s+/).filter(Boolean); if (!words.length) continue
    if (words.length >= W * 1.3) {
      if (acc.length) { push(acc, from, to); acc = [] }
      for (let i = 0; i < words.length; i += W - OV) { push(words.slice(i, i + W), pg, pg); if (i + W >= words.length) break }
      continue
    }
    if (!acc.length) from = pg
    acc = acc.concat(words); to = pg
    if (acc.length >= MIN * 2) { push(acc, from, to); acc = [] }
  }
  if (acc.length) push(acc, from, to)
  return out
}

let cache = { sig: '', ms: null, chunks: [] }
function index(docs) {
  const sig = docs.map(d => `${d.id}:${d.chars}`).join('|')
  if (cache.sig === sig) return cache
  const chunks = docs.flatMap(chunkDoc)
  const ms = new MiniSearch({ fields: ['text', 'name'], storeFields: [], processTerm, searchOptions: { prefix: true, fuzzy: t => (t.length > 5 ? 0.15 : false), combineWith: 'OR', boost: { name: 1.5 } } })
  ms.addAll(chunks)
  return (cache = { sig, ms, chunks })
}

const fmt = c => `[${c.name} — ${c.ref}]\n${c.text}`
export const docChars = docs => docs.reduce((n, d) => n + d.chars, 0)

// Tout le texte (petits documents)
export function fullContext(docs) {
  const chunks = docs.flatMap(chunkDoc)
  return { text: chunks.map(fmt).join('\n\n'), sources: uniq(chunks) }
}
const uniq = cs => { const m = new Map(); cs.forEach(c => m.set(`${c.name}|${c.ref}`, { name: c.name, ref: c.ref })); return [...m.values()] }

function fit(chunks, budget) { const out = []; let n = 0; for (const c of chunks) { if (n + c.text.length > budget && out.length) continue; out.push(c); n += c.text.length; if (n >= budget) break } return out }

// Meilleurs passages pour une requête
export function retrieve(docs, query, budget) {
  const { ms, chunks } = index(docs); const byId = new Map(chunks.map(c => [c.id, c]))
  const hits = ms.search(query).map(h => byId.get(h.id)).filter(Boolean)
  if (!hits.length) return { text: '', sources: [], found: false }
  const first = []; const seen = new Set()
  for (const c of hits) if (!seen.has(c.docId)) { seen.add(c.docId); first.push(c) }       // au moins un passage par document
  const rest = hits.filter(c => !first.includes(c))
  const chosen = fit([...first, ...rest].slice(0, 14), budget)
  chosen.sort((a, b) => (a.docId === b.docId ? chunks.indexOf(a) - chunks.indexOf(b) : docs.findIndex(d => d.id === a.docId) - docs.findIndex(d => d.id === b.docId)))
  return { text: chosen.map(fmt).join('\n\n'), sources: uniq(chosen), found: true }
}

// Passages répartis sur tout le document (résumés)
export function spread(docs, budget) {
  const { chunks } = index(docs); if (!chunks.length) return { text: '', sources: [] }
  const avg = docChars(docs) / chunks.length || 1; const k = Math.max(1, Math.floor(budget / avg))
  const step = Math.max(1, chunks.length / k); const picked = []
  for (let i = 0; i < chunks.length && picked.length < k; i += step) picked.push(chunks[Math.floor(i)])
  return { text: picked.map(fmt).join('\n\n'), sources: uniq(picked) }
}

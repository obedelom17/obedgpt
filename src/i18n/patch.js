import { tr, getLang } from './index'

const SKIP = new Set(['code', 'pre', 'textarea', 'script', 'style', 'input'])
const SKIP_COMPONENTS = new Set(['Markdown', 'ReactMarkdown', 'SyntaxHighlighter', 'CodeBlock', 'PrismAsync', 'Prism'])
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'aria-description']

// Traduit les textes et attributs d'un élément au moment de sa création.
export function patchProps(type, props) {
  if (!props || getLang() !== 'en') return props
  let out = props
  const put = (k, v) => { if (out === props) out = { ...props }; out[k] = v }
  // Éléments HTML et composants (motion.div, Chip...) : on traduit les textes enfants,
  // sauf pour les composants qui reçoivent du contenu brut (Markdown, code).
  const name = typeof type === 'string' ? type : (type?.displayName || type?.name || '')
  if (!SKIP.has(name) && !SKIP_COMPONENTS.has(name)) {
    const c = props.children
    if (typeof c === 'string') { const t = tr(c); if (t !== c) put('children', t) }
    else if (Array.isArray(c)) {
      let changed = false
      const next = c.map(x => { if (typeof x === 'string') { const t = tr(x); if (t !== x) changed = true; return t } return x })
      if (changed) put('children', next)
    }
  }
  for (const a of ATTRS) { const v = props[a]; if (typeof v === 'string') { const t = tr(v); if (t !== v) put(a, t) } }
  return out
}

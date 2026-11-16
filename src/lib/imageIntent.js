// Détecte, dans un message en langage naturel, une demande de GÉNÉRATION d'image
// (« génère une image d'un lion », « dessine-moi un mouton », « make a logo for... »).
// Heuristique locale : aucun appel réseau, aucun coût. Prudente : en cas de doute, on laisse le chat répondre en texte
// (l'utilisateur peut toujours forcer avec /image, et corriger avec « Répondre par texte »).
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’`]/g, "'")

const NOUN = "(?:image|images|photo|photos|illustration|illustrations|dessin|portrait|peinture|affiche|poster|logo|wallpaper|fond d'ecran|picture|pictures|drawing|painting|artwork|avatar|visuel|miniature|thumbnail|caricature|croquis|sketch|banniere|banner)"
const VERB = "(?:genere|generer|generez|cree|creer|creez|fais|fait|faire|realise|realiser|produis|produire|donne|montre|montrer|invente|prepare|make|generate|create|produce|give|show|design|render)"
const ART = "(?:dessine|dessiner|dessines|peins|peindre|draw|paint|sketch|illustre|illustrate)"
const DESIRE = "(?:je veux|je voudrais|j'aimerais|j'ai besoin d|i want|i'd like|i need|i would like)"

const A = new RegExp(`(?:^|[\\s,;:.!?-])${VERB}(?:-moi|-nous|-lui)?\\b(?:\\s+[^\\s]+){0,5}?(?:\\s+|')${NOUN}\\b`)
const B = new RegExp(`(?:^|[\\s,;:.!?-])${ART}(?:-moi|-nous)?\\b`)
const C = new RegExp(`${DESIRE}\\s+(?:voir\\s+)?(?:[^\\s]+(?:\\s+|')){0,2}${NOUN}\\b`)

// Sujets techniques ou d'analyse : ce n'est pas une demande d'image à créer.
const TECH = /\b(docker|dockerfile|conteneur|container|kubernetes|k8s|iso|vm|machine virtuelle|disque|npm|pip|css|html|react|vue|javascript|python|java|php|sql|api|script|code|fonction|classe|svg|ascii|mermaid|diagramme|schema|uml|organigramme|graphique|chart|tableau|excel|pdf|word|docx|powerpoint|slides?|presentation|markdown|base64|favicon|background-image|dataset|ocr|analyse|analyser|decris|decrire|describe|explique|expliquer|traduis|resume|corrige|redimensionne|compresse|convertis|convertir)\b|<img|src=/
const QUESTION = /^\s*(comment|pourquoi|est-ce|c'est quoi|qu'est|quel|quelle|quels|quelles|what|how|why|can i|peut-on|ou |where)\b/

export function detectImageIntent(text) {
  if (typeof text !== 'string' || text.length < 8 || text.length > 500 || text.startsWith('/')) return null
  const t = norm(text)
  if (TECH.test(t) || QUESTION.test(t)) return null
  const head = t.slice(0, 120)
  for (const re of [A, C]) {
    const m = re.exec(head)
    if (m) return /[a-z0-9]{3,}/.test(t.slice(m.index + m[0].length)) ? text.trim() : null // il faut une description après le mot « image »
  }
  const b = B.exec(head)
  if (b && /[a-z0-9]{3,}/.test(t.slice(b.index + b[0].length))) return text.trim()
  return null
}

// Préfiltre LARGE : le message pourrait-il être une demande d'image formulée librement ?
// Si oui (et seulement alors), le serveur tranche avec un petit modèle (api/intent.js). Aucun coût pour les autres messages.
const VISUAL = /\b(voir|vois|voie|montre|montrer|ressemble|ressembler|visualise|visualiser|imagine|imaginer|represente|representer|apparence|aspect|look|looks|picture|image|images|photo|photos|dessin|illustration|portrait|peinture|affiche|logo|poster|wallpaper|visuel|show|see|sketch|draw|paint|render)\b/
const EDIT = /\b(plus|moins|version|couleur|couleurs|noir|blanc|style|fond|change|changer|modifie|modifier|remplace|ajoute|enleve|retire|refais|recommence|autre|differente|different|agrandis|variante|again|another|more|less|instead|brighter|darker|bigger|smaller)\b/

export function maybeImageRequest(text, { afterImage = false } = {}) {
  if (typeof text !== 'string' || text.length < 6 || text.length > 300 || text.startsWith('/')) return false
  const t = norm(text)
  if (TECH.test(t) || /^\s*(comment|pourquoi|how|why)\b/.test(t)) return false
  return VISUAL.test(t) || (afterImage && text.length <= 160 && EDIT.test(t))
}

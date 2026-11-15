// Règles pour les textes composés dynamiquement (compteurs, noms, etc.).
// Chaque règle : [expression, (match, t) => texte anglais].
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
export const RULES = [
  [/^(Bonne nuit\.|Bonjour\.|Bon après-midi\.|Bonsoir\.) Par quoi commencer \?$/, (m, t) => `${t(m[1])} Where shall we start?`],
  [/^Accent (.+)$/, (m, t) => `Accent ${t(cap(m[1])).toLowerCase()}`],
  [/^Import réussi \(fusionné avec (\d+) conversation(s?) existante(s?)\)\.$/, m => `Import successful (merged with ${m[1]} existing conversation${m[2]}).`],
  [/^Désépingler "(.*)"$/, m => `Unpin "${m[1]}"`],
  [/^Épingler "(.*)"$/, m => `Pin "${m[1]}"`],
  [/^Renommer "(.*)"$/, m => `Rename "${m[1]}"`],
  [/^Supprimer "(.*)"$/, m => `Delete "${m[1]}"`],
  [/^Créativité : (.+)$/, m => `Creativity: ${m[1]}`],
  [/^Longueur max : (.+)$/, m => `Max length: ${m[1]}`],
  [/^Nombre de questions : (.+)$/, m => `Number of questions: ${m[1]}`],
  [/^Vitesse : (.+)$/, m => `Speed: ${m[1]}`],
  [/^Prompts \(un par ligne\) · (.+)$/, m => `Prompts (one per line) · ${m[1]}`],
  [/^Image jointe (\d+)$/, m => `Attached image ${m[1]}`],
  [/^Transcription (\d+\/\d+)…$/, m => `Transcribing ${m[1]}…`],
  [/^Décris le code (.+) à générer\.\.\.$/, m => `Describe the ${m[1]} code to generate...`],
  [/^Génération (.+)\.\.\.$/, m => `Generating ${m[1]}...`],
  [/^(\d+),(\d) s$/, m => `${m[1]}.${m[2]} s`],
  [/^Trop de requêtes\. Réessayez dans (\d+)s\.$/, m => `Too many requests. Try again in ${m[1]}s.`],
  [/^Erreur Groq \(HTTP (\d+)\)$/, m => `Groq error (HTTP ${m[1]})`],
  [/^Image invalide/, () => 'Invalid image.'],
  [/^(\d+) (page|pages|diapositive|diapositives|bloc|blocs) · (.+) caractères · (.+?) (Ko|Mo)(.*)$/, m => {
    const w = { page: 'page', pages: 'pages', diapositive: 'slide', diapositives: 'slides', bloc: 'block', blocs: 'blocks' }[m[2]]
    return `${m[1]} ${w} · ${m[3]} characters · ${m[4]} ${m[5] === 'Ko' ? 'KB' : 'MB'}${m[6].replace('tronqué', 'truncated')}`
  }],
  [/^(\d+) document(s?) prêt(s?)$/, m => `${m[1]} document${m[2]} ready`],
  [/^« (.+) » est un scan : lecture par le modèle vision…$/, m => `“${m[1]}” is a scan: reading with the vision model…`],
  [/^OCR : pages (\d+)-(\d+) sur (\d+)$/, m => `OCR: pages ${m[1]}-${m[2]} of ${m[3]}`],
  [/^Lecture du PDF : page (\d+)\/(\d+)$/, m => `Reading PDF: page ${m[1]}/${m[2]}`],
  [/^Lecture de (.+)…$/, m => `Reading ${m[1]}…`],
  [/^« (.+) » est trop volumineux \(40 Mo maximum\)\.$/, m => `“${m[1]}” is too large (40 MB maximum).`],
  [/^Aucun texte trouvé dans « (.+) »\.$/, m => `No text found in “${m[1]}”.`],
  [/^Supprimer (.+)$/, m => `Delete ${m[1]}`],
  [/^Groq · (.+)$/, m => `Groq · ${m[1]}`],
]

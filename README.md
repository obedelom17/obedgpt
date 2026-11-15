# ObedGPT

Assistant IA propulsé uniquement par **Groq**, avec rotation automatique de clés. Aucune autre API (Gemini, etc.) n'est utilisée ni configurable.

## Fonctionnalités

- **Chat** en streaming : historique (épinglage, renommage en ligne, recherche), mode temporaire, dictée vocale, lecture à voix haute des réponses, durée de génération, export Markdown/PDF
- **Commandes rapides** : tape `/` dans le champ de saisie (`/resume`, `/traduire`, `/expliquer`, `/corriger`, `/code`, `/plan`)
- **Code** : génération et explication de code multi-langage, aperçu HTML, copie et téléchargement
- **Text-to-Speech** : synthèse vocale navigateur avec surlignage mot par mot
- **Apparence** : thème clair/sombre/auto, 4 couleurs d'accent, taille du texte
- **Palette de commandes** (`Ctrl/Cmd + K`), barre latérale repliable (`Ctrl/Cmd + B`), application installable (PWA)
- **SmartRouter** : rotation entre plusieurs clés Groq

## Installation

```bash
npm install
```

## Configuration

Copie `.env.example` en `.env.local` et renseigne tes clés Groq :

```env
GROQ_API_KEYS=gsk_xxx,gsk_yyy    # 1 à 3 clés séparées par des virgules
# GROQ_MODEL=openai/gpt-oss-120b  # optionnel
```

## Développement

```bash
npm run dev
```

## Déploiement

```bash
vercel --prod
```

Variables à définir dans Vercel (Settings → Environment Variables) :

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEYS` | Une ou plusieurs clés Groq, séparées par des virgules |
| `GROQ_MODEL` | (optionnel) Modèle Groq utilisé, par défaut `openai/gpt-oss-120b` |

## SmartRouter

1. **Rate limit** : 10 requêtes/minute par IP
2. **Cache** : 3 minutes pour les requêtes identiques
3. **Rotation Groq** : bascule automatique vers la clé suivante quand le quota d'une clé est atteint
4. **Budget de tokens** : historique et réponses plafonnés pour économiser les quotas gratuits

## Identité visuelle

- Logo : bulle de dialogue en « O » avec un point jaune (`src/components/Logo.jsx`, `public/favicon.svg`). Les icônes PWA se régénèrent avec `python3 scripts/generate_icons.py`.
- Polices : Bricolage Grotesque (titres), Instrument Sans (texte), JetBrains Mono (code).
- Les couleurs vivent dans `src/index.css` (variables CSS) : vert `#0e7a5c` et jaune `#f2b008` par défaut.


## Fonctionnalités Groq (clé gratuite)

Une seule variable : `GROQ_API_KEYS`. Aucune autre clé n'est nécessaire.

| Page | Ce que ça utilise |
|---|---|
| **Chat** | Choix du modèle (liste en direct), raisonnement (gpt-oss, qwen3) affiché, **vision** (images collées, déposées ou jointes), **recherche web** et **exécution de code** via Compound, mode JSON, agent à outils, dictée Whisper, lecture Orpheus |
| **Voix** | **Transcrire** (Whisper large-v3 / turbo, traduction vers l'anglais, horodatage, export TXT / SRT / VTT / JSON, longs fichiers découpés), **Parler** (Orpheus anglais et arabe, directions vocales, export WAV), **Conversation** mains libres |
| **Atelier** | Traduire, résumer, reformuler, corriger, e-mail, extraction **JSON**, quiz et cartes, analyse d'image (OCR, tableaux), **modération** (gpt-oss-safeguard), **anti-injection** (Prompt Guard), exécution Python |
| **Studio Groq** | Catalogue de modèles, API **Batch** (200 prompts), agent avec **function calling** et serveurs **MCP**, quotas en direct |
| **Code** | Génération, explication, exécution Python |

Limites à connaître : Groq ne génère ni images ni embeddings ; Orpheus lit l'anglais et l'arabe (le français passe par la voix du navigateur) ; certains modèles (Orpheus) demandent d'accepter leurs conditions une fois dans la console Groq ; l'API Batch peut nécessiter un compte avec facturation.


## Partage, diagrammes, aperçu, anglais

- **Partage par lien** : bouton dans le chat et sur chaque réponse. La conversation est compressée dans la partie `#` de l'URL : rien n'est stocké sur un serveur. Pour des liens courts (`/s/xxxxxxxxxx`, conservés 30 jours), crée une base Redis gratuite sur upstash.com et renseigne `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` dans Vercel. Sans ça, l'app utilise le lien intégré (plus long, mais sans aucun stockage).
- **Mermaid** : les blocs ```` ```mermaid ```` deviennent des diagrammes (chargés à la demande), exportables en SVG.
- **Aperçu** : les blocs `html` et `svg` s'affichent dans une iframe isolée (mobile, tablette, bureau).
- **Sécurité Markdown** : `rehype-sanitize` retire scripts, iframes et gestionnaires d'évènements.
- **Anglais** : sélecteur FR/EN (header, paramètres, palette) ou `?lang=en`. Les textes sont traduits au rendu via `src/i18n` (dictionnaire `en.json` + `rules.js`). Pour traduire un nouveau texte, ajoute-le dans `en.json`.


## Documents (PDF, Word, Excel, PowerPoint, scans)

Bouton « Joindre un document » dans le chat. Le texte est extrait **dans le navigateur** (pdf.js, mammoth, SheetJS, JSZip) et conservé dans IndexedDB : le fichier n'est jamais envoyé à un serveur.
- Petit document : tout le texte part avec la question.
- Gros document : recherche par mots-clés (BM25, MiniSearch) + reformulation de la question par un modèle rapide ; seuls les meilleurs passages partent, avec citations `[fichier, p. N]`.
- Résumé demandé : extraits répartis sur tout le document.
- PDF scannés et photos : OCR page par page par le modèle vision de Groq (même clé), jusqu'à 45 pages.
- Réglage « Profondeur de lecture » : 8 000 / 12 000 / 24 000 caractères par question (le quota gratuit de Groq limite les tokens par minute).

## Hébergement sur Cloudflare Pages

L'app tourne telle quelle sur Cloudflare : `functions/api/[[route]].js` adapte les routes `api/` (écrites pour Vercel) aux Pages Functions, y compris le streaming du chat. Testé avec `wrangler pages dev` (workerd).

**Déploiement par Git (recommandé)**
1. Pousse le dépôt sur GitHub.
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git.
3. Build command : `npm run build` · Output directory : `dist`.
4. Settings → Variables and Secrets : ajoute `GROQ_API_KEYS` (type Secret) ; en option `GROQ_MODEL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ALLOWED_ORIGINS`.
5. Settings → Functions → Compatibility flags : `nodejs_compat` (déjà dans `wrangler.toml`, vérifie qu'il est actif pour Production et Preview).

**Déploiement en ligne de commande**
```
npx wrangler login
npx wrangler pages secret put GROQ_API_KEYS --project-name obedgpt
npm run cf:deploy
```
**Test local** : copie `.dev.vars.example` en `.dev.vars`, puis `npm run cf:dev` (http://localhost:8788).

Notes : l'offre gratuite limite le temps CPU à 10 ms par requête (le streaming et l'attente de Groq ne comptent pas) ; si `transcribe` ou `agent` dépassent, passe au plan Workers payant. `GROQ_BASE_URL` permet de passer par Cloudflare AI Gateway (cache, journaux, limites). Les limites de débit par IP sont en mémoire par instance : pour une vraie protection, ajoute une règle de rate limiting Cloudflare sur `/api/*`.

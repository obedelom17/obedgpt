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

# ObedGPT 🚀

> Interface IA multi-modal propulsée par Google Gemini — Créé par Elom Obed AGBEBAVI

## ✨ Fonctionnalités

| Mode | Modèle | Description |
|------|--------|-------------|
| 💬 Chat | gemini-2.0-flash | Conversation multi-tour avec invite système |
| 👁️ Vision | gemini-2.0-flash | Analyse et compréhension d'images |
| 📄 Documents | gemini-2.0-flash | Lecture PDF, TXT, CSV, JSON |
| 🎙️ Audio | gemini-2.0-flash | Transcription et analyse audio |
| 🎬 Vidéo | gemini-2.0-flash | Analyse de contenu vidéo |
| 🌐 Web Search | gemini-2.0-flash + Google | Recherche web en temps réel |
| 💻 Code | gemini-2.0-flash | Génération de code multi-langage |
| ✨ Imagine | gemini-2.0-flash-exp-image-generation | Génération d'images IA |
| 📊 Embeddings | text-embedding-004 | Similarité sémantique |
| 🔊 TTS | Web Speech API | Synthèse vocale |

## 🛠️ Stack Technique

- **Frontend** : React 18 + Vite + Tailwind CSS
- **API** : Vercel Serverless Functions (Node.js)
- **IA** : Google Gemini API (`@google/generative-ai`)
- **UI** : DM Sans + Syne + JetBrains Mono
- **Déploiement** : Vercel

## 🚀 Déploiement sur Vercel

### 1. Préparer le repo GitHub

```bash
git init
git add .
git commit -m "feat: ObedGPT initial"
git remote add origin https://github.com/obedelom17/obedgpt.git
git push -u origin main
```

### 2. Connecter à Vercel

1. Va sur [vercel.com](https://vercel.com) → **New Project**
2. Importe ton repo GitHub `obedgpt`
3. Vercel détecte automatiquement Vite
4. **NE PAS ENCORE DÉPLOYER** → d'abord configurer l'env

### 3. Configurer la variable d'environnement

Dans Vercel → Settings → **Environment Variables** :

```
GEMINI_API_KEY = ta_clé_api_gemini
```

> ⚠️ Coche les 3 environnements : Production, Preview, Development

### 4. Déployer

```
Vercel → Deployments → Redeploy
```

### 5. Développement local

```bash
# Créer .env.local (jamais commité)
echo "GEMINI_API_KEY=ta_clé_ici" > .env.local

# Lancer le dev server Vercel (pour les API routes)
npm install -g vercel
vercel dev
```

## 📁 Structure du Projet

```
obedgpt/
├── api/                    # Serverless functions Vercel
│   ├── chat.js             # Chat multi-tour
│   ├── vision.js           # Analyse images
│   ├── document.js         # Analyse documents
│   ├── audio.js            # Analyse audio
│   ├── video.js            # Analyse vidéo
│   ├── search.js           # Web search grounding
│   ├── code.js             # Génération de code
│   ├── imagine.js          # Génération d'images
│   └── embed.js            # Embeddings sémantiques
├── src/
│   ├── components/
│   │   ├── layout/         # Sidebar, Header
│   │   ├── modes/          # Un composant par mode
│   │   ├── ui/             # Composants partagés
│   │   └── Settings.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
├── vercel.json
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 🔑 Obtenir une clé API Gemini

1. Va sur [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Clique sur **Create API Key**
3. Copie la clé → Colle dans Vercel env vars

## ⚡ Limites Free Tier Gemini

- **gemini-2.0-flash** : 15 req/min, 1M tokens/min
- **text-embedding-004** : 1500 req/min
- **Stockage fichiers** : 20GB gratuit

---

Made with ❤️ by Obed · Powered by Google Gemini

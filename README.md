# ObedGPT v2.0

Interface IA multi-modale propulsée par SmartRouter (Groq + Gemini).

## ✨ Fonctionnalités

- **Chat** avec historique, documents (PDF, TXT, CSV, JSON, DOC, DOCX), mode temporaire
- **Vision** — analyse d'images
- **Audio** — transcription
- **Code** — génération multi-langage
- **Text-to-Speech** — synthèse vocale
- **Thème clair/sombre**
- **SmartRouter** — rotation Groq + fallback Gemini automatique

## 🚀 Installation

```bash
npm install
```

## 🔑 Configuration

Copie `.env.example` en `.env.local` et remplis tes clés :

```env
GROQ_API_KEYS=gsk_xxx,gsk_yyy    # 2-3 clés séparées par virgule
GEMINI_API_KEY=AIza...            # Clé fallback
```

## 🖥️ Développement

```bash
npm run dev
```

## 🌐 Déploiement

```bash
vercel --prod
```

## 📁 Variables Vercel

Dans Vercel Dashboard → Settings → Environment Variables :

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEYS` | 2-3 clés Groq séparées par des virgules |
| `GEMINI_API_KEY` | Clé Google AI Studio (fallback) |

## 🧠 SmartRouter

Le backend utilise un router intelligent :
1. **Rate limit** — 5 req/min par IP
2. **Cache** — 5 minutes pour les requêtes identiques
3. **Rotation Groq** — bascule entre 2-3 clés automatiquement
4. **Fallback Gemini** — si toutes les clés Groq sont en quota

---

Made with ❤️ by Obed

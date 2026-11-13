# ObedGPT

Assistant IA propulsé uniquement par **Groq**, avec rotation automatique de clés.

## Fonctionnalités

- **Chat** en streaming avec historique (épinglage, renommage, recherche), mode temporaire, dictée vocale, export Markdown/PDF
- **Code** : génération et explication de code multi-langage
- **Text-to-Speech** : synthèse vocale
- **Thème clair/sombre**, palette de commandes (`Ctrl/Cmd + K`), barre latérale repliable (`Ctrl/Cmd + B`)
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

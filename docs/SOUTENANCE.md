# ObedGPT : guide de soutenance

## Pitch (30 secondes)
Assistant IA gratuit, déployé sur Cloudflare, qui combine chat, code, voix, analyse de documents et génération d'images. Aucun compte : les données restent dans le navigateur. Les clés d'API restent sur le serveur.

## Choix techniques et justification
| Choix | Pourquoi |
|---|---|
| React + Vite + Tailwind | Rapide à construire, build statique, large écosystème |
| Groq | Inférence très rapide, quota gratuit, plusieurs modèles (texte, vision, audio) |
| Cloudflare Pages + Functions | Bande passante illimitée, pas de limite de 12 fonctions (Vercel Hobby), proche de l'Afrique |
| Workers AI (FLUX) | Génération d'images sans clé supplémentaire, quota gratuit |
| Pas de comptes | Moins de données personnelles à protéger, aucune base à sécuriser |
| Stockage navigateur (localStorage, IndexedDB) | Historique, documents et galerie restent chez l'utilisateur |

## Fonctionnalités et comment les défendre
- **Chat en streaming** : flux NDJSON ; l'utilisateur lit la réponse au fil de l'eau. Sources et raisonnement affichés séparément.
- **Vision** : choix automatique d'un modèle vision parmi le catalogue Groq en direct ; bascule sur un autre modèle s'il est saturé. Cause d'un bug réel : Groq retire des modèles, d'où `/api/health`.
- **Documents (PDF, Word, Excel)** : texte extrait dans le navigateur, recherche BM25, seuls les passages utiles partent au modèle, citations `[fichier, p. N]`.
- **Voix** : dictée Whisper, lecture Orpheus ou navigateur.
- **Variantes de réponse** : chaque régénération garde l'ancienne réponse (navigation 1/2).
- **Génération d'images** : `/image`, prompt traduit en anglais, 8 images par jour et par IP, galerie locale.
- **Partage** : lien intégré (conversation dans l'adresse, rien de stocké) ou lien court 30 jours.
- **Sécurité** : clés Groq côté serveur, rotation de clés, limites par IP, CSP, HTML de prévisualisation dans une iframe isolée (`sandbox`), Markdown nettoyé (`rehype-sanitize`).
- **Qualité** : tests unitaires, test de bout en bout dans un vrai navigateur, CI GitHub Actions, Lighthouse 93 / 100 / 96 / 100 (mobile).
- **Accessibilité** : 100 sur Lighthouse, navigation clavier complète, `prefers-reduced-motion` respecté.

## Questions probables du jury
- *Pourquoi pas de base de données ?* Choix de confidentialité et de simplicité. Limite assumée : pas de synchronisation entre appareils (export/import disponible).
- *Que se passe-t-il si Groq tombe ?* Erreur claire, nouvelles tentatives, bascule de modèle vision ; sonde `/api/health` pour être alerté.
- *Comment sont protégées les clés ?* Variables secrètes Cloudflare, jamais envoyées au navigateur.
- *Limites actuelles ?* Quotas gratuits (Groq, 10 000 neurones/jour Workers AI), limites par IP en mémoire, pas de réinitialisation de compte car pas de compte.
- *Données personnelles ?* Voir `public/privacy.html` : messages envoyés à Groq, pas de suivi, pas de publicité.

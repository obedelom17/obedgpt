import { Settings as SettingsIcon, Check, ExternalLink, Info } from 'lucide-react'

const FEATURES = [
  { mode: 'Chat', model: 'gemini-2.0-flash', desc: 'Conversation multi-tour avec contexte persistant', free: true },
  { mode: 'Vision', model: 'gemini-2.0-flash', desc: 'Analyse et compréhension d\'images', free: true },
  { mode: 'Documents', model: 'gemini-2.0-flash', desc: 'Lecture et analyse de PDF, TXT, CSV', free: true },
  { mode: 'Audio', model: 'gemini-2.0-flash', desc: 'Transcription et analyse de fichiers audio', free: true },
  { mode: 'Vidéo', model: 'gemini-2.0-flash', desc: 'Analyse de contenu vidéo', free: true },
  { mode: 'Web Search', model: 'gemini-2.0-flash + Google', desc: 'Recherche web en temps réel avec citations', free: true },
  { mode: 'Code', model: 'gemini-2.0-flash', desc: 'Génération de code multi-langage', free: true },
  { mode: 'Imagine', model: 'gemini-2.0-flash-exp-image-generation', desc: 'Génération d\'images par IA', free: true },
  { mode: 'Embeddings', model: 'text-embedding-004', desc: 'Vecteurs sémantiques et similarité', free: true },
  { mode: 'Text-to-Speech', model: 'Web Speech API', desc: 'Synthèse vocale native du navigateur', free: true },
]

export default function Settings() {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl amber-gradient flex items-center justify-center">
              <SettingsIcon size={18} className="text-navy-900" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-100">ObedGPT</h2>
              <p className="text-xs text-slate-500">Configuration & Informations</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'Modes actifs', value: '10' },
              { label: 'Modèle principal', value: 'Flash 2.0' },
              { label: 'Déploiement', value: 'Vercel' },
              { label: 'Clé API', value: '.env sécurisée' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-navy-700/40 rounded-xl p-3 border border-surface-border">
                <div className="text-lg font-display font-bold text-amber-400">{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* API Key info */}
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-200">Configuration de la clé API</p>
              <p className="text-xs text-slate-400">
                La clé API Gemini est stockée dans les variables d'environnement Vercel (<code className="text-amber-300 bg-amber-500/10 px-1 rounded">GEMINI_API_KEY</code>).
                Elle n'est jamais exposée côté client.
              </p>
              <div className="space-y-1 text-xs text-slate-500 font-mono bg-navy-800 p-3 rounded-xl border border-surface-border">
                <p className="text-slate-400"># Vercel Dashboard → Settings → Environment Variables</p>
                <p>GEMINI_API_KEY=<span className="text-amber-400">ta_clé_ici</span></p>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                <ExternalLink size={11} />
                Obtenir une clé API sur Google AI Studio
              </a>
            </div>
          </div>
        </div>

        {/* Features table */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">Fonctionnalités Gemini</p>
          </div>
          <div className="divide-y divide-surface-border">
            {FEATURES.map(f => (
              <div key={f.mode} className="flex items-center gap-4 px-4 py-3 hover:bg-navy-700/20 transition-colors">
                <div className="w-24 flex-shrink-0">
                  <span className="text-sm font-display font-semibold text-slate-200">{f.mode}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400">{f.desc}</p>
                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">{f.model}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full font-mono">
                    <Check size={9} strokeWidth={3} />
                    Gratuit
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="card p-4 space-y-2">
          <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-3">Ressources</p>
          {[
            { label: 'Documentation Gemini API', url: 'https://ai.google.dev/docs' },
            { label: 'Google AI Studio', url: 'https://aistudio.google.com' },
            { label: 'Vercel Dashboard', url: 'https://vercel.com/dashboard' },
            { label: 'Limites du Free Tier', url: 'https://ai.google.dev/pricing' },
          ].map(({ label, url }) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400 transition-colors py-1">
              <ExternalLink size={13} className="flex-shrink-0" />
              {label}
            </a>
          ))}
        </div>

        <p className="text-center text-xs text-slate-600 pb-4">
          ObedGPT · Créé par Elom Obed AGBEBAVI · Powered by Google Gemini
        </p>
      </div>
    </div>
  )
}

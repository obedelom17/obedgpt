import { Settings as SettingsIcon, Check, ExternalLink, Info } from 'lucide-react'

const FEATURES = [
  { mode: 'Chat',         desc: 'Conversation multi-tour avec contexte persistant',  free: true },
  { mode: 'Vision',       desc: "Analyse et compréhension d'images",                 free: true },
  { mode: 'Documents',    desc: 'Lecture et analyse de PDF, TXT, CSV',               free: true },
  { mode: 'Audio',        desc: 'Transcription et analyse de fichiers audio',        free: true },
  { mode: 'Vidéo',        desc: 'Analyse de contenu vidéo',                          free: true },
  { mode: 'Web Search',   desc: 'Recherche web en temps réel avec citations',        free: true },
  { mode: 'Code',         desc: 'Génération de code multi-langage',                  free: true },
  { mode: 'Imagine',      desc: "Génération d'images par IA",                        free: true },
  { mode: 'Embeddings',   desc: 'Vecteurs sémantiques et similarité',                free: true },
  { mode: 'Text-to-Speech', desc: 'Synthèse vocale native du navigateur',            free: true },
]

export default function Settings() {
  return (
    <div className="h-full overflow-y-auto p-4 bg-navy-900">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl amber-gradient flex items-center justify-center">
              <SettingsIcon size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-stone-800">ObedGPT</h2>
              <p className="text-xs text-stone-400">Configuration & Informations</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'Modes actifs', value: '10' },
              { label: 'Modèle',       value: 'Flash' },
              { label: 'Déploiement',  value: 'Vercel' },
              { label: 'Clé API',      value: '.env sécurisée' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                <div className="text-lg font-display font-bold text-orange-500">{value}</div>
                <div className="text-xs text-stone-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* API Key info */}
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-stone-800">Configuration de la clé API</p>
              <p className="text-xs text-stone-500">
                La clé API est stockée dans les variables d'environnement Vercel (<code className="text-orange-600 bg-orange-50 px-1 rounded">GEMINI_API_KEY</code>).
                Elle n'est jamais exposée côté client.
              </p>
              <div className="text-xs font-mono bg-stone-50 border border-stone-200 p-3 rounded-xl text-stone-400">
                <p># Vercel → Settings → Environment Variables</p>
                <p>GEMINI_API_KEY=<span className="text-orange-500">ta_clé_ici</span></p>
              </div>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-700 transition-colors">
                <ExternalLink size={11} />
                Obtenir une clé API
              </a>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-orange-100 bg-orange-50/50">
            <p className="text-xs font-display font-semibold text-stone-500 uppercase tracking-wider">Fonctionnalités</p>
          </div>
          <div className="divide-y divide-orange-50">
            {FEATURES.map(f => (
              <div key={f.mode} className="flex items-center gap-4 px-4 py-3 hover:bg-orange-50/40 transition-colors">
                <div className="w-24 flex-shrink-0">
                  <span className="text-sm font-display font-semibold text-stone-800">{f.mode}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-stone-500">{f.desc}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-mono flex-shrink-0">
                  <Check size={9} strokeWidth={3} /> Gratuit
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-stone-300 pb-4">
          ObedGPT · Créé par Elom Obed AGBEBAVI
        </p>
      </div>
    </div>
  )
}

import { Settings as SettingsIcon, Check, ExternalLink, Info, Zap } from 'lucide-react'

const FEATURES = [
  { mode: 'Chat',           model: 'llama-3.3-70b-versatile',              desc: 'Conversation multi-tour, raisonnement avancé, LaTeX', rpm: 30, rpd: 14400 },
  { mode: 'Vision',         model: 'llama-4-scout-17b-16e-instruct',       desc: "Analyse et compréhension d'images",                  rpm: 30, rpd: 14400 },
  { mode: 'Audio',          model: 'whisper-large-v3-turbo',               desc: 'Transcription audio ultra-rapide',                   rpm: 20, rpd: 2000  },
  { mode: 'Code',           model: 'llama-3.3-70b-versatile',              desc: 'Génération de code multi-langage, 8K tokens',        rpm: 30, rpd: 14400 },
  { mode: 'Text-to-Speech', model: 'Web Speech API (navigateur)',          desc: 'Synthèse vocale native, aucune limite',              rpm: null, rpd: null },
]

export default function Settings() {
  return (
    <div className="h-full overflow-y-auto p-4 bg-navy-900">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl amber-gradient flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-stone-800">ObedGPT</h2>
              <p className="text-xs text-stone-400">Créé par Obed Elom AGBEBAVI · Gratuit</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: 'Modes actifs', value: '5' },
              { label: 'Req/jour',     value: '14 400' },
              { label: 'Vitesse',      value: 'Ultra' },
              { label: 'Coût',         value: '0 €' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                <div className="text-lg font-display font-bold text-orange-500">{value}</div>
                <div className="text-xs text-stone-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* API Key */}
        

        {/* Models table */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-orange-100 bg-orange-50/50">
            <p className="text-xs font-display font-semibold text-stone-500 uppercase tracking-wider">Modèles & Limites</p>
          </div>
          <div className="divide-y divide-orange-50">
            {FEATURES.map(f => (
              <div key={f.mode} className="px-4 py-3 hover:bg-orange-50/40 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-display font-semibold text-stone-800">{f.mode}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                    <Check size={9} strokeWidth={3} /> Gratuit
                  </span>
                </div>
                <p className="text-xs text-stone-500">{f.desc}</p>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-[10px] font-mono text-stone-400">{f.model}</span>
                  {f.rpm && (
                    <span className="text-[10px] font-mono text-orange-400 ml-auto">
                      {f.rpm} req/min · {f.rpd?.toLocaleString()} req/jour
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-stone-300 pb-4">
          ObedGPT · Elom Obed AGBEBAVI 
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Settings as SettingsIcon, Zap, Trash2, User } from 'lucide-react'
import { useApp } from '../App'

const FEATURES = [
  { mode: 'Chat',           model: 'LLaMA 3.3 70B / Gemini 2.5 Flash', desc: 'Conversation multi-tour, raisonnement avancé, LaTeX' },
  { mode: 'Vision',         model: 'Gemini 2.5 Flash',                  desc: "Analyse et compréhension d'images" },
  { mode: 'Audio',          model: 'Gemini 2.5 Flash',                  desc: 'Transcription et analyse audio' },
  { mode: 'Code',           model: 'LLaMA 3.3 70B / Gemini 2.5 Flash', desc: 'Génération de code multi-langage' },
  { mode: 'Text-to-Speech', model: 'Web Speech API (navigateur)',        desc: 'Synthèse vocale native' },
]

export default function Settings() {
  const { history, clearHistory } = useApp()
  const [avatar, setAvatar] = useState(() => localStorage.getItem('obedgpt-avatar') || '')

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Image trop volumineuse (max 2MB)'); return }
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result
      localStorage.setItem('obedgpt-avatar', base64)
      setAvatar(base64)
    }
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    localStorage.removeItem('obedgpt-avatar')
    setAvatar('')
  }

  return (
    <div className="h-full overflow-y-auto p-3 md:p-4 bg-stone-50">
      <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl amber-gradient flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-stone-800 text-base md:text-lg">ObedGPT</h2>
              <p className="text-xs text-stone-400">Interface IA multi-modale · SmartRouter</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:gap-3 text-center">
            {[
              { label: 'Modes actifs', value: '5' },
              { label: 'Router',       value: 'Smart' },
              { label: 'Vitesse',      value: 'Ultra' },
              { label: 'Coût',         value: '0 €' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-orange-50 rounded-xl p-2.5 md:p-3 border border-orange-100">
                <div className="text-base md:text-lg font-display font-bold text-orange-500">{value}</div>
                <div className="text-[10px] md:text-xs text-stone-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Avatar / Photo */}
        <div className="card p-4 md:p-6">
          <h3 className="font-display font-semibold text-stone-800 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
            <User size={16} /> Photo de profil
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover border border-orange-200 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                <User size={22} className="text-orange-400" />
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <label className="px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 text-sm cursor-pointer hover:bg-orange-100 transition-colors">
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                Changer
              </label>
              {avatar && (
                <button onClick={removeAvatar}
                  className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm hover:bg-red-100 transition-colors">
                  Supprimer
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-2">JPG, PNG, WebP — Max 2MB</p>
        </div>

        {/* History Management */}
        <div className="card p-4 md:p-6">
          <h3 className="font-display font-semibold text-stone-800 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
            <Trash2 size={16} /> Historique
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 border border-orange-100">
            <div>
              <div className="text-sm font-medium text-stone-700">Conversations sauvegardées</div>
              <div className="text-xs text-stone-400">{history.length} conversation{history.length !== 1 ? 's' : ''}</div>
            </div>
            <button onClick={clearHistory}
              className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm hover:bg-red-100 transition-colors w-full sm:w-auto">
              Tout effacer
            </button>
          </div>
        </div>

        {/* Models table */}
        <div className="card p-4 md:p-6 overflow-hidden">
          <h3 className="font-display font-semibold text-stone-800 mb-3 md:mb-4 text-sm md:text-base">Modèles utilisés</h3>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs md:text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-orange-100 text-stone-400 text-[10px] md:text-xs uppercase">
                  <th className="text-left pb-2 pr-4">Mode</th>
                  <th className="text-left pb-2 pr-4">Modèle</th>
                  <th className="text-left pb-2">Description</th>
                </tr>
              </thead>
              <tbody className="text-stone-600">
                {FEATURES.map(f => (
                  <tr key={f.mode} className="border-b border-orange-50">
                    <td className="py-2 pr-4 font-medium">{f.mode}</td>
                    <td className="py-2 pr-4 font-mono text-[10px] md:text-xs text-orange-600">{f.model}</td>
                    <td className="py-2 text-[10px] md:text-xs">{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-stone-300 pb-4">
          ObedGPT · SmartRouter (Groq + Gemini) · Gratuit
        </p>
      </div>
    </div>
  )
}

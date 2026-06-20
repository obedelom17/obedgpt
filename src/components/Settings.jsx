import { useState, useRef } from 'react'
import { Zap, Trash2, User, Download, Upload, Sun, Moon, Monitor, Type, Sparkles, Info, Mail, Github } from 'lucide-react'
import { useApp } from '../App'
import { useTheme } from '../hooks/useTheme.jsx'

const PERSONA_KEY = 'obedgpt-persona'
const CHANGELOG = [
  { date: 'Juin 2026', items: ['Mode sombre automatique', 'Application installable (PWA)', 'Réponses en streaming', 'Dictée vocale & micro live'] },
  { date: 'Mai 2026',  items: ['Refonte navigation & économie de tokens', 'Export/Import de l\'historique'] },
]

// Redimensionne l'image côté navigateur avant de la stocker : une photo de
// 2MB devient quelques dizaines de Ko, ce qui évite de dépasser le quota du
// localStorage (c'est ce qui faisait silencieusement échouer l'enregistrement
// de l'avatar — l'erreur de quota n'était jamais affichée à l'utilisateur).
function resizeImage(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Impossible de lire ce fichier.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Image invalide ou corrompue.'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function Settings() {
  const { history, clearHistory, importHistory } = useApp()
  const { themePref, setThemePref, fontSize, setFontSize } = useTheme()
  const [avatar, setAvatar] = useState(() => localStorage.getItem('obedgpt-avatar') || '')
  const [avatarError, setAvatarError] = useState(null)
  const [importMessage, setImportMessage] = useState(null)
  const [persona, setPersona] = useState(() => localStorage.getItem(PERSONA_KEY) || '')
  const [personaSaved, setPersonaSaved] = useState(false)
  const importInputRef = useRef(null)

  const savePersona = () => {
    if (persona.trim()) localStorage.setItem(PERSONA_KEY, persona.trim())
    else localStorage.removeItem(PERSONA_KEY)
    setPersonaSaved(true)
    setTimeout(() => setPersonaSaved(false), 1500)
  }

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `obedgpt-historique-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setImportMessage(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const before = history.length
      importHistory(parsed)
      setImportMessage({ type: 'ok', text: `Import réussi (fusionné avec ${before} conversation${before !== 1 ? 's' : ''} existante${before !== 1 ? 's' : ''}).` })
    } catch (err) {
      setImportMessage({ type: 'error', text: err.message?.includes('JSON') ? "Fichier invalide : ce n'est pas un export ObedGPT valide (.json)." : (err.message || "Import impossible.") })
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    e.target.value = '' // permet de re-sélectionner le même fichier après une erreur
    if (!file) return
    setAvatarError(null)

    if (!file.type.startsWith('image/')) { setAvatarError('Choisis un fichier image (JPG, PNG, WebP).'); return }
    if (file.size > 8 * 1024 * 1024) { setAvatarError('Image trop volumineuse (max 8MB).'); return }

    try {
      const resized = await resizeImage(file)
      localStorage.setItem('obedgpt-avatar', resized)
      setAvatar(resized)
    } catch (err) {
      setAvatarError(err.message === 'QuotaExceededError' || err.name === 'QuotaExceededError'
        ? "Plus assez d'espace de stockage local. Essaie une image plus simple."
        : (err.message || "Impossible d'enregistrer cette photo."))
    }
  }

  const removeAvatar = () => {
    localStorage.removeItem('obedgpt-avatar')
    setAvatar('')
    setAvatarError(null)
  }

  return (
    <div className="h-full overflow-y-auto p-3 md:p-4 bg-stone-50">
      <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl amber-gradient flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-stone-800 text-base md:text-lg">ObedGPT</h2>
              <p className="text-xs text-stone-400">IA multi-modale</p>
            </div>
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
          <p className="text-xs text-stone-400 mt-2">JPG, PNG, WebP — Max 8MB, redimensionnée automatiquement</p>
          {avatarError && <p className="text-xs text-red-500 mt-1">{avatarError}</p>}
        </div>

        {/* Apparence */}
        <div className="card p-4 md:p-6">
          <h3 className="font-display font-semibold text-stone-800 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
            <Sun size={16} /> Apparence
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-stone-700 mb-2">Thème</div>
              <div className="flex gap-2">
                {[
                  { id: 'auto',  label: 'Auto',   Icon: Monitor },
                  { id: 'light', label: 'Clair',  Icon: Sun },
                  { id: 'dark',  label: 'Sombre', Icon: Moon },
                ].map(({ id, label, Icon }) => (
                  <button key={id} onClick={() => setThemePref(id)} aria-pressed={themePref === id}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs transition-colors ${themePref === id ? 'bg-orange-50 border-orange-300 text-orange-600 font-medium' : 'border-orange-100 text-stone-500 hover:bg-orange-50/60'}`}>
                    <Icon size={16} />{label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-1.5">"Auto" suit le thème de ton système.</p>
            </div>
            <div>
              <div className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-1.5"><Type size={14} /> Taille du texte</div>
              <div className="flex gap-2">
                {[{ id: 'sm', label: 'Petit' }, { id: 'md', label: 'Normal' }, { id: 'lg', label: 'Grand' }].map(({ id, label }) => (
                  <button key={id} onClick={() => setFontSize(id)} aria-pressed={fontSize === id}
                    className={`flex-1 py-2 rounded-xl border text-xs transition-colors ${fontSize === id ? 'bg-orange-50 border-orange-300 text-orange-600 font-medium' : 'border-orange-100 text-stone-500 hover:bg-orange-50/60'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Personnalité du Chat */}
        <div className="card p-4 md:p-6">
          <h3 className="font-display font-semibold text-stone-800 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
            <Sparkles size={16} /> Personnalité du Chat
          </h3>
          <textarea value={persona} onChange={e => setPersona(e.target.value)} onBlur={savePersona} rows={3} maxLength={300}
            placeholder="Ex : Réponds toujours de façon concise. Tutoie-moi. Explique comme à un débutant en programmation."
            aria-label="Instructions de personnalité pour le Chat" className="input-field w-full resize-none text-sm" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-stone-400">Ajouté à chaque conversation du mode Chat.</p>
            {personaSaved && <span className="text-xs text-orange-500">Enregistré ✓</span>}
          </div>
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
            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              <button onClick={exportHistory} disabled={history.length === 0} aria-label="Exporter l'historique en JSON"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 text-sm hover:bg-orange-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Download size={14} /> Exporter
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 text-sm cursor-pointer hover:bg-orange-100 transition-colors">
                <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" aria-label="Importer un historique JSON" />
                <Upload size={14} /> Importer
              </label>
              <button onClick={clearHistory} aria-label="Effacer tout l'historique"
                className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm hover:bg-red-100 transition-colors">
                Tout effacer
              </button>
            </div>
          </div>
          {importMessage && (
            <p className={`text-xs mt-2 ${importMessage.type === 'ok' ? 'text-orange-600' : 'text-red-500'}`}>{importMessage.text}</p>
          )}
          <p className="text-xs text-stone-400 mt-2">L'export te permet de garder une copie de tes conversations (elles ne vivent que dans ce navigateur) et de les retrouver sur un autre appareil via "Importer".</p>
        </div>

        {/* À propos */}
        <div className="card p-4 md:p-6">
          <h3 className="font-display font-semibold text-stone-800 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
            <Info size={16} /> À propos
          </h3>
          <p className="text-sm text-stone-600 mb-4">
            ObedGPT est développé par <span className="font-medium text-stone-800">Obed Elom AGBEBAVI</span> — React, Vite, Tailwind, Vercel.
          </p>
          <div className="space-y-3 mb-4">
            {CHANGELOG.map(entry => (
              <div key={entry.date}>
                <div className="text-xs font-mono font-medium text-orange-500 mb-1">{entry.date}</div>
                <ul className="text-xs text-stone-500 space-y-0.5 pl-4 list-disc">
                  {entry.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap pt-3 border-t border-orange-100">
            <a href="mailto:agbebaviobedelom@gmail.com?subject=Feedback%20ObedGPT" aria-label="Envoyer un feedback par e-mail"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 text-sm hover:bg-orange-100 transition-colors">
              <Mail size={14} /> Feedback
            </a>
            <a href="https://github.com/obedelom17/obedgpt" target="_blank" rel="noopener noreferrer" aria-label="Voir le code source sur GitHub"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-50 border border-orange-100 text-stone-600 text-sm hover:bg-orange-50 transition-colors">
              <Github size={14} /> Code source
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

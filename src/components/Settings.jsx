import { useState } from 'react'
import { Zap, Trash2, User } from 'lucide-react'
import { useApp } from '../App'

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
  const { history, clearHistory } = useApp()
  const [avatar, setAvatar] = useState(() => localStorage.getItem('obedgpt-avatar') || '')
  const [avatarError, setAvatarError] = useState(null)

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

      </div>
    </div>
  )
}

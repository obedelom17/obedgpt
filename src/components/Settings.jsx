import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, User, Download, Upload, Sun, Moon, Monitor, Mail, Github } from 'lucide-react'
import { useApp } from '../App'
import { useTheme, ACCENTS } from '../hooks/useTheme.jsx'
import Logo from './Logo'

const PERSONA_KEY = 'obedgpt-persona'
const CHANGELOG = [
  { date: 'Novembre 2026', items: ['Interface refondue : fond aurore, verre dépoli, halos interactifs, bordure lumineuse', 'Nouveau logo (G géométrique)', 'Commandes rapides avec /', "Lecture à voix haute des réponses", 'Choix de la couleur d\'accent'] },
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
  const { themePref, setThemePref, fontSize, setFontSize, accent, setAccent } = useTheme()
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
    <div className="page">
      <div className="page-inner">
        <div className="flex items-center gap-4 mb-1">
          <Logo size={44} />
          <div>
            <h2 className="page-title !mb-0">Paramètres</h2>
          </div>
        </div>
        <p className="page-sub mt-2">Apparence, personnalité de l'assistant et gestion de tes conversations. Tout reste dans ce navigateur.</p>

        <section className="row">
          <div><h3>Photo de profil</h3><p className="desc">JPG, PNG ou WebP, redimensionnée automatiquement.</p></div>
          <div>
            <div className="flex items-center gap-4">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" style={{ border: '1px solid var(--border-strong)' }} />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <User size={24} className="text-ink3" />
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <label className="btn-ghost cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  Changer
                </label>
                {avatar && <button onClick={removeAvatar} className="btn-ghost danger">Supprimer</button>}
              </div>
            </div>
            {avatarError && <p className="text-xs text-danger mt-2">{avatarError}</p>}
          </div>
        </section>

        <section className="row">
          <div><h3>Apparence</h3><p className="desc">Le mode « Auto » suit le thème de ton système.</p></div>
          <div className="space-y-5">
            <div>
              <span className="field-label">Thème</span>
              <div className="segmented" role="group" aria-label="Thème">
                {[{ id: 'auto', label: 'Auto', Icon: Monitor }, { id: 'light', label: 'Clair', Icon: Sun }, { id: 'dark', label: 'Sombre', Icon: Moon }].map(({ id, label, Icon }) => (
                  <button key={id} onClick={() => setThemePref(id)} aria-pressed={themePref === id}>
                    {themePref === id && <motion.span layoutId="theme-seg" className="seg-pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                    <span><Icon size={14} />{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="field-label">Couleur d'accent</span>
              <div className="flex gap-3">
                {ACCENTS.map(a => (
                  <button key={a.id} onClick={() => setAccent(a.id)} aria-pressed={accent === a.id} aria-label={`Accent ${a.label}`} title={a.label} className="swatch" style={{ background: a.swatch }}>
                    {accent === a.id && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}><Check size={16} color="#fff" strokeWidth={3} /></motion.span>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="field-label">Taille du texte</span>
              <div className="segmented" role="group" aria-label="Taille du texte">
                {[{ id: 'sm', label: 'Petit' }, { id: 'md', label: 'Normal' }, { id: 'lg', label: 'Grand' }].map(({ id, label }) => (
                  <button key={id} onClick={() => setFontSize(id)} aria-pressed={fontSize === id}>
                    {fontSize === id && <motion.span layoutId="font-seg" className="seg-pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="row">
          <div><h3>Personnalité du chat</h3><p className="desc">Ajoutée à chaque conversation du mode Chat. Elle s'applique aux nouvelles conversations.</p></div>
          <div>
            <textarea value={persona} onChange={e => setPersona(e.target.value)} onBlur={savePersona} rows={4} maxLength={300}
              placeholder="Ex : Réponds toujours de façon concise. Tutoie-moi. Explique comme à un débutant en programmation."
              aria-label="Instructions de personnalité pour le Chat" className="input-field w-full resize-none text-sm" />
            <div className="flex items-center justify-between mt-2 text-xs text-ink3">
              <span className="font-mono">{persona.length}/300</span>
              {personaSaved && <span className="text-accent">Enregistré</span>}
            </div>
          </div>
        </section>

        <section className="row">
          <div><h3>Historique</h3><p className="desc">Les conversations ne vivent que dans ce navigateur. Exporte-les pour les retrouver sur un autre appareil.</p></div>
          <div>
            <p className="text-sm mb-3"><span className="font-mono text-accent">{history.length}</span> conversation{history.length !== 1 ? 's' : ''} sauvegardée{history.length !== 1 ? 's' : ''}</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={exportHistory} disabled={history.length === 0} aria-label="Exporter l'historique en JSON" className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"><Download size={14} /> Exporter</button>
              <label className="btn-ghost cursor-pointer">
                <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" aria-label="Importer un historique JSON" />
                <Upload size={14} /> Importer
              </label>
              <ClearButton onConfirm={clearHistory} disabled={history.length === 0} />
            </div>
            {importMessage && <p className={`text-xs mt-3 ${importMessage.type === 'ok' ? 'text-accent' : 'text-danger'}`}>{importMessage.text}</p>}
          </div>
        </section>

        <section className="row">
          <div><h3>À propos</h3><p className="desc">React, Vite, Tailwind, Vercel. Modèle servi par Groq.</p></div>
          <div>
            <p className="text-sm text-ink2 mb-4">ObedGPT est développé par <span className="font-semibold text-ink">Obed Elom AGBEBAVI</span>.</p>
            <div className="space-y-4 mb-5">
              {CHANGELOG.map(entry => (
                <div key={entry.date}>
                  <div className="text-xs font-mono font-medium text-accent mb-1">{entry.date}</div>
                  <ul className="text-sm text-ink2 space-y-0.5 pl-4 list-disc">
                    {entry.items.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href="mailto:agbebaviobedelom@gmail.com?subject=Feedback%20ObedGPT" aria-label="Envoyer un feedback par e-mail" className="btn-ghost"><Mail size={14} /> Feedback</a>
              <a href="https://github.com/obedelom17/obedgpt" target="_blank" rel="noopener noreferrer" aria-label="Voir le code source sur GitHub" className="btn-ghost"><Github size={14} /> Code source</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// Effacement en deux temps : un premier clic demande confirmation.
function ClearButton({ onConfirm, disabled }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t) }, [armed])
  return (
    <button disabled={disabled} aria-label="Effacer tout l'historique" onClick={() => { if (armed) { onConfirm(); setArmed(false) } else setArmed(true) }}
      className="btn-ghost danger disabled:opacity-40 disabled:cursor-not-allowed" style={armed ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : undefined}>
      {armed ? 'Confirmer : tout effacer' : 'Tout effacer'}
    </button>
  )
}

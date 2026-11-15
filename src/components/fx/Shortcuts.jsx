import { useEffect } from 'react'
import { X } from 'lucide-react'

const ROWS = [
  ['Ctrl K', 'Palette de commandes'],
  ['Ctrl B', 'Afficher ou masquer la barre latérale'],
  ['Ctrl Maj O', 'Nouveau chat'],
  ['Alt 1 à 5', 'Chat, Code, Voix, Atelier, Studio'],
  ['Ctrl /', 'Cette aide'],
  ['/', 'Commandes rapides dans le message'],
  ['Entrée', 'Envoyer'],
  ['Maj Entrée', 'Nouvelle ligne'],
  ['Échap', 'Fermer une fenêtre'],
]

export default function Shortcuts({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const k = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-overlay" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Raccourcis clavier">
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head"><b>Raccourcis clavier</b><button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={16} /></button></div>
        <div className="modal-body">
          {ROWS.map(([k, d]) => <div key={k} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}><span className="text-sm text-ink2">{d}</span><kbd className="fx-kbd">{k}</kbd></div>)}
        </div>
      </div>
    </div>
  )
}

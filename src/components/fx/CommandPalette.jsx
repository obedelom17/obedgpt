import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MessageSquare, Code2, Volume2, Settings as SettingsIcon, Plus, Sun, Moon, Flame, MessagesSquare, CornerDownLeft, PanelLeft, Palette } from 'lucide-react'
import { useApp } from '../../App'
import { useTheme, ACCENTS } from '../../hooks/useTheme.jsx'

// Palette de commandes : Ctrl/Cmd + K.
export default function CommandPalette({ open, onClose }) {
  const { setActiveMode, startNewChat, openConversation, history, tempMode, setTempMode, toggleSidebar } = useApp()
  const { theme, setThemePref, setAccent } = useTheme()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const items = useMemo(() => {
    const base = [
      { id: 'new', group: 'Actions', label: 'Nouveau chat', icon: Plus, run: () => startNewChat() },
      { id: 'temp', group: 'Actions', label: tempMode ? 'Désactiver le mode temporaire' : 'Activer le mode temporaire', icon: Flame, run: () => setTempMode(!tempMode) },
      { id: 'side', group: 'Actions', label: 'Afficher ou masquer la barre latérale', icon: PanelLeft, run: () => toggleSidebar() },
      { id: 'theme', group: 'Apparence', label: theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre', icon: theme === 'dark' ? Sun : Moon, run: () => setThemePref(theme === 'dark' ? 'light' : 'dark') },
      ...ACCENTS.map(a => ({ id: 'acc-' + a.id, group: 'Apparence', label: `Accent ${a.label.toLowerCase()}`, icon: Palette, run: () => setAccent(a.id) })),
      { id: 'chat', group: 'Navigation', label: 'Chat', icon: MessageSquare, run: () => setActiveMode('chat') },
      { id: 'code', group: 'Navigation', label: 'Code', icon: Code2, run: () => setActiveMode('code') },
      { id: 'tts', group: 'Navigation', label: 'Text-to-Speech', icon: Volume2, run: () => setActiveMode('tts') },
      { id: 'settings', group: 'Navigation', label: 'Paramètres', icon: SettingsIcon, run: () => setActiveMode('settings') },
    ]
    const convs = history.slice(0, 30).map(c => ({ id: 'c' + c.id, group: 'Conversations', label: c.title || 'Sans titre', icon: MessagesSquare, run: () => openConversation(c.id) }))
    const all = [...base, ...convs]
    const s = q.trim().toLowerCase()
    return s ? all.filter(i => i.label.toLowerCase().includes(s)) : all.slice(0, 16)
  }, [q, history, theme, tempMode, startNewChat, setActiveMode, openConversation, setThemePref, setAccent, setTempMode, toggleSidebar])

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 40) } }, [open])
  useEffect(() => { setSel(0) }, [q])
  useEffect(() => { listRef.current?.querySelector('[data-sel="true"]')?.scrollIntoView({ block: 'nearest' }) }, [sel])

  const exec = it => { onClose(); setTimeout(() => it.run(), 80) }
  const onKey = e => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && items[sel]) { e.preventDefault(); exec(items[sel]) }
  }

  let lastGroup = null
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="palette-overlay" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Palette de commandes"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <motion.div className="palette" onMouseDown={e => e.stopPropagation()} onKeyDown={onKey}
            initial={{ opacity: 0, y: -14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ type: 'spring', stiffness: 440, damping: 32 }}>
            <div className="flex items-center gap-3 px-4 py-3.5 palette-sep">
              <Search size={17} className="text-ink3 flex-shrink-0" />
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une action, un mode, une conversation" aria-label="Rechercher une commande"
                className="flex-1 bg-transparent outline-none text-ink" style={{ fontSize: 16 }} />
              <kbd className="fx-kbd hidden sm:inline">Esc</kbd>
            </div>
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
              {items.length === 0 && <p className="text-sm text-ink3 px-3 py-8 text-center">Aucun résultat.</p>}
              {items.map((it, i) => {
                const Icon = it.icon
                const header = it.group !== lastGroup ? it.group : null
                lastGroup = it.group
                return (
                  <div key={it.id}>
                    {header && <div className="palette-group">{header}</div>}
                    <button data-sel={i === sel} className="palette-item" onMouseMove={() => sel !== i && setSel(i)} onClick={() => exec(it)}>
                      {i === sel && <motion.span layoutId="palette-sel" className="palette-sel" transition={{ type: 'spring', stiffness: 600, damping: 40 }} />}
                      <Icon size={16} className="relative flex-shrink-0" style={{ color: i === sel ? 'var(--accent)' : 'var(--text-3)' }} />
                      <span className="relative flex-1 truncate">{it.label}</span>
                      {i === sel && <CornerDownLeft size={13} className="relative opacity-50" />}
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

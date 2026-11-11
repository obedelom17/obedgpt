import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, MessageSquare, Eye, Mic, Code2, Volume2, Settings as SettingsIcon, Plus, Sun, Moon, Flame, MessagesSquare, CornerDownLeft } from 'lucide-react'
import { useApp } from '../../App'
import { useTheme } from '../../hooks/useTheme.jsx'

// Palette de commandes façon Linear/Raycast : Ctrl/Cmd + K.
export default function CommandPalette({ open, onClose }) {
  const { setActiveMode, startNewChat, openConversation, history, tempMode, setTempMode } = useApp()
  const { theme, setThemePref } = useTheme()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const items = useMemo(() => {
    const base = [
      { id: 'new', label: 'Nouveau chat', icon: Plus, run: () => startNewChat(), hint: 'Action' },
      { id: 'chat', label: 'Aller au Chat', icon: MessageSquare, run: () => setActiveMode('chat'), hint: 'Mode' },
      { id: 'vision', label: 'Aller à Vision', icon: Eye, run: () => setActiveMode('vision'), hint: 'Mode' },
      { id: 'audio', label: 'Aller à Audio', icon: Mic, run: () => setActiveMode('audio'), hint: 'Mode' },
      { id: 'code', label: 'Aller à Code', icon: Code2, run: () => setActiveMode('code'), hint: 'Mode' },
      { id: 'tts', label: 'Aller à Text-to-Speech', icon: Volume2, run: () => setActiveMode('tts'), hint: 'Mode' },
      { id: 'settings', label: 'Ouvrir les Paramètres', icon: SettingsIcon, run: () => setActiveMode('settings'), hint: 'Mode' },
      { id: 'theme', label: theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre', icon: theme === 'dark' ? Sun : Moon, run: () => setThemePref(theme === 'dark' ? 'light' : 'dark'), hint: 'Thème' },
      { id: 'temp', label: tempMode ? 'Désactiver le mode temporaire' : 'Activer le mode temporaire', icon: Flame, run: () => setTempMode(!tempMode), hint: 'Action' },
    ]
    const convs = history.slice(0, 30).map(c => ({ id: 'c' + c.id, label: c.title || 'Sans titre', icon: MessagesSquare, run: () => openConversation(c.id), hint: 'Conversation' }))
    const all = [...base, ...convs]
    const s = q.trim().toLowerCase()
    return s ? all.filter(i => i.label.toLowerCase().includes(s)) : all.slice(0, 12)
  }, [q, history, theme, tempMode, startNewChat, setActiveMode, openConversation, setThemePref, setTempMode])

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30) } }, [open])
  useEffect(() => { setSel(0) }, [q])
  useEffect(() => { listRef.current?.querySelector('.sel')?.scrollIntoView({ block: 'nearest' }) }, [sel])

  if (!open) return null

  const exec = (it) => { onClose(); setTimeout(() => it.run(), 60) }
  const onKey = e => {
    if (e.key === 'Escape') { onClose() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && items[sel]) { e.preventDefault(); exec(items[sel]) }
  }

  return (
    <div className="palette-overlay" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Palette de commandes">
      <div className="palette" onMouseDown={e => e.stopPropagation()} onKeyDown={onKey}>
        <div className="flex items-center gap-3 px-4 py-3 palette-sep">
          <Search size={16} className="text-stone-400 flex-shrink-0" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une action, un mode, une conversation..."
            aria-label="Rechercher une commande" className="flex-1 bg-transparent outline-none text-sm text-stone-800" style={{ fontSize: 16 }} />
          <kbd className="fx-kbd hidden sm:inline">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <p className="text-xs text-stone-400 px-3 py-6 text-center">Aucun résultat.</p>}
          {items.map((it, i) => {
            const Icon = it.icon
            return (
              <button key={it.id} className={`palette-item ${i === sel ? 'sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => exec(it)}>
                <Icon size={15} className="flex-shrink-0" />
                <span className="flex-1 truncate">{it.label}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-50">{it.hint}</span>
                {i === sel && <CornerDownLeft size={12} className="opacity-60" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

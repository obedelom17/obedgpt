import { useRef } from 'react'
import { MessageSquare, Eye, Mic, Code2, Volume2, Settings as SettingsIcon, Plus, History, Flame, Zap } from 'lucide-react'
import { useApp } from '../../App'

export const NAV_ITEMS = [
  { key: 'chat',     label: 'Chat',           icon: MessageSquare },
  { key: 'vision',   label: 'Vision',         icon: Eye },
  { key: 'audio',    label: 'Audio',          icon: Mic },
  { key: 'code',     label: 'Code',           icon: Code2 },
  { key: 'tts',      label: 'Text-to-Speech', icon: Volume2 },
  { key: 'settings', label: 'Paramètres',     icon: SettingsIcon },
]

const buzz = () => { try { navigator.vibrate?.(8) } catch {} }

// Dock flottant (vertical sur desktop, barre basse sur mobile). Sur desktop,
// les icônes grossissent selon la proximité du curseur (effet « loupe »).
export default function Dock() {
  const { activeMode, setActiveMode, startNewChat, setSidebarOpen, openPalette, tempMode, setTempMode } = useApp()
  const ref = useRef(null)
  const raf = useRef(0)
  const idx = Math.max(0, NAV_ITEMS.findIndex(n => n.key === activeMode))

  const magnify = e => {
    if (e.pointerType !== 'mouse' || window.innerWidth < 768) return
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      ref.current?.querySelectorAll('.dock-btn').forEach(b => {
        const r = b.getBoundingClientRect()
        const d = Math.abs(e.clientY - (r.top + r.height / 2))
        const s = 1 + 0.55 * Math.max(0, 1 - d / 100)
        const ico = b.querySelector('.ico')
        if (ico) ico.style.transform = `scale(${s}) translateX(${(s - 1) * 6}px)`
      })
    })
  }
  const reset = () => { cancelAnimationFrame(raf.current); ref.current?.querySelectorAll('.dock .ico').forEach(i => { i.style.transform = '' }) }

  return (
    <nav ref={ref} className="dock" aria-label="Navigation principale" onPointerMove={magnify} onPointerLeave={reset}>
      <button className="dock-logo" onClick={() => { buzz(); openPalette() }} aria-label="Ouvrir la palette de commandes" data-magnetic><Zap size={20} strokeWidth={2.6} /></button>

      <button className="dock-btn dock-desktop-only" onClick={() => { buzz(); startNewChat() }} aria-label="Nouveau chat">
        <span className="ico"><Plus size={20} /></span><span className="tip">Nouveau chat</span>
      </button>
      <div className="dock-sep" />

      <div className="dock-items" style={{ '--n': NAV_ITEMS.length, '--i': idx }}>
        <div className="dock-indicator" />
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button key={key} className={`dock-btn ${activeMode === key ? 'active' : ''}`} onClick={() => { buzz(); setActiveMode(key) }} aria-label={label} aria-current={activeMode === key ? 'page' : undefined}>
            <span className="ico"><Icon size={20} /></span><span className="tip">{label}</span>
          </button>
        ))}
      </div>

      <div className="dock-sep" />
      <button className="dock-btn dock-extra" onClick={() => { buzz(); setSidebarOpen(true) }} aria-label="Historique des conversations">
        <span className="ico"><History size={20} /></span><span className="tip">Historique</span>
      </button>
      <button className="dock-btn dock-desktop-only" onClick={() => { buzz(); setTempMode(!tempMode) }} aria-label="Mode temporaire" aria-pressed={tempMode}>
        {tempMode && <span className="dock-dot" />}
        <span className="ico"><Flame size={20} /></span><span className="tip">{tempMode ? 'Temporaire : activé' : 'Mode temporaire'}</span>
      </button>
    </nav>
  )
}

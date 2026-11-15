import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Plus, Search } from 'lucide-react'
import { useApp } from '../../App'
import ThemeToggle from '../fx/ThemeToggle'
import LangToggle from '../fx/LangToggle'
import { usePrefs } from '../../lib/prefs'
import { useQuota } from '../../lib/quota'

export default function Header({ mode }) {
  const { setSidebarOpen, startNewChat, busy, openPalette } = useApp()
  const [prefs] = usePrefs()
  const q = useQuota()
  const label = prefs.webSearch || prefs.codeExec ? 'Groq · Compound' : prefs.model === 'auto' ? 'Groq · gpt-oss-120b' : `Groq · ${prefs.model.split('/').pop()}`
  const low = q?.tokLimit && q.tokRemaining / q.tokLimit < 0.15
  return (
    <header className="top-bar">
      <button onClick={() => setSidebarOpen(true)} className="icon-btn md:hidden" aria-label="Ouvrir le menu"><Menu size={18} /></button>
      <div className="overflow-hidden flex-1 min-w-0 flex items-center gap-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1 key={mode} className="truncate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.16 }}>
            {mode}
          </motion.h1>
        </AnimatePresence>
        <span className="model-chip hidden sm:inline-flex" title="Modèle propulsé par Groq">
          <span className={`live-dot ${busy ? 'busy' : ''}`} />
          {busy ? 'Génération…' : label}{!busy && q?.reqRemaining != null && <span className={`font-mono text-[11px] ${low ? 'text-warn' : 'text-ink3'}`}> · {q.reqRemaining} req</span>}
        </span>
      </div>
      <button onClick={openPalette} className="search-btn hidden sm:inline-flex" aria-label="Ouvrir la recherche de commandes">
        <Search size={14} /> Rechercher <kbd className="fx-kbd">Ctrl K</kbd>
      </button>
      <button onClick={openPalette} className="icon-btn sm:hidden" aria-label="Rechercher"><Search size={17} /></button>
      <button onClick={startNewChat} className="icon-btn md:hidden" aria-label="Nouveau chat"><Plus size={18} /></button>
      <LangToggle />
      <ThemeToggle />
      <div className={`busy-line ${busy ? 'on' : ''}`} />
    </header>
  )
}

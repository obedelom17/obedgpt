import { Plus, Menu, Search } from 'lucide-react'
import { useApp } from '../../App'
import ThemeToggle from '../fx/ThemeToggle'

export default function Header({ mode }) {
  const { startNewChat, setSidebarOpen, busy, openPalette } = useApp()

  return (
    <header className="relative h-12 md:h-14 flex items-center gap-3 md:gap-4 px-3 md:px-5 border-b border-orange-500/15 glass-panel flex-shrink-0 z-20">

      <button onClick={() => setSidebarOpen(true)} className="md:hidden btn-ghost p-2 flex-shrink-0" title="Menu" aria-label="Ouvrir le menu">
        <Menu size={18} />
      </button>

      <button onClick={startNewChat} className="md:hidden btn-primary p-2 flex-shrink-0" title="Nouveau chat" aria-label="Nouveau chat">
        <Plus size={16} />
      </button>

      <h1 key={mode} className="title-swap font-display font-semibold text-sm md:text-base text-stone-800 truncate flex-1">
        {mode}
      </h1>

      <button onClick={openPalette} className="btn-ghost hidden sm:inline-flex items-center gap-2 text-xs py-1.5 px-3" aria-label="Ouvrir la palette de commandes">
        <Search size={13} /> Rechercher <kbd className="fx-kbd">Ctrl K</kbd>
      </button>
      <button onClick={openPalette} className="btn-ghost sm:hidden p-2" aria-label="Rechercher"><Search size={16} /></button>

      <ThemeToggle />
      <div className={`busy-line ${busy ? 'on' : ''}`} />
    </header>
  )
}

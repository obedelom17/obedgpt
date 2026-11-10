import { Plus, Search } from 'lucide-react'
import { useApp } from '../../App'
import { useScramble } from '../../hooks/useScramble'
import { NAV_ITEMS } from './Dock'
import ThemeToggle from '../fx/ThemeToggle'

export default function Header({ mode }) {
  const { startNewChat, busy, openPalette, activeMode } = useApp()
  const Icon = NAV_ITEMS.find(n => n.key === activeMode)?.icon
  const title = useScramble(mode || '', { duration: 520 })

  return (
    <header className="top-bar">
      <button onClick={startNewChat} className="md:hidden pill-btn !px-0 w-[38px] justify-center" title="Nouveau chat" aria-label="Nouveau chat"><Plus size={17} /></button>
      <div className={`title-pill ${busy ? 'busy' : ''}`}>
        <span className="dotlive" />
        {Icon && <Icon size={15} className="text-cyan-400" />}
        <h1 className="font-display font-semibold text-[0.85rem]">{title}</h1>
      </div>
      <div className="flex-1" />
      <button onClick={openPalette} className="pill-btn hidden sm:inline-flex" aria-label="Ouvrir la palette de commandes">
        <Search size={14} /> Rechercher <kbd className="fx-kbd">Ctrl K</kbd>
      </button>
      <button onClick={openPalette} className="pill-btn sm:hidden !px-0 w-[38px] justify-center" aria-label="Rechercher"><Search size={16} /></button>
      <ThemeToggle />
      <div className={`busy-line ${busy ? 'on' : ''}`} />
    </header>
  )
}

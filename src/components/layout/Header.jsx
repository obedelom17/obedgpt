import { Menu, Plus, Search } from 'lucide-react'
import { useApp } from '../../App'
import ThemeToggle from '../fx/ThemeToggle'

export default function Header({ mode }) {
  const { setSidebarOpen, startNewChat, busy, openPalette } = useApp()
  return (
    <header className="top-bar">
      <button onClick={() => setSidebarOpen(true)} className="icon-btn md:hidden" aria-label="Ouvrir le menu"><Menu size={18} /></button>
      <h1 className="truncate flex-1">{mode}</h1>
      <button onClick={openPalette} className="search-btn hidden sm:inline-flex" aria-label="Ouvrir la recherche de commandes">
        <Search size={14} /> Rechercher <kbd className="fx-kbd">Ctrl K</kbd>
      </button>
      <button onClick={openPalette} className="icon-btn sm:hidden" aria-label="Rechercher"><Search size={17} /></button>
      <button onClick={startNewChat} className="icon-btn md:hidden" aria-label="Nouveau chat"><Plus size={18} /></button>
      <ThemeToggle />
      <div className={`busy-line ${busy ? 'on' : ''}`} />
    </header>
  )
}

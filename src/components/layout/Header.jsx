import { Plus, Menu } from 'lucide-react'
import { useApp } from '../../App'

export default function Header({ mode }) {
  const { startNewChat, setSidebarOpen } = useApp()

  return (
    <header className="h-12 md:h-14 flex items-center gap-3 md:gap-4 px-3 md:px-5 border-b border-orange-100 bg-white/90 backdrop-blur-xl flex-shrink-0 shadow-sm">

      {/* Menu (modes + historique) — mobile uniquement */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden btn-ghost p-2 flex-shrink-0"
        title="Menu"
      >
        <Menu size={18} />
      </button>

      {/* Bouton Nouveau chat — visible uniquement sur mobile */}
      <button
        onClick={startNewChat}
        className="md:hidden btn-primary p-2 flex-shrink-0"
        title="Nouveau chat"
      >
        <Plus size={16} />
      </button>

      <h1 className="font-display font-semibold text-sm md:text-base text-stone-800 truncate flex-1 md:flex-none">
        {mode}
      </h1>
    </header>
  )
}

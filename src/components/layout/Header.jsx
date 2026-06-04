import { Plus } from 'lucide-react'
import { useApp } from '../../App'

export default function Header({ mode }) {
  const { startNewChat } = useApp()

  return (
    <header className="h-12 md:h-14 flex items-center gap-3 md:gap-4 px-3 md:px-5 border-b border-orange-100 bg-white/90 backdrop-blur-xl flex-shrink-0 shadow-sm">

      {/* Bouton Nouveau chat — visible uniquement sur mobile */}
      <button
        onClick={startNewChat}
        className="md:hidden btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 flex-shrink-0"
      >
        <Plus size={13} /> Nouveau chat
      </button>

      <h1 className="font-display font-semibold text-sm md:text-base text-stone-800 truncate flex-1 md:flex-none">
        {mode}
      </h1>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
          IA active
        </div>
      </div>
    </header>
  )
}

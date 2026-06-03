import { Menu, Flame } from 'lucide-react'
import { useApp } from '../../App'

export default function Header({ mode, sidebarOpen, setSidebarOpen }) {
  const { tempMode } = useApp()

  return (
    <header className="h-12 md:h-14 flex items-center gap-3 md:gap-4 px-3 md:px-5 border-b border-orange-100 bg-white/90 backdrop-blur-xl flex-shrink-0 shadow-sm">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-stone-400 hover:text-orange-500 transition-colors p-1"
      >
        <Menu size={20} />
      </button>
      <h1 className="font-display font-semibold text-sm md:text-base text-stone-800 truncate">{mode}</h1>

      {tempMode && (
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-600">
          <Flame size={12} /> Temporaire
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
          IA active
        </div>
      </div>
    </header>
  )
}

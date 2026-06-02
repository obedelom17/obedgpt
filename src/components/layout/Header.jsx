import { Menu, Sun, Moon, Flame } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.jsx'
import { useApp } from '../../App'

export default function Header({ mode, sidebarOpen, setSidebarOpen }) {
  const { theme, toggleTheme } = useTheme()
  const { tempMode } = useApp()

  return (
    <header className="h-12 md:h-14 flex items-center gap-3 md:gap-4 px-3 md:px-5 border-b border-orange-100 dark:border-orange-900/30 bg-white/90 dark:bg-navy-900/90 backdrop-blur-xl flex-shrink-0 shadow-sm">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-stone-400 dark:text-stone-500 hover:text-orange-500 transition-colors p-1"
      >
        <Menu size={20} />
      </button>
      <h1 className="font-display font-semibold text-sm md:text-base text-stone-800 dark:text-stone-100 truncate">{mode}</h1>

      {tempMode && (
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-xs text-orange-600 dark:text-orange-400">
          <Flame size={12} /> Temporaire
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 dark:text-stone-500 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
          IA active
        </div>
      </div>
    </header>
  )
}

import { Menu } from 'lucide-react'

export default function Header({ mode, sidebarOpen, setSidebarOpen }) {
  return (
    <header className="h-14 flex items-center gap-4 px-5 border-b border-surface-border bg-navy-900/80 backdrop-blur-xl flex-shrink-0">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-slate-500 hover:text-amber-400 transition-colors md:hidden"
      >
        <Menu size={18} />
      </button>
      <h1 className="font-display font-semibold text-base text-slate-100">{mode}</h1>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
          gemini-2.0-flash
        </div>
      </div>
    </header>
  )
}

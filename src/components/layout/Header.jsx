import { Menu } from 'lucide-react'

export default function Header({ mode, sidebarOpen, setSidebarOpen }) {
  return (
    <header className="h-14 flex items-center gap-4 px-5 border-b border-orange-100 bg-white/90 backdrop-blur-xl flex-shrink-0 shadow-sm">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-stone-400 hover:text-orange-500 transition-colors"
      >
        <Menu size={18} />
      </button>
      <h1 className="font-display font-semibold text-base text-stone-800">{mode}</h1>
      <div className="ml-auto flex items-center gap-2">
       
      </div>
    </header>
  )
}

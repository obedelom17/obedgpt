import { Plus } from 'lucide-react'
import { useApp } from '../../App'

export default function Sidebar() {
  const { startNewChat } = useApp()

  return (
    <aside className="hidden md:flex md:flex-col w-[260px] bg-navy-900 border-r border-orange-100 flex-shrink-0 py-4 relative z-10">
      <div className="px-4">
        <button
          onClick={startNewChat}
          className="btn-primary w-full justify-center"
        >
          <Plus size={14} /> Nouveau chat
        </button>
      </div>
    </aside>
  )
}

import { useState } from 'react'
import { MessageSquare, Plus, Clock, Trash2, Menu, Flame, PenLine, Check, X } from 'lucide-react'
import { useApp } from '../../App'

export default function Sidebar({ modes, activeMode, setActiveMode, isOpen, setIsOpen }) {
  const { startNewChat, startTempChat, history, deleteConversation, renameConversation, clearHistory, activeChatId, tempMode, loadChat } = useApp()
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [showOptions, setShowOptions] = useState(false)

  const handleRename = (id) => {
    if (editTitle.trim()) renameConversation(id, editTitle.trim())
    setEditingId(null)
    setEditTitle('')
  }

  const newButtons = (
    <div className="px-3 md:px-4 py-3 md:py-4 space-y-2">
      <button onClick={startNewChat}
        className="btn-primary w-full justify-center">
        <Plus size={14} /> Nouveau chat
      </button>
      <button onClick={startTempChat}
        className="btn-ghost w-full justify-center">
        <Flame size={14} /> Chat temporaire
      </button>
    </div>
  )

  const historyHeader = (
    <div className="flex items-center justify-between mb-2 px-3 md:px-4">
      <span className="text-xs font-semibold text-stone-400">Historique</span>
      <div className="relative">
        <button onClick={() => setShowOptions(!showOptions)} className="text-stone-400 hover:text-orange-500 transition-colors">
          <Menu size={14} />
        </button>
        {showOptions && (
          <div className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-lg py-2 border border-orange-100 z-50 animate-fade-in">
            <button onClick={() => { setShowOptions(false); clearHistory() }}
              className="w-full text-left px-3 py-2 text-xs text-stone-600 hover:text-red-500 hover:bg-red-50 transition-all">
              <Trash2 size={14} /> Supprimer tout
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const historyList = (
    <div className="space-y-1 px-3 md:px-4">
      {history.map((conv) => (
        <div
          key={conv.id}
          onClick={() => loadChat(conv.id)}
          className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all
            ${activeChatId === conv.id && !tempMode
              ? 'bg-orange-50 border border-orange-200 text-orange-700'
              : 'text-stone-500 hover:bg-stone-50'}`}>
          <MessageSquare size={14} />
          {editingId === conv.id && (
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={() => handleRename(conv.id)}
              onKeyDown={e => e.key === 'Enter' && handleRename(conv.id)}
              className="flex-1 bg-white border border-orange-200 rounded px-1 py-0.5 text-xs outline-none min-w-0"
              onClick={e => e.stopPropagation()} />
          )}
          {editingId !== conv.id && (
            <span className="truncate">{conv.title || 'Sans titre'}</span>
          )}
          <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100">
            <button onClick={(e) => { e.stopPropagation(); setEditingId(conv.id); setEditTitle(conv.title || '') }}
              className="text-stone-400 hover:text-orange-500 transition-colors"
              title="Renommer"
            ><PenLine size={12} /></button>
            <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
              className="text-stone-400 hover:text-red-500 transition-colors"
              title="Supprimer"
            ><X size={12} /></button>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex md:flex-col w-64 md:w-[260px] bg-navy-900 border-r border-orange-100 flex-shrink-0 overflow-y-auto py-3 relative z-10`}>
        {newButtons}
        <div className="flex-1 overflow-y-auto">
          {historyHeader}
          {history.length === 0 && (
            <div className="text-xs text-stone-400 text-center py-8">Aucunes conversations</div>
          )}
          {historyList}
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:hidden fixed inset-0 z-30`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
        <div className="absolute left-0 top-0 bottom-0 w-64 bg-navy-900 border-r border-orange-100 overflow-y-auto animate-slide-left flex flex-col">
          {newButtons}
          <div className="flex-1 overflow-y-auto">
            {historyHeader}
            {history.length === 0 && (
              <div className="text-xs text-stone-400 text-center py-8">Aucunes conversations</div>
            )}
            {historyList}
          </div>
        </div>
      </div>
    </>
  )
}

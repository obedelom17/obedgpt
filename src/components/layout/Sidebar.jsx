import { useState } from 'react'
import { MessageSquare, Eye, Mic, Code2, Volume2, Settings, ChevronLeft, ChevronRight, Zap, Plus, MessageCircle, Trash2, Edit2, Clock, Flame, X } from 'lucide-react'
import { useApp } from '../../App'

const ICONS = {
  chat: MessageSquare, vision: Eye, audio: Mic,
  code: Code2, tts: Volume2, settings: Settings,
}

const GROUPS = [
  { label: 'Conversation', keys: ['chat', 'code'] },
  { label: 'Multimodal',   keys: ['vision', 'audio'] },
  { label: 'Outils',       keys: ['tts'] },
  { label: 'Système',      keys: ['settings'] },
]

export default function Sidebar({ modes, activeMode, setActiveMode, isOpen, setIsOpen }) {
  const { history, startNewChat, startTempChat, loadChat, deleteConversation, renameConversation, activeChatId, tempMode } = useApp()
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const handleRename = (id) => {
    if (editTitle.trim()) renameConversation(id, editTitle.trim())
    setEditingId(null)
    setEditTitle('')
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <aside className={`fixed md:relative z-30 flex flex-col border-r border-orange-100 dark:border-orange-900/30 bg-white dark:bg-navy-900 shadow-xl md:shadow-sm
        transition-all duration-300 ease-in-out h-full
        ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 w-0 md:w-[60px] overflow-hidden'}`}
    >
      {/* Mobile close button */}
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute top-3 right-3 md:hidden w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 z-40"
      >
        <X size={18} />
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-orange-100 dark:border-orange-900/30 ${!isOpen && 'md:justify-center md:px-0'}`}>
        <div className="w-8 h-8 rounded-xl amber-gradient flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <Zap size={16} className="text-white" strokeWidth={2.5} />
        </div>
        {isOpen && (
          <div className="min-w-0">
            <div className="font-display font-bold text-base text-gradient leading-none">ObedGPT</div>
            <div className="text-[10px] text-stone-400 dark:text-stone-500 font-mono mt-0.5 truncate">intelligence artificielle</div>
          </div>
        )}
      </div>

      {/* New Chat Buttons */}
      {isOpen && (
        <div className="px-3 py-3 space-y-2 border-b border-orange-100 dark:border-orange-900/30">
          <button onClick={startNewChat}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 text-sm font-medium hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all active:scale-95">
            <Plus size={16} /> Nouveau chat
          </button>
          <button onClick={startTempChat}
            className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-95
              ${tempMode && activeMode === 'chat'
                ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
                : 'bg-white dark:bg-navy-800 border-orange-200 dark:border-orange-900/40 text-stone-600 dark:text-stone-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}>
            <Flame size={16} /> Chat temporaire
          </button>
        </div>
      )}
      {!isOpen && (
        <div className="px-2 py-3 space-y-2 border-b border-orange-100 dark:border-orange-900/30 hidden md:flex flex-col items-center">
          <button onClick={startNewChat} className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all active:scale-95" title="Nouveau chat">
            <Plus size={16} />
          </button>
          <button onClick={startTempChat} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${tempMode && activeMode === 'chat' ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300' : 'bg-white dark:bg-navy-800 border-orange-200 dark:border-orange-900/40 text-stone-600 dark:text-stone-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`} title="Chat temporaire">
            <Flame size={16} />
          </button>
        </div>
      )}

      {/* Chat History */}
      {isOpen && history.length > 0 && activeMode === 'chat' && (
        <div className="px-3 py-2 border-b border-orange-100 dark:border-orange-900/30">
          <div className="px-3 mb-1.5 text-[10px] font-display font-semibold tracking-widest text-stone-300 dark:text-stone-600 uppercase flex items-center gap-1">
            <Clock size={10} /> Historique
          </div>
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {history.map(conv => (
              <div key={conv.id}
                onClick={() => loadChat(conv.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all
                  ${activeChatId === conv.id && !tempMode
                    ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300'
                    : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50'}`}>
                <MessageCircle size={14} className="flex-shrink-0" />
                {editingId === conv.id ? (
                  <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => handleRename(conv.id)} onKeyDown={e => e.key === 'Enter' && handleRename(conv.id)}
                    className="flex-1 bg-white dark:bg-navy-800 border border-orange-200 dark:border-orange-800 rounded px-1 py-0.5 text-xs outline-none min-w-0"
                    onClick={e => e.stopPropagation()} />
                ) : (
                  <span className="flex-1 truncate min-w-0">{conv.title || 'Sans titre'}</span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); setEditingId(conv.id); setEditTitle(conv.title || 'Sans titre') }}
                    className="p-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 text-stone-400 dark:text-stone-500">
                    <Edit2 size={10} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteConversation(conv.id) }}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-stone-400 dark:text-stone-500 hover:text-red-500">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {GROUPS.map(group => (
          <div key={group.label}>
            {isOpen && (
              <div className="px-3 mb-1.5 text-[10px] font-display font-semibold tracking-widest text-stone-300 dark:text-stone-600 uppercase">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.keys.map(key => {
                const Icon = ICONS[key]
                const isActive = activeMode === key
                return (
                  <button key={key} onClick={() => setActiveMode(key)}
                    title={!isOpen ? modes[key]?.label : undefined}
                    className={`mode-btn ${isActive ? 'active' : ''} ${!isOpen ? 'md:justify-center md:px-0 md:w-10 md:h-10 md:mx-auto' : ''}`}
                   >
                    <Icon size={16} className="flex-shrink-0" />
                    {isOpen && <span className="truncate">{modes[key]?.label}</span>}
                    {isOpen && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Toggle - desktop only */}
      <button onClick={() => setIsOpen(!isOpen)}
        className="hidden md:flex absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-white dark:bg-navy-800 border border-orange-200 dark:border-orange-800
                   items-center justify-center text-stone-400 dark:text-stone-500 hover:text-orange-500
                   hover:border-orange-400 transition-all duration-200 z-30 shadow-sm"
      >
        {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </aside>
  )
}

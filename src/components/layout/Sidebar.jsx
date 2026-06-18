import { useState } from 'react'
import {
  Plus, MessageSquare, Eye, Mic, Code2, Volume2, Settings as SettingsIcon,
  Trash2, Pencil, Flame, X, MessagesSquare
} from 'lucide-react'
import { useApp } from '../../App'

const NAV_ITEMS = [
  { key: 'chat',     label: 'Chat',            icon: MessageSquare },
  { key: 'vision',   label: 'Vision',          icon: Eye },
  { key: 'audio',    label: 'Audio',           icon: Mic },
  { key: 'code',     label: 'Code',            icon: Code2 },
  { key: 'tts',      label: 'Text-to-Speech',  icon: Volume2 },
  { key: 'settings', label: 'Paramètres',      icon: SettingsIcon },
]

function ConversationItem({ conv, active, onOpen, onRename, onDelete }) {
  return (
    <div
      onClick={onOpen}
      className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
        active ? 'bg-orange-50 text-orange-600' : 'text-stone-500 hover:bg-orange-50/60 hover:text-stone-700'
      }`}
    >
      <MessagesSquare size={13} className="flex-shrink-0 opacity-70" />
      <span className="flex-1 min-w-0 truncate">{conv.title || 'Sans titre'}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRename() }}
        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-orange-500 flex-shrink-0 transition-opacity"
        title="Renommer"
        aria-label={`Renommer "${conv.title || 'Sans titre'}"`}
      >
        <Pencil size={12} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 flex-shrink-0 transition-opacity"
        title="Supprimer"
        aria-label={`Supprimer "${conv.title || 'Sans titre'}"`}
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

function SidebarContent() {
  const {
    activeMode, setActiveMode, activeChatId, startNewChat, openConversation,
    tempMode, setTempMode, history, deleteConversation, renameConversation,
  } = useApp()

  const handleRename = (id, currentTitle) => {
    const next = window.prompt('Nouveau titre de la conversation :', currentTitle || '')
    if (next && next.trim()) renameConversation(id, next.trim().slice(0, 80))
  }

  const handleDelete = (id) => {
    if (window.confirm('Supprimer définitivement cette conversation ?')) deleteConversation(id)
  }

  return (
    <>
      <div className="px-3">
        <button onClick={startNewChat} className="btn-primary w-full justify-center">
          <Plus size={14} /> Nouveau chat
        </button>
      </div>

      <nav className="px-3 mt-3 space-y-0.5">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveMode(key)}
            className={`mode-btn ${activeMode === key ? 'active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <button
        onClick={() => setTempMode(!tempMode)}
        className={`mx-3 mt-3 mode-btn ${tempMode ? 'active' : ''}`}
        title="Les conversations en mode temporaire ne sont pas sauvegardées"
      >
        <Flame size={16} className={tempMode ? 'text-orange-500' : ''} />
        Mode temporaire
      </button>

      <div className="px-3 mt-4 mb-2 flex items-center justify-between">
        <span className="text-[11px] font-display font-semibold uppercase tracking-wider text-stone-400">
          Historique
        </span>
        {history.length > 0 && (
          <span className="text-[10px] text-stone-400 font-mono">{history.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-2">
        {history.length === 0 && (
          <p className="text-xs text-stone-400 px-1 py-2">Aucune conversation sauvegardée.</p>
        )}
        {history.map(conv => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            active={activeMode === 'chat' && conv.id === activeChatId}
            onOpen={() => openConversation(conv.id)}
            onRename={() => handleRename(conv.id, conv.title)}
            onDelete={() => handleDelete(conv.id)}
          />
        ))}
      </div>
    </>
  )
}

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-[260px] bg-navy-900 border-r border-orange-100 flex-shrink-0 py-4 relative z-10">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="sidebar-overlay md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-navy-900 border-r border-orange-100 z-20 flex flex-col py-4 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-3 mb-2 flex items-center justify-between">
          <span className="font-display font-bold text-gradient text-sm">ObedGPT</span>
          <button onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu" className="text-stone-400 hover:text-stone-600">
            <X size={18} />
          </button>
        </div>
        <SidebarContent />
      </aside>
    </>
  )
}

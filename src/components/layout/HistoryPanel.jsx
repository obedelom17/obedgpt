import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Pencil, Flame, X, MessagesSquare, Search, Star } from 'lucide-react'
import { useApp } from '../../App'

function ConversationItem({ conv, active, onOpen, onRename, onDelete, onTogglePin, index }) {
  const title = conv.title || 'Sans titre'
  return (
    <div onClick={onOpen} style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
      className={`conv-item list-in group flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm ${active ? 'active' : 'text-stone-500'}`}>
      <MessagesSquare size={14} className="flex-shrink-0 opacity-70" />
      <span className="flex-1 min-w-0 truncate">{title}</span>
      <button onClick={e => { e.stopPropagation(); onTogglePin() }} aria-label={conv.pinned ? `Désépingler "${title}"` : `Épingler "${title}"`} aria-pressed={!!conv.pinned}
        className={`flex-shrink-0 transition-opacity ${conv.pinned ? 'text-cyan-400 opacity-100' : 'text-stone-400 opacity-0 group-hover:opacity-100 hover:text-cyan-400'}`}>
        <Star size={13} fill={conv.pinned ? 'currentColor' : 'none'} />
      </button>
      <button onClick={e => { e.stopPropagation(); onRename() }} aria-label={`Renommer "${title}"`} className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-violet-400 flex-shrink-0 transition-opacity"><Pencil size={13} /></button>
      <button onClick={e => { e.stopPropagation(); onDelete() }} aria-label={`Supprimer "${title}"`} className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 flex-shrink-0 transition-opacity"><Trash2 size={13} /></button>
    </div>
  )
}

// Panneau d'historique coulissant (remplace l'ancienne barre latérale fixe).
export default function HistoryPanel() {
  const { sidebarOpen, setSidebarOpen, activeMode, activeChatId, startNewChat, openConversation, tempMode, setTempMode, history, deleteConversation, renameConversation, togglePin } = useApp()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = e => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen, setSidebarOpen])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q ? history.filter(c => (c.title || '').toLowerCase().includes(q) || (c.messages || []).some(m => (m.content || '').toLowerCase().includes(q))) : history
    return [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  }, [history, search])

  const handleRename = (id, t) => { const n = window.prompt('Nouveau titre de la conversation :', t || ''); if (n && n.trim()) renameConversation(id, n.trim().slice(0, 80)) }
  const handleDelete = id => { if (window.confirm('Supprimer définitivement cette conversation ?')) deleteConversation(id) }

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`history-panel ${sidebarOpen ? 'open' : ''}`} aria-hidden={!sidebarOpen} aria-label="Historique">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-gradient">Historique</h2>
          <button onClick={() => setSidebarOpen(false)} aria-label="Fermer l'historique" className="btn-ghost p-2"><X size={18} /></button>
        </div>
        <button onClick={startNewChat} className="btn-primary w-full justify-center mb-2"><Plus size={15} /> Nouveau chat</button>
        <button onClick={() => setTempMode(!tempMode)} aria-pressed={tempMode}
          className={`btn-ghost w-full justify-start mb-3 ${tempMode ? '!text-fuchsia-400 !border-fuchsia-400/40 !bg-fuchsia-500/10' : ''}`} title="Les conversations en mode temporaire ne sont pas sauvegardées">
          <Flame size={15} /> Mode temporaire {tempMode && <span className="ml-auto text-[10px] uppercase tracking-wider">actif</span>}
        </button>
        {history.length > 0 && (
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." aria-label="Rechercher dans l'historique" className="input-field !pl-9 text-sm" />
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
          {history.length === 0 && <p className="text-sm text-stone-400 py-3">Aucune conversation sauvegardée.</p>}
          {history.length > 0 && visible.length === 0 && <p className="text-sm text-stone-400 py-3">Aucun résultat pour "{search}".</p>}
          {sidebarOpen && visible.map((conv, i) => (
            <ConversationItem key={conv.id} conv={conv} index={i} active={activeMode === 'chat' && conv.id === activeChatId}
              onOpen={() => openConversation(conv.id)} onRename={() => handleRename(conv.id, conv.title)} onDelete={() => handleDelete(conv.id)} onTogglePin={() => togglePin(conv.id)} />
          ))}
        </div>
      </aside>
    </>
  )
}

import { useState, useMemo, useEffect } from 'react'
import { Plus, MessageSquare, Eye, Mic, Code2, Volume2, Settings as SettingsIcon, Trash2, Pencil, Star, Search, X } from 'lucide-react'
import { useApp } from '../../App'
import Logo from '../Logo'

const NAV_ITEMS = [
  { key: 'chat',   label: 'Chat',           icon: MessageSquare },
  { key: 'vision', label: 'Vision',         icon: Eye },
  { key: 'audio',  label: 'Audio',          icon: Mic },
  { key: 'code',   label: 'Code',           icon: Code2 },
  { key: 'tts',    label: 'Text-to-Speech', icon: Volume2 },
]

function groupConversations(list) {
  const now = new Date(); const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const groups = { pinned: [], today: [], week: [], older: [] }
  for (const c of list) {
    if (c.pinned) { groups.pinned.push(c); continue }
    const t = new Date(c.updatedAt || c.createdAt || 0).getTime()
    if (t >= startToday) groups.today.push(c)
    else if (t >= startToday - 6 * 864e5) groups.week.push(c)
    else groups.older.push(c)
  }
  return [['Épinglées', groups.pinned], ["Aujourd'hui", groups.today], ['7 derniers jours', groups.week], ['Plus ancien', groups.older]].filter(([, l]) => l.length)
}

function ConversationItem({ conv, active, onOpen, onRename, onDelete, onTogglePin }) {
  const title = conv.title || 'Sans titre'
  const act = 'md:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex-shrink-0'
  return (
    <div onClick={onOpen} className={`conv-item group ${active ? 'active' : ''}`}>
      <span className="flex-1 min-w-0 truncate">{title}</span>
      <button onClick={e => { e.stopPropagation(); onTogglePin() }} aria-label={conv.pinned ? `Désépingler "${title}"` : `Épingler "${title}"`} aria-pressed={!!conv.pinned}
        className={`${conv.pinned ? 'text-orange-500' : `text-stone-400 hover:text-stone-600 ${act}`} flex-shrink-0`}><Star size={13} fill={conv.pinned ? 'currentColor' : 'none'} /></button>
      <button onClick={e => { e.stopPropagation(); onRename() }} aria-label={`Renommer "${title}"`} className={`text-stone-400 hover:text-stone-600 ${act}`}><Pencil size={13} /></button>
      <button onClick={e => { e.stopPropagation(); onDelete() }} aria-label={`Supprimer "${title}"`} className={`text-stone-400 hover:text-red-500 ${act}`}><Trash2 size={13} /></button>
    </div>
  )
}

export default function Sidebar() {
  const { activeMode, setActiveMode, activeChatId, startNewChat, openConversation, tempMode, setTempMode, history, deleteConversation, renameConversation, togglePin, sidebarOpen, setSidebarOpen } = useApp()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = e => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen, setSidebarOpen])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q ? history.filter(c => (c.title || '').toLowerCase().includes(q) || (c.messages || []).some(m => (m.content || '').toLowerCase().includes(q))) : history
    return groupConversations(filtered)
  }, [history, search])

  const handleRename = (id, t) => { const n = window.prompt('Nouveau titre de la conversation :', t || ''); if (n && n.trim()) renameConversation(id, n.trim().slice(0, 80)) }
  const handleDelete = id => { if (window.confirm('Supprimer définitivement cette conversation ?')) deleteConversation(id) }

  return (
    <>
      {sidebarOpen && <div className="scrim md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Navigation">
        <div className="brand">
          <Logo size={30} />
          <span className="brand-name flex-1">ObedGPT</span>
          <button onClick={() => setSidebarOpen(false)} className="icon-btn md:hidden" aria-label="Fermer le menu"><X size={18} /></button>
        </div>

        <div className="px-3">
          <button onClick={startNewChat} className="btn-primary w-full"><Plus size={16} /> Nouveau chat</button>
        </div>

        <nav className="px-3 mt-3 space-y-0.5" aria-label="Modes">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveMode(key)} className={`nav-item ${activeMode === key ? 'active' : ''}`} aria-current={activeMode === key ? 'page' : undefined}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2">
          <div className="section-label flex items-center justify-between"><span>Historique</span>{history.length > 0 && <span className="font-mono normal-case tracking-normal">{history.length}</span>}</div>
          {history.length > 4 && (
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher" aria-label="Rechercher dans l'historique" className="input-field !pl-8 !py-1.5 text-sm" />
            </div>
          )}
          {history.length === 0 && <p className="text-xs text-stone-400 px-2.5 py-1">Aucune conversation sauvegardée.</p>}
          {history.length > 0 && groups.length === 0 && <p className="text-xs text-stone-400 px-2.5 py-1">Aucun résultat pour "{search}".</p>}
          {groups.map(([label, list]) => (
            <div key={label} className="mb-2">
              <div className="px-2.5 py-1 text-[11px] text-stone-400">{label}</div>
              <div className="space-y-0.5">
                {list.map(conv => (
                  <ConversationItem key={conv.id} conv={conv} active={activeMode === 'chat' && conv.id === activeChatId}
                    onOpen={() => openConversation(conv.id)} onRename={() => handleRename(conv.id, conv.title)} onDelete={() => handleDelete(conv.id)} onTogglePin={() => togglePin(conv.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t space-y-0.5" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => setTempMode(!tempMode)} role="switch" aria-checked={tempMode} className="nav-item justify-between" title="Les conversations en mode temporaire ne sont pas sauvegardées">
            <span>Mode temporaire</span>
            <span className="relative inline-block w-8 h-[18px] rounded-full transition-colors" style={{ background: tempMode ? 'var(--accent)' : 'var(--border-strong)' }}>
              <span className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform" style={{ transform: tempMode ? 'translateX(14px)' : 'none' }} />
            </span>
          </button>
          <button onClick={() => setActiveMode('settings')} className={`nav-item ${activeMode === 'settings' ? 'active' : ''}`}><SettingsIcon size={17} /> Paramètres</button>
        </div>
      </aside>
    </>
  )
}

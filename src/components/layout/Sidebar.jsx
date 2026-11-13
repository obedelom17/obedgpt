import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MessageSquare, Code2, Volume2, Settings as SettingsIcon, Trash2, Pencil, Star, Search, X, PanelLeftClose, PanelLeftOpen, Flame, Check } from 'lucide-react'
import { useApp } from '../../App'
import { useMedia } from '../../hooks/useMedia'
import Logo from '../Logo'

const NAV_ITEMS = [
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'code', label: 'Code', icon: Code2 },
  { key: 'tts',  label: 'Text-to-Speech', icon: Volume2 },
]
const spring = { type: 'spring', stiffness: 380, damping: 34 }

function groupConversations(list) {
  const now = new Date(); const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const g = { pinned: [], today: [], week: [], older: [] }
  for (const c of list) {
    if (c.pinned) { g.pinned.push(c); continue }
    const t = new Date(c.updatedAt || c.createdAt || 0).getTime()
    if (t >= startToday) g.today.push(c)
    else if (t >= startToday - 6 * 864e5) g.week.push(c)
    else g.older.push(c)
  }
  return [['Épinglées', g.pinned], ["Aujourd'hui", g.today], ['7 derniers jours', g.week], ['Plus ancien', g.older]].filter(([, l]) => l.length)
}

function NavButton({ id, label, icon: Icon, active, collapsed, onClick }) {
  return (
    <button onClick={onClick} className={`nav-item tooltip-host ${active ? 'active' : ''} ${collapsed ? '!justify-center !px-0' : ''}`} aria-current={active ? 'page' : undefined} aria-label={label}>
      {active && <motion.span layoutId={`nav-pill-${id || 'main'}`} className="nav-pill" transition={spring} />}
      <span className="ico">{Icon && <Icon size={18} />}</span>
      {!collapsed && <span className="nav-label">{label}</span>}
      {collapsed && <span className="tooltip">{label}</span>}
    </button>
  )
}

// Renommage en ligne (Entrée valide, Échap annule) et suppression en deux
// temps (« Supprimer ? » + confirmation) : plus de fenêtres natives prompt/confirm.
function ConversationItem({ conv, active, onOpen, onRename, onDelete, onTogglePin }) {
  const title = conv.title || 'Sans titre'
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(title)
  const [confirm, setConfirm] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const act = 'md:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex-shrink-0'

  const commit = () => { const n = val.trim(); if (n && n !== title) onRename(n.slice(0, 80)); setEditing(false) }
  const askDelete = e => { e.stopPropagation(); setConfirm(true); clearTimeout(timer.current); timer.current = setTimeout(() => setConfirm(false), 3000) }

  return (
    <motion.div layout="position" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, height: 0 }} transition={{ ...spring, opacity: { duration: 0.2 } }}
      onClick={editing ? undefined : onOpen} className={`conv-item group ${active ? 'active' : ''}`}>
      {editing ? (
        <input autoFocus value={val} onChange={e => setVal(e.target.value)} onBlur={commit} onClick={e => e.stopPropagation()}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(title); setEditing(false) } }} className="conv-edit" aria-label="Nouveau titre" />
      ) : confirm ? (
        <>
          <span className="flex-1 min-w-0 truncate text-danger text-[13px]">Supprimer ?</span>
          <button onClick={e => { e.stopPropagation(); onDelete() }} aria-label="Confirmer la suppression" className="text-danger"><Check size={15} /></button>
          <button onClick={e => { e.stopPropagation(); setConfirm(false) }} aria-label="Annuler" className="text-ink3 hover:text-ink"><X size={15} /></button>
        </>
      ) : (
        <>
          <span className="flex-1 min-w-0 truncate">{title}</span>
          <button onClick={e => { e.stopPropagation(); onTogglePin() }} aria-label={conv.pinned ? `Désépingler "${title}"` : `Épingler "${title}"`} aria-pressed={!!conv.pinned}
            className={`${conv.pinned ? 'text-accent' : `text-ink3 hover:text-ink ${act}`} flex-shrink-0`}><Star size={13} fill={conv.pinned ? 'currentColor' : 'none'} /></button>
          <button onClick={e => { e.stopPropagation(); setVal(title); setEditing(true) }} aria-label={`Renommer "${title}"`} className={`text-ink3 hover:text-ink ${act}`}><Pencil size={13} /></button>
          <button onClick={askDelete} aria-label={`Supprimer "${title}"`} className={`text-ink3 hover:text-danger ${act}`}><Trash2 size={13} /></button>
        </>
      )}
    </motion.div>
  )
}

export default function Sidebar() {
  const { activeMode, setActiveMode, activeChatId, startNewChat, openConversation, tempMode, setTempMode, history, deleteConversation, renameConversation, togglePin, sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleSidebar } = useApp()
  const isMobile = useMedia('(max-width: 767px)')
  const collapsed = sidebarCollapsed && !isMobile
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

  return (
    <>
      <AnimatePresence>
        {isMobile && sidebarOpen && <motion.div key="scrim" className="scrim" onClick={() => setSidebarOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
      </AnimatePresence>
      <motion.aside className="sidebar" aria-label="Navigation" initial={false}
        animate={isMobile ? { x: sidebarOpen ? 0 : '-105%' } : { x: 0, width: collapsed ? 76 : 276 }} transition={{ type: 'spring', stiffness: 320, damping: 36 }}
        drag={isMobile ? 'x' : false} dragConstraints={{ left: -320, right: 0 }} dragElastic={{ left: 0.2, right: 0 }} onDragEnd={(_, i) => { if (i.offset.x < -70 || i.velocity.x < -400) setSidebarOpen(false) }}>

        <div className={`brand ${collapsed ? '!justify-center !px-0' : ''}`}>
          <Logo size={34} tile />
          {!collapsed && <span className="brand-name flex-1">ObedGPT</span>}
          {isMobile && <button onClick={() => setSidebarOpen(false)} className="icon-btn" aria-label="Fermer le menu"><X size={18} /></button>}
        </div>

        <div className="px-3">
          {collapsed
            ? <button onClick={startNewChat} className="btn-primary w-full !px-0 tooltip-host" aria-label="Nouveau chat"><Plus size={18} /><span className="tooltip">Nouveau chat</span></button>
            : <button onClick={startNewChat} className="btn-primary w-full"><Plus size={16} /> Nouveau chat</button>}
        </div>

        <nav className="px-3 mt-3 space-y-0.5" aria-label="Modes">
          {NAV_ITEMS.map(({ key, label, icon }) => (
            <NavButton key={key} id="main" label={label} icon={icon} collapsed={collapsed} active={activeMode === key} onClick={() => setActiveMode(key)} />
          ))}
        </nav>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-2">
          {!collapsed && (
            <>
              <div className="section-label flex items-center justify-between"><span>Historique</span>{history.length > 0 && <span className="font-mono">{history.length}</span>}</div>
              {history.length > 4 && (
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher" aria-label="Rechercher dans l'historique" className="input-field !pl-8 !py-1.5 text-sm" />
                </div>
              )}
              {history.length === 0 && <p className="text-xs text-ink3 px-3 py-1">Aucune conversation sauvegardée.</p>}
              {history.length > 0 && groups.length === 0 && <p className="text-xs text-ink3 px-3 py-1">Aucun résultat pour "{search}".</p>}
              <AnimatePresence initial={false}>
                {groups.map(([label, list]) => (
                  <motion.div key={label} layout="position" className="mb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="px-3 py-1 text-[11.5px] text-ink3">{label}</div>
                    <div className="space-y-0.5">
                      <AnimatePresence initial={false}>
                        {list.map(conv => (
                          <ConversationItem key={conv.id} conv={conv} active={activeMode === 'chat' && conv.id === activeChatId}
                            onOpen={() => openConversation(conv.id)} onRename={t => renameConversation(conv.id, t)} onDelete={() => deleteConversation(conv.id)} onTogglePin={() => togglePin(conv.id)} />
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}
        </div>

        <div className="p-3 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
          {collapsed ? (
            <NavButton id="temp" label={tempMode ? 'Temporaire : activé' : 'Mode temporaire'} icon={Flame} collapsed onClick={() => setTempMode(!tempMode)} active={tempMode} />
          ) : (
            <button onClick={() => setTempMode(!tempMode)} role="switch" aria-checked={tempMode} className="nav-item justify-between" title="Les conversations en mode temporaire ne sont pas sauvegardées">
              <span className="relative flex items-center gap-3"><span className="ico"><Flame size={18} /></span>Mode temporaire</span>
              <span className="relative inline-block w-9 h-5 rounded-full transition-colors" style={{ background: tempMode ? 'var(--accent)' : 'var(--border-strong)' }}>
                <motion.span className="absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow" animate={{ left: tempMode ? 19 : 3 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              </span>
            </button>
          )}
          <NavButton id="settings" label="Paramètres" icon={SettingsIcon} collapsed={collapsed} active={activeMode === 'settings'} onClick={() => setActiveMode('settings')} />
          {!isMobile && (
            <button onClick={toggleSidebar} className={`nav-item tooltip-host ${collapsed ? '!justify-center !px-0' : ''}`} aria-label={collapsed ? 'Déployer la barre latérale' : 'Réduire la barre latérale'}>
              <span className="ico">{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</span>
              {!collapsed && <><span className="nav-label flex-1">Réduire</span><kbd className="fx-kbd relative">Ctrl B</kbd></>}
              {collapsed && <span className="tooltip">Déployer</span>}
            </button>
          )}
        </div>
      </motion.aside>
    </>
  )
}

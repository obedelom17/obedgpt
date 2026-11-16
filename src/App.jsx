import { useState, useEffect, useCallback, useRef, lazy, Suspense, createContext, useContext } from 'react'
import { ThemeProvider } from './hooks/useTheme.jsx'
import { useChatHistory } from './hooks/useChatHistory'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import ChatMode from './components/modes/ChatMode'
import { LoadingDots } from './components/ui'
import { MotionConfig, AnimatePresence, motion } from 'framer-motion'
import CommandPalette from './components/fx/CommandPalette'
import Shortcuts from './components/fx/Shortcuts'
import Onboarding from './components/fx/Onboarding'
import InstallPrompt from './components/fx/InstallPrompt'
import Gallery from './components/chat/Gallery'
import { ToastProvider } from './components/fx/Toast'
import SharedView from './components/SharedView'
import { useLang } from './i18n'
import { decodeShare, hasShareLink, resolveShareCode } from './lib/share'

// Chat est le mode par défaut donc chargé immédiatement. Les autres modes
// sont chargés à la demande : sur mobile/connexion lente, ça évite de
// télécharger tout le JS (code, tts, settings) d'un coup
// alors qu'on n'utilisera peut-être que le chat.
const CodeMode   = lazy(() => import('./components/modes/CodeMode'))
const VoiceMode  = lazy(() => import('./components/modes/VoiceMode'))
const AtelierMode = lazy(() => import('./components/modes/AtelierMode'))
const StudioMode = lazy(() => import('./components/modes/StudioMode'))
const Settings   = lazy(() => import('./components/Settings'))

const MODES = {
  chat:     { label: 'Chat',            component: ChatMode },
  code:     { label: 'Code',            component: CodeMode },
  tts:      { label: 'Voix',            component: VoiceMode },
  atelier:  { label: 'Atelier',         component: AtelierMode },
  studio:   { label: 'Studio Groq',     component: StudioMode },
  settings: { label: 'Paramètres',      component: Settings },
}

export const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}

export default function App() {
  const [lang] = useLang()
  // Lien de partage (#s=...) : la conversation s'ouvre en lecture seule.
  const [shared, setShared] = useState(() => (hasShareLink() ? { state: 'loading' } : null))
  useEffect(() => {
    const load = () => {
      if (!hasShareLink()) return setShared(null)
      setShared({ state: 'loading' })
      resolveShareCode().then(decodeShare).then(d => setShared({ state: 'ok', data: d }))
        .catch(e => setShared({ state: 'error', error: e.message && !/atob|JSON|decode/i.test(e.message) ? e.message : 'Le lien est invalide ou a été tronqué par la messagerie qui l\'a transmis.' }))
    }
    load(); window.addEventListener('hashchange', load)
    return () => window.removeEventListener('hashchange', load)
  }, [])
  const closeShared = () => { history.replaceState(null, '', '/' + location.search); setShared(null) }
  // Les raccourcis PWA (manifest.json) pointent vers /?mode=code etc. :
  // on lit ce paramètre au démarrage pour ouvrir directement le bon mode.
  const initialMode = (() => {
    const m = new URLSearchParams(window.location.search).get('mode')
    return m && MODES[m] ? m : 'chat'
  })()
  const [activeMode, setActiveMode] = useState(initialMode)
  const historyManager = useChatHistory()
  // On initialise tout de suite un id pour que la première conversation
  // (avant tout clic sur "Nouveau chat") soit elle aussi sauvegardée.
  const [activeChatId, setActiveChatId] = useState(() => historyManager.createNewId())
  const [tempMode, setTempMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => { const v = localStorage.getItem('obedgpt-sidebar-collapsed'); return v === null ? (window.innerWidth >= 768 && window.innerWidth < 1100) : v === '1' })
  const toggleSidebar = useCallback(() => {
    if (window.innerWidth < 768) setSidebarOpen(o => !o)
    else setSidebarCollapsed(c => { localStorage.setItem('obedgpt-sidebar-collapsed', c ? '0' : '1'); return !c })
  }, [])
  const [busy, setBusy] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)

  // Ctrl/Cmd + K : palette de commandes
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSidebar() }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); setShortcutsOpen(o => !o) }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); startNewChatRef.current() }
      if (e.altKey && /^[1-5]$/.test(e.key)) { e.preventDefault(); setActiveMode(['chat', 'code', 'tts', 'atelier', 'studio'][Number(e.key) - 1]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSidebar])

  // Halo d'aurore qui suit légèrement le pointeur (désactivé au tactile et en mouvement réduit)
  useEffect(() => {
    if (matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = e => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const r = document.documentElement.style; r.setProperty('--px', (e.clientX / innerWidth).toFixed(3)); r.setProperty('--py', (e.clientY / innerHeight).toFixed(3)) }) }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf) }
  }, [])

  const handleModeChange = (mode) => {
    setActiveMode(mode)
    setSidebarOpen(false)
  }

  const startNewChat = () => {
    const newId = historyManager.createNewId()
    setActiveChatId(newId)
    setActiveMode('chat')
    setSidebarOpen(false)
  }

  const startNewChatRef = useRef(null)
  startNewChatRef.current = startNewChat

  const openConversation = (id) => {
    setActiveChatId(id)
    setActiveMode('chat')
    setSidebarOpen(false)
  }

  const continueShared = () => {
    if (shared?.state !== 'ok') return
    const id = historyManager.createNewId()
    historyManager.saveConversation(id, shared.data.title || shared.data.messages[0]?.content.slice(0, 50) || 'Conversation', shared.data.messages)
    setActiveChatId(id); setActiveMode('chat'); closeShared()
  }

  const ActiveComponent = MODES[activeMode]?.component || ChatMode

  const contextValue = {
    activeMode, setActiveMode: handleModeChange,
    activeChatId, setActiveChatId,
    startNewChat, openConversation,
    tempMode, setTempMode,
    sidebarOpen, setSidebarOpen,
    busy, setBusy, openPalette: () => setPaletteOpen(true), openShortcuts: () => setShortcutsOpen(true), openGallery: () => setGalleryOpen(true),
    sidebarCollapsed, toggleSidebar,
    history: historyManager.history,
    saveConversation: historyManager.saveConversation,
    deleteConversation: historyManager.deleteConversation,
    renameConversation: historyManager.renameConversation,
    togglePin: historyManager.togglePin,
    clearHistory: historyManager.clearHistory,
    importHistory: historyManager.importHistory,
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContext.Provider value={contextValue}>
         <MotionConfig reducedMotion="user" key={lang + (shared ? 's' : '')}>
          {shared ? (shared.state === 'loading' ? <div className="h-[100dvh] flex items-center justify-center"><LoadingDots label="Chargement..." /></div> : <SharedView data={shared.data} error={shared.error} onContinue={continueShared} onClose={closeShared} />) : (<>
          <div className="shell">
            <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
            <div className="grain" aria-hidden="true" />
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <Header mode={MODES[activeMode]?.label} />
              <main className="flex-1 min-h-0 overflow-hidden relative">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={activeMode} className="h-full"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}>
                    <Suspense fallback={<div className="h-full flex items-center justify-center"><LoadingDots label="Chargement..." /></div>}>
                      <ActiveComponent key={activeChatId} />
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </div>
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
          <Shortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
          <Gallery open={galleryOpen} onClose={() => setGalleryOpen(false)} />
          <Onboarding />
          <InstallPrompt />
          </>)}
         </MotionConfig>
        </AppContext.Provider>
      </ToastProvider>
    </ThemeProvider>
  )
}

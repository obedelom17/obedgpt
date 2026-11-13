import { useState, useEffect, useCallback, lazy, Suspense, createContext, useContext } from 'react'
import { ThemeProvider } from './hooks/useTheme.jsx'
import { useChatHistory } from './hooks/useChatHistory'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import ChatMode from './components/modes/ChatMode'
import { LoadingDots } from './components/ui'
import { MotionConfig, AnimatePresence, motion } from 'framer-motion'
import CommandPalette from './components/fx/CommandPalette'
import { ToastProvider } from './components/fx/Toast'

// Chat est le mode par défaut donc chargé immédiatement. Les autres modes
// sont chargés à la demande : sur mobile/connexion lente, ça évite de
// télécharger tout le JS (code, tts, settings) d'un coup
// alors qu'on n'utilisera peut-être que le chat.
const CodeMode   = lazy(() => import('./components/modes/CodeMode'))
const TTSMode    = lazy(() => import('./components/modes/TTSMode'))
const Settings   = lazy(() => import('./components/Settings'))

const MODES = {
  chat:     { label: 'Chat',            component: ChatMode },
  code:     { label: 'Code',            component: CodeMode },
  tts:      { label: 'Text-to-Speech',  component: TTSMode },
  settings: { label: 'Paramètres',      component: Settings },
}

export const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}

export default function App() {
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('obedgpt-sidebar-collapsed') === '1')
  const toggleSidebar = useCallback(() => {
    if (window.innerWidth < 768) setSidebarOpen(o => !o)
    else setSidebarCollapsed(c => { localStorage.setItem('obedgpt-sidebar-collapsed', c ? '0' : '1'); return !c })
  }, [])
  const [busy, setBusy] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Ctrl/Cmd + K : palette de commandes
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSidebar() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSidebar])

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

  const openConversation = (id) => {
    setActiveChatId(id)
    setActiveMode('chat')
    setSidebarOpen(false)
  }

  const ActiveComponent = MODES[activeMode]?.component || ChatMode

  const contextValue = {
    activeMode, setActiveMode: handleModeChange,
    activeChatId, setActiveChatId,
    startNewChat, openConversation,
    tempMode, setTempMode,
    sidebarOpen, setSidebarOpen,
    busy, setBusy, openPalette: () => setPaletteOpen(true),
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
         <MotionConfig reducedMotion="user">
          <div className="shell">
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
         </MotionConfig>
        </AppContext.Provider>
      </ToastProvider>
    </ThemeProvider>
  )
}

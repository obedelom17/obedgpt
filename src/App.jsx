import { useState, lazy, Suspense, createContext, useContext } from 'react'
import { ThemeProvider } from './hooks/useTheme.jsx'
import { useChatHistory } from './hooks/useChatHistory'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import ChatMode from './components/modes/ChatMode'
import { LoadingDots } from './components/ui'

// Chat est le mode par défaut donc chargé immédiatement. Les autres modes
// sont chargés à la demande : sur mobile/connexion lente, ça évite de
// télécharger tout le JS (vision, audio, code, tts, settings) d'un coup
// alors qu'on n'utilisera peut-être que le chat.
const VisionMode = lazy(() => import('./components/modes/VisionMode'))
const AudioMode  = lazy(() => import('./components/modes/AudioMode'))
const CodeMode   = lazy(() => import('./components/modes/CodeMode'))
const TTSMode    = lazy(() => import('./components/modes/TTSMode'))
const Settings   = lazy(() => import('./components/Settings'))

const MODES = {
  chat:     { label: 'Chat',            component: ChatMode },
  vision:   { label: 'Vision',          component: VisionMode },
  audio:    { label: 'Audio',           component: AudioMode },
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
  // Les raccourcis PWA (manifest.json) pointent vers /?mode=vision etc. :
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
      <AppContext.Provider value={contextValue}>
        <div className="flex app-height w-screen overflow-hidden bg-navy-900 relative">
          {/* Background orbs - hidden on mobile */}
          <div aria-hidden="true" className="hidden md:block orb w-96 h-96 bg-orange-100/60 top-[-10%] left-[-5%]" style={{ animationDelay: '0s' }} />
          <div aria-hidden="true" className="hidden md:block orb w-80 h-80 bg-orange-200/30 bottom-[-5%] right-[10%]" style={{ animationDelay: '-4s' }} />

          <Sidebar />

          <div className="flex flex-col flex-1 min-w-0 relative z-10">
            <Header mode={MODES[activeMode]?.label} />
            <main className="flex-1 overflow-hidden">
              <Suspense fallback={<div className="h-full flex items-center justify-center"><LoadingDots label="Chargement..." /></div>}>
                <ActiveComponent key={activeChatId} />
              </Suspense>
            </main>
          </div>
        </div>
      </AppContext.Provider>
    </ThemeProvider>
  )
}

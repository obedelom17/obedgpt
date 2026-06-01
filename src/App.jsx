import { useState, useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import ChatMode from './components/modes/ChatMode'
import VisionMode from './components/modes/VisionMode'
import DocumentMode from './components/modes/DocumentMode'
import AudioMode from './components/modes/AudioMode'
import VideoMode from './components/modes/VideoMode'
import SearchMode from './components/modes/SearchMode'
import CodeMode from './components/modes/CodeMode'
import ImagineMode from './components/modes/ImagineMode'
import EmbedMode from './components/modes/EmbedMode'
import TTSMode from './components/modes/TTSMode'
import Settings from './components/Settings'

const MODES = {
  chat:     { label: 'Chat',           component: ChatMode },
  vision:   { label: 'Vision',         component: VisionMode },
  document: { label: 'Documents',      component: DocumentMode },
  audio:    { label: 'Audio',          component: AudioMode },
  video:    { label: 'Vidéo',          component: VideoMode },
  search:   { label: 'Web Search',     component: SearchMode },
  code:     { label: 'Code',           component: CodeMode },
  imagine:  { label: 'Imagine',        component: ImagineMode },
  embed:    { label: 'Embeddings',     component: EmbedMode },
  tts:      { label: 'Text-to-Speech', component: TTSMode },
  settings: { label: 'Paramètres',     component: Settings },
}

export default function App() {
  const [activeMode, setActiveMode] = useState('chat')
  // Closed by default on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)

  // Close sidebar on mobile when resizing down
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = window.innerWidth < 768

  const handleModeChange = (mode) => {
    setActiveMode(mode)
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const ActiveComponent = MODES[activeMode]?.component || ChatMode

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-navy-900 relative">
      {/* Background orbs */}
      <div className="orb w-96 h-96 bg-orange-100/60 top-[-10%] left-[-5%]" style={{ animationDelay: '0s' }} />
      <div className="orb w-80 h-80 bg-orange-200/30 bottom-[-5%] right-[10%]" style={{ animationDelay: '-4s' }} />

      {/* Mobile overlay */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <Sidebar
        modes={MODES}
        activeMode={activeMode}
        setActiveMode={handleModeChange}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 relative z-10">
        <Header
          mode={MODES[activeMode]?.label}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <main className="flex-1 overflow-hidden">
          <ActiveComponent />
        </main>
      </div>
    </div>
  )
}

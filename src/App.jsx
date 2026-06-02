import { useState, useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import ChatMode from './components/modes/ChatMode'
import VisionMode from './components/modes/VisionMode'
import AudioMode from './components/modes/AudioMode'
import CodeMode from './components/modes/CodeMode'
import TTSMode from './components/modes/TTSMode'
import Settings from './components/Settings'

const MODES = {
  chat:     { label: 'Chat',           component: ChatMode },
  vision:   { label: 'Vision',         component: VisionMode },
  audio:    { label: 'Audio',          component: AudioMode },
  code:     { label: 'Code',           component: CodeMode },
  tts:      { label: 'Text-to-Speech', component: TTSMode },
  settings: { label: 'Paramètres',     component: Settings },
}

export default function App() {
  const [activeMode, setActiveMode] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth < 768) setSidebarOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleModeChange = (mode) => {
    setActiveMode(mode)
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const ActiveComponent = MODES[activeMode]?.component || ChatMode

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-navy-900 relative">
      <div className="orb w-96 h-96 bg-orange-100/60 top-[-10%] left-[-5%]" style={{ animationDelay: '0s' }} />
      <div className="orb w-80 h-80 bg-orange-200/30 bottom-[-5%] right-[10%]" style={{ animationDelay: '-4s' }} />

      {sidebarOpen && window.innerWidth < 768 && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        modes={MODES}
        activeMode={activeMode}
        setActiveMode={handleModeChange}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <div className="flex flex-col flex-1 min-w-0 relative z-10">
        <Header mode={MODES[activeMode]?.label} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-hidden">
          <ActiveComponent />
        </main>
      </div>
    </div>
  )
}

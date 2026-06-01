import { useState } from 'react'
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
  chat:     { label: 'Chat',         component: ChatMode },
  vision:   { label: 'Vision',       component: VisionMode },
  document: { label: 'Documents',    component: DocumentMode },
  audio:    { label: 'Audio',        component: AudioMode },
  video:    { label: 'Vidéo',        component: VideoMode },
  search:   { label: 'Web Search',   component: SearchMode },
  code:     { label: 'Code',         component: CodeMode },
  imagine:  { label: 'Imagine',      component: ImagineMode },
  embed:    { label: 'Embeddings',   component: EmbedMode },
  tts:      { label: 'Text-to-Speech', component: TTSMode },
  settings: { label: 'Paramètres',   component: Settings },
}

export default function App() {
  const [activeMode, setActiveMode] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const ActiveComponent = MODES[activeMode]?.component || ChatMode

  return (
    <div className="noise flex h-screen w-screen overflow-hidden bg-navy-900 relative">
      {/* Background orbs */}
      <div className="orb w-96 h-96 bg-amber-500/5 top-[-10%] left-[-5%]" style={{ animationDelay: '0s' }} />
      <div className="orb w-80 h-80 bg-blue-600/4 bottom-[-5%] right-[10%]" style={{ animationDelay: '-4s' }} />
      <div className="orb w-64 h-64 bg-amber-400/4 top-[40%] right-[-5%]" style={{ animationDelay: '-8s' }} />

      {/* Sidebar */}
      <Sidebar
        modes={MODES}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
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

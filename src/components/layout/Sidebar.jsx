import {
  MessageSquare, Eye, FileText, Mic, Video, Search, Code2,
  Sparkles, BarChart2, Volume2, Settings, ChevronLeft, ChevronRight, Zap
} from 'lucide-react'

const ICONS = {
  chat: MessageSquare, vision: Eye, document: FileText,
  audio: Mic, video: Video, search: Search, code: Code2,
  imagine: Sparkles, embed: BarChart2, tts: Volume2, settings: Settings,
}

const GROUPS = [
  { label: 'Conversation', keys: ['chat', 'code'] },
  { label: 'Multimodal',   keys: ['vision', 'document', 'audio', 'video'] },
  { label: 'Intelligence', keys: ['search', 'imagine', 'embed', 'tts'] },
  { label: 'Système',      keys: ['settings'] },
]

export default function Sidebar({ modes, activeMode, setActiveMode, isOpen, setIsOpen }) {
  return (
    <aside
      className={`
        relative z-20 flex flex-col border-r border-orange-100 bg-white shadow-sm
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-60' : 'w-[60px]'}
        md:relative fixed h-full
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-orange-100 ${!isOpen && 'justify-center px-0'}`}>
        <div className="w-8 h-8 rounded-xl amber-gradient flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <Zap size={16} className="text-white" strokeWidth={2.5} />
        </div>
        {isOpen && (
          <div>
            <div className="font-display font-bold text-base text-gradient leading-none">ObedGPT</div>
            <div className="text-[10px] text-stone-400 font-mono mt-0.5">intelligence artificielle</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {GROUPS.map(group => (
          <div key={group.label}>
            {isOpen && (
              <div className="px-3 mb-1.5 text-[10px] font-display font-semibold tracking-widest text-stone-300 uppercase">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.keys.map(key => {
                const Icon = ICONS[key]
                const isActive = activeMode === key
                return (
                  <button
                    key={key}
                    onClick={() => setActiveMode(key)}
                    title={!isOpen ? modes[key]?.label : undefined}
                    className={`mode-btn ${isActive ? 'active' : ''} ${!isOpen ? 'justify-center px-0 w-10 h-10 mx-auto' : ''}`}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {isOpen && <span>{modes[key]?.label}</span>}
                    {isOpen && isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-white border border-orange-200
                   flex items-center justify-center text-stone-400 hover:text-orange-500
                   hover:border-orange-400 transition-all duration-200 z-30 shadow-sm"
      >
        {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </aside>
  )
}

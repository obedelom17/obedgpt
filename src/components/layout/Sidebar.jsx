import {
  MessageSquare, Eye, FileText, Mic, Video, Search, Code2,
  Sparkles, BarChart2, Volume2, Settings, ChevronLeft, ChevronRight, Zap
} from 'lucide-react'

const ICONS = {
  chat: MessageSquare,
  vision: Eye,
  document: FileText,
  audio: Mic,
  video: Video,
  search: Search,
  code: Code2,
  imagine: Sparkles,
  embed: BarChart2,
  tts: Volume2,
  settings: Settings,
}

const GROUPS = [
  { label: 'Conversation', keys: ['chat', 'code'] },
  { label: 'Multimodal', keys: ['vision', 'document', 'audio', 'video'] },
  { label: 'Intelligence', keys: ['search', 'imagine', 'embed', 'tts'] },
  { label: 'Système', keys: ['settings'] },
]

export default function Sidebar({ modes, activeMode, setActiveMode, isOpen, setIsOpen }) {
  return (
    <aside
      className={`relative z-20 flex flex-col border-r border-surface-border bg-navy-900/95 backdrop-blur-xl
                  transition-all duration-300 ease-in-out
                  ${isOpen ? 'w-60' : 'w-[60px]'}`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-surface-border ${!isOpen && 'justify-center px-0'}`}>
        <div className="w-8 h-8 rounded-xl amber-gradient flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <Zap size={16} className="text-navy-900" strokeWidth={2.5} />
        </div>
        {isOpen && (
          <div>
            <div className="font-display font-bold text-base text-gradient leading-none">ObedGPT</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">powered by Gemini</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {GROUPS.map(group => (
          <div key={group.label}>
            {isOpen && (
              <div className="px-3 mb-1.5 text-[10px] font-display font-semibold tracking-widest text-slate-600 uppercase">
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
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />
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
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-navy-800 border border-surface-border
                   flex items-center justify-center text-slate-400 hover:text-amber-400 hover:border-amber-500/40
                   transition-all duration-200 z-30"
      >
        {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* Footer */}
      {isOpen && (
        <div className="px-4 py-3 border-t border-surface-border">
          <div className="text-[10px] text-slate-600 font-mono">
            Gemini 2.0 Flash · Free Tier
          </div>
        </div>
      )}
    </aside>
  )
}

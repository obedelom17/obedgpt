import { useState, useRef, useEffect } from 'react'
import { Send, RotateCcw, User, Zap, Sliders } from 'lucide-react'
import { LoadingDots, MarkdownRenderer, ErrorBanner } from '../ui'

const SYSTEM_PRESETS = [
  { label: 'Assistant général', value: "Tu es ObedGPT, un assistant IA intelligent et utile. Réponds dans la langue de l'utilisateur." },
  { label: 'Développeur senior', value: 'Tu es un développeur senior expert en React, Python, Java et architecture logicielle. Donne des conseils précis et du code production-ready.' },
  { label: 'Tuteur académique', value: "Tu es un tuteur pédagogue. Explique les concepts avec des exemples concrets. Adapte ton niveau à l'apprenant." },
  { label: 'Rédacteur pro', value: 'Tu es un rédacteur professionnel. Tu crées des textes clairs, engageants et bien structurés.' },
]

export default function ChatMode() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PRESETS[0].value)
  const [showSystem, setShowSystem] = useState(false)
  const [lastPayload, setLastPayload] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const sendRequest = async (payload) => {
    setLastPayload(payload)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    await sendRequest({ messages: newMessages, systemPrompt })
  }

  const retry = () => {
    if (lastPayload) {
      setError(null)
      sendRequest(lastPayload)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const reset = () => { setMessages([]); setError(null); setLastPayload(null) }

  return (
    <div className="flex flex-col h-full bg-navy-900">
      {/* System prompt bar */}
      <div className="px-4 py-2 border-b border-orange-100 bg-white/60">
        <button
          onClick={() => setShowSystem(!showSystem)}
          className="flex items-center gap-2 text-xs text-stone-400 hover:text-orange-500 transition-colors"
        >
          <Sliders size={12} />
          Invite système · {SYSTEM_PRESETS.find(p => p.value === systemPrompt)?.label || 'Personnalisé'}
        </button>
        {showSystem && (
          <div className="mt-2 space-y-2 animate-fade-in">
            <div className="flex flex-wrap gap-2">
              {SYSTEM_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setSystemPrompt(p.value)}
                  className={`tag ${systemPrompt === p.value ? 'active-tag' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={2}
              className="input-field text-xs"
              placeholder="Invite système personnalisée..."
            />
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl amber-gradient flex items-center justify-center shadow-glow-amber">
              <Zap size={28} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-gradient">ObedGPT Chat</h2>
              <p className="text-stone-400 text-sm mt-1">Pose une question, démarre une conversation</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-md w-full mt-2">
              {['Explique le machine learning', 'Écris un composant React', 'Traduis en anglais', 'Résume un concept'].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs text-left p-3 card rounded-xl text-stone-500 hover:text-orange-600 hover:border-orange-200 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg amber-gradient flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap size={12} className="text-white" />
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}>
              {msg.role === 'user'
                ? <p className="text-sm text-stone-800">{msg.content}</p>
                : <MarkdownRenderer content={msg.content} />
              }
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={12} className="text-orange-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg amber-gradient flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap size={12} className="text-white" />
            </div>
            <div className="message-ai"><LoadingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-2">
          <ErrorBanner error={error} onDismiss={() => setError(null)} onRetry={retry} />
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-orange-100 bg-white/60">
        <div className="flex gap-2 items-end">
          {messages.length > 0 && (
            <button onClick={reset} className="btn-ghost p-2.5 flex-shrink-0" title="Nouvelle conversation">
              <RotateCcw size={15} />
            </button>
          )}
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Envoie un message... (Entrée pour envoyer)"
            className="input-field resize-none flex-1"
            style={{ minHeight: '44px', maxHeight: '160px' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px' }}
            disabled={loading}
          />
          <button onClick={send} disabled={!input.trim() || loading} className="btn-primary p-2.5 flex-shrink-0">
            <Send size={15} />
          </button>
        </div>
        <p className="text-[10px] text-stone-400 mt-1.5 text-center font-mono">
          {messages.length} message{messages.length !== 1 ? 's' : ''} · contexte multi-tour actif
        </p>
      </div>
    </div>
  )
}

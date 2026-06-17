import { useState, useRef, useEffect } from 'react'
import { Send, RotateCcw, User, Zap, FileText, X, Paperclip, Image as ImageIcon, Flame } from 'lucide-react'
import { LoadingDots, MarkdownRenderer, ErrorBanner } from '../ui'
import { useApiCall } from '../../hooks/useApiCall'
import { useApp } from '../../App'

const SYSTEM_PROMPT = "Tu es ObedGPT, un assistant IA intelligent. Réponds dans la langue de l'utilisateur. Utilise LaTeX pour les maths : $...$ inline, $$...$$ pour les blocs."

// On n'envoie jamais TOUT l'historique au modèle : au-delà d'un certain
// nombre de messages, le coût en tokens d'un seul tour de chat exploserait
// (chaque message renvoie tout ce qui précède). Le serveur applique de
// toute façon la même limite en garde-fou, mais la tronquer ici évite aussi
// d'envoyer une requête plus lourde que nécessaire sur le réseau.
const MAX_CONTEXT_MESSAGES = 16

const ALLOWED_DOCS = [
  // Documents
  'application/pdf', 'text/plain', 'text/csv', 'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'
]
const MAX_DOC_SIZE = 10 * 1024 * 1024

export default function ChatMode() {
  const { activeChatId, tempMode, saveConversation, history } = useApp()
  const savedConv = activeChatId ? history.find(c => c.id === activeChatId) : null

  const [messages, setMessages]     = useState(() => savedConv?.messages || [])
  const [input, setInput]           = useState('')
  const [systemPrompt] = useState(SYSTEM_PROMPT)
  const [attachedFiles, setAttachedFiles] = useState([])
  const { loading, error, call, retry, clearError } = useApiCall()
  const bottomRef  = useRef(null)
  const lastMsgs   = useRef([])
  const fileInputRef = useRef(null)

  // Auto-save non-temp conversations
  useEffect(() => {
    if (!tempMode && activeChatId && messages.length > 0) {
      const title = messages[0].content.slice(0, 50) || 'Nouvelle conversation'
      saveConversation(activeChatId, title, messages)
    }
  }, [messages, activeChatId, tempMode, saveConversation])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const isImage = (type) => type.startsWith('image/')

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    const valid = files.filter(f => {
      if (!ALLOWED_DOCS.includes(f.type)) {
        alert(`Type non supporté: ${f.name}`)
        return false
      }
      if (f.size > MAX_DOC_SIZE) {
        alert(`Fichier trop volumineux: ${f.name}. Max 10MB.`)
        return false
      }
      return true
    })
    setAttachedFiles(prev => [...prev, ...valid])
  }

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const readFileAsBase64 = (file) => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve({ name: file.name, type: file.type, base64: reader.result.split(',')[1] })
    reader.readAsDataURL(file)
  })

  const send = async () => {
    const text = input.trim()
    if ((!text && attachedFiles.length === 0) || loading) return

    let fileData = []
    if (attachedFiles.length > 0) {
      fileData = await Promise.all(attachedFiles.map(readFileAsBase64))
    }

    const userContent = text + (fileData.length > 0 ? `\n\n[Fichiers joints: ${fileData.map(f => f.name).join(', ')}]` : '')
    const newMessages = [...messages, { role: 'user', content: userContent }]
    setMessages(newMessages)
    setInput('')
    setAttachedFiles([])
    lastMsgs.current = newMessages

    const contextWindow = newMessages.slice(-MAX_CONTEXT_MESSAGES)
    const data = await call('/api/chat', { messages: contextWindow, systemPrompt, files: fileData })
    if (data) setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
  }

  const handleRetry = async () => {
    const data = await retry()
    if (data) setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
  }

  const onKeyDown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  const reset = () => { setMessages([]); clearError(); setAttachedFiles([]) }

  return (
    <div className="flex flex-col h-full bg-navy-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 md:py-4 space-y-3 md:space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 md:gap-4 text-center px-2">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl amber-gradient flex items-center justify-center shadow-glow-amber">
              <Zap size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg md:text-xl text-gradient">ObedGPT Chat</h2>
              <p className="text-stone-400 text-xs md:text-sm mt-1">Pose une question, démarre une conversation</p>
              {tempMode && <p className="text-orange-500 text-xs mt-1 flex items-center gap-1 justify-center"><Flame size={12} /> Mode temporaire</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full mt-2">
              {['Explique le machine learning', 'Écris un composant React', 'Résous $x^2 - 5x + 6 = 0$', 'Traduis en anglais'].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs text-left p-2.5 md:p-3 card rounded-xl text-stone-500 hover:text-orange-600 hover:border-orange-200 transition-all">{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 md:gap-3 animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg amber-gradient flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap size={10} className="text-white" /></div>
            )}
            <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}>
              {msg.role === 'user' 
                ? <p className="text-xs md:text-sm text-stone-800 break-words">{msg.content}</p> 
                : <MarkdownRenderer content={msg.content} />
              }
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={10} className="text-orange-400" /></div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 md:gap-3">
            <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg amber-gradient flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap size={10} className="text-white" /></div>
            <div className="message-ai"><LoadingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-3 md:px-4 pb-2">
          <ErrorBanner error={error} onDismiss={clearError} onRetry={handleRetry} />
        </div>
      )}

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="px-3 md:px-4 pt-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-700">
              {isImage(file.type) ? <ImageIcon size={12} /> : <FileText size={12} />}
              <span className="max-w-[100px] md:max-w-[120px] truncate">{file.name}</span>
              <button onClick={() => removeFile(i)} className="hover:text-red-500"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 md:px-4 pb-3 md:pb-4 pt-2 border-t border-orange-100 bg-white/60 safe-bottom">
        <div className="flex gap-2 items-end">
          {messages.length > 0 && (
            <button onClick={reset} className="btn-ghost p-2 md:p-2.5 flex-shrink-0 hidden sm:flex" title="Nouvelle conversation"><RotateCcw size={15} /></button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple
            accept="image/*,.pdf,.txt,.csv,.json,.doc,.docx"
            className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="btn-ghost p-2 md:p-2.5 flex-shrink-0" title="Joindre un fichier">
            <Paperclip size={15} />
          </button>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
            rows={1} disabled={loading}
            placeholder="Message..."
            className="input-field resize-none flex-1 text-sm"
            style={{ minHeight: '40px', maxHeight: '120px' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
          />
          <button onClick={send} disabled={(!input.trim() && attachedFiles.length === 0) || loading} className="btn-primary p-2.5 md:p-3 flex-shrink-0">
            <Send size={15} /></button>
        </div>
        <p className="text-[10px] text-stone-400 mt-1 text-center font-mono">
          {messages.length} msg · contexte: {Math.min(messages.length, MAX_CONTEXT_MESSAGES)} · SmartRouter
        </p>
      </div>
    </div>
  )
}

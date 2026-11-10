import { useState, useRef, useEffect } from 'react'
import { Send, RotateCcw, User, Zap, FileText, X, Paperclip, Image as ImageIcon, Mic, RefreshCw, Square, Pencil, Check, Download, Printer, ArrowDown, Copy, Lightbulb, BookOpen, Code2, Sparkles } from 'lucide-react'
import { MarkdownRenderer, ErrorBanner, ThinkingSkeleton } from '../ui'
import Tilt from '../fx/Tilt'
import Typewriter from '../fx/Typewriter'
import { useToast } from '../fx/Toast'
import { burst } from '../fx/burst'
import { useStreamingChat } from '../../hooks/useApiCall'
import { useApp } from '../../App'

const BASE_SYSTEM_PROMPT = "Tu es ObedGPT, un assistant IA intelligent créé par Obed Elom AGBEBAVI. Si on te demande qui t'a créé/développé, réponds que c'est Obed Elom AGBEBAVI. Réponds dans la langue de l'utilisateur. Utilise LaTeX pour les maths : $...$ inline, $$...$$ pour les blocs."
const PERSONA_KEY = 'obedgpt-persona'

const SUGGESTIONS = [
  { text: 'Devine les questions du prof', icon: Lightbulb, sub: 'Prépare ton examen' },
  { text: 'Fais mon exercice de maison', icon: BookOpen, sub: 'Résous pas à pas' },
  { text: 'Developpe moi une application', icon: Code2, sub: 'Du code complet' },
  { text: 'Traite moi ça', icon: Sparkles, sub: 'Analyse et résume' },
]
const TAGLINES = ['Pose-moi une question.', 'Génère du code en quelques secondes.', 'Analyse une image ou un document.', 'Résous un exercice pas à pas.', 'Dicte ton message à la voix.']

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir'
}

// On n'envoie jamais TOUT l'historique au modèle : au-delà d'un certain
// nombre de messages, le coût en tokens d'un seul tour de chat exploserait
// (chaque message renvoie tout ce qui précède). Le serveur applique de
// toute façon la même limite en garde-fou, mais la tronquer ici évite aussi
// d'envoyer une requête plus lourde que nécessaire sur le réseau.
const MAX_CONTEXT_MESSAGES = 16

const ALLOWED_DOCS = [
  'application/pdf', 'text/plain', 'text/csv', 'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'
]
const MAX_DOC_SIZE = 10 * 1024 * 1024

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export default function ChatMode() {
  const { activeChatId, tempMode, saveConversation, history, setBusy } = useApp()
  const toast = useToast()
  const savedConv = activeChatId ? history.find(c => c.id === activeChatId) : null

  const [messages, setMessages]     = useState(() => savedConv?.messages || [])
  const [input, setInput]           = useState('')
  const [systemPrompt] = useState(() => {
    const persona = localStorage.getItem(PERSONA_KEY)
    return persona ? `${BASE_SYSTEM_PROMPT}\n\nInstructions supplémentaires de l'utilisateur : ${persona}` : BASE_SYSTEM_PROMPT
  })
  const [attachedFiles, setAttachedFiles] = useState([])
  const [fileError, setFileError] = useState(null)
  const [listening, setListening] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editValue, setEditValue] = useState('')
  const { loading, error, call, retry, clearError, abort } = useStreamingChat()
  const bottomRef  = useRef(null)
  const fileInputRef = useRef(null)
  const recognitionRef = useRef(null)

  // Auto-save non-temp conversations
  useEffect(() => {
    if (!tempMode && activeChatId && messages.length > 0) {
      const title = messages[0].content.slice(0, 50) || 'Nouvelle conversation'
      saveConversation(activeChatId, title, messages)
    }
  }, [messages, activeChatId, tempMode, saveConversation])

  // Fait pulser le fond et le header pendant la génération
  useEffect(() => { setBusy(loading); return () => setBusy(false) }, [loading, setBusy])

  // Défilement intelligent : on suit le texte seulement si l'utilisateur est
  // déjà en bas (sinon il lit plus haut), avec un bouton pour redescendre.
  const scrollRef = useRef(null)
  const stickRef = useRef(true)
  const [showFab, setShowFab] = useState(false)
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 90
    stickRef.current = near
    setShowFab(prev => (prev === !near ? prev : !near))
  }
  const scrollToBottom = (smooth = true) => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last?.role === 'user') { stickRef.current = true; scrollToBottom(true) }
    else if (stickRef.current) scrollToBottom(false)
  }, [messages, loading])

  const copyMessage = (text) => { navigator.clipboard?.writeText(text); toast('Réponse copiée') }
  const sendBtnRef = useRef(null)
  const inputRef = useRef(null)

  // Coupe proprement la dictée vocale si le composant est démonté en plein
  // enregistrement (changement de mode pendant qu'on dicte).
  useEffect(() => () => recognitionRef.current?.stop(), [])

  const isImage = (type) => type.startsWith('image/')

  const validateFiles = (files) => {
    const valid = []
    let firstError = null
    for (const f of files) {
      if (!ALLOWED_DOCS.includes(f.type)) { firstError = firstError || `Type non supporté : ${f.name || f.type}`; continue }
      if (f.size > MAX_DOC_SIZE) { firstError = firstError || `Fichier trop volumineux : ${f.name} (max 10MB)`; continue }
      valid.push(f)
    }
    setFileError(firstError)
    return valid
  }

  const handleFileSelect = (e) => {
    const valid = validateFiles(Array.from(e.target.files))
    setAttachedFiles(prev => [...prev, ...valid])
  }

  // Coller une image directement (Ctrl+V) dans le champ de message.
  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    const imageFiles = Array.from(items).filter(it => it.type?.startsWith('image/')).map(it => it.getAsFile()).filter(Boolean)
    if (imageFiles.length === 0) return
    e.preventDefault()
    const valid = validateFiles(imageFiles)
    setAttachedFiles(prev => [...prev, ...valid])
  }

  const removeFile = (index) => setAttachedFiles(prev => prev.filter((_, i) => i !== index))

  const readFileAsBase64 = (file) => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve({ name: file.name, type: file.type, base64: reader.result.split(',')[1] })
    reader.readAsDataURL(file)
  })

  // Dictée vocale : Web Speech API, déjà utilisée pour la synthèse (TTS) côté
  // navigateur, ici dans l'autre sens (micro -> texte).
  const toggleDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { setFileError("La dictée vocale n'est pas supportée par ce navigateur."); return }
    if (listening) { recognitionRef.current?.stop(); return }

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ').trim()
      if (transcript) setInput(prev => (prev ? prev + ' ' : '') + transcript)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  // Ajoute un message assistant vide puis le remplit morceau par morceau au
  // fil du streaming. En cas d'échec (hors arrêt volontaire), on retire ce
  // message vide ; l'erreur s'affiche via le bandeau ErrorBanner.
  const appendAssistantStreamed = async (apiCallFn) => {
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    const onChunk = (delta) => {
      setMessages(prev => {
        const next = [...prev]
        const last = next[next.length - 1]
        next[next.length - 1] = { ...last, content: last.content + delta }
        return next
      })
    }
    const data = await apiCallFn(onChunk)
    if (!data) setMessages(prev => prev.slice(0, -1))
    return data
  }

  const sendFromMessages = async (newMessages, fileData = []) => {
    const contextWindow = newMessages.slice(-MAX_CONTEXT_MESSAGES)
    await appendAssistantStreamed(onChunk => call('/api/chat', { messages: contextWindow, systemPrompt, files: fileData }, onChunk))
  }

  const send = async () => {
    const text = input.trim()
    if ((!text && attachedFiles.length === 0) || loading) return

    let fileData = []
    if (attachedFiles.length > 0) fileData = await Promise.all(attachedFiles.map(readFileAsBase64))

    const userContent = text + (fileData.length > 0 ? `\n\n[Fichiers joints: ${fileData.map(f => f.name).join(', ')}]` : '')
    const newMessages = [...messages, { role: 'user', content: userContent }]
    const b = sendBtnRef.current?.getBoundingClientRect()
    if (b) burst(b.left + b.width / 2, b.top + b.height / 2)
    setMessages(newMessages)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setAttachedFiles([])
    setFileError(null)

    await sendFromMessages(newMessages, fileData)
  }

  const handleRetry = async () => { await appendAssistantStreamed(onChunk => retry(onChunk)) }

  // Régénère la dernière réponse de l'assistant : on retire les messages
  // assistant en fin de conversation puis on renvoie le même contexte.
  const regenerate = async () => {
    if (loading) return
    let end = messages.length
    while (end > 0 && messages[end - 1].role === 'assistant') end--
    const trimmed = messages.slice(0, end)
    if (trimmed.length === 0) return
    setMessages(trimmed)
    await sendFromMessages(trimmed)
  }

  // Édition d'un message déjà envoyé : on retire ce message et tout ce qui
  // suit, on renvoie la version corrigée, puis on régénère la réponse.
  const startEdit = (i) => {
    if (loading) return
    setEditingIndex(i)
    setEditValue(messages[i].content)
  }
  const cancelEdit = () => { setEditingIndex(null); setEditValue('') }
  const saveEdit = async () => {
    const text = editValue.trim()
    if (!text) return
    const i = editingIndex
    const trimmed = [...messages.slice(0, i), { role: 'user', content: text }]
    setMessages(trimmed)
    setEditingIndex(null)
    setEditValue('')
    await sendFromMessages(trimmed)
  }

  const exportMarkdown = () => {
    const md = messages.map(m => `**${m.role === 'user' ? 'Vous' : 'ObedGPT'}** :\n\n${m.content}\n`).join('\n---\n\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `obedgpt-conversation-${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  const exportPrintable = () => {
    const win = window.open('', '_blank')
    if (!win) { setFileError('Le navigateur a bloqué la fenêtre d\'impression (pop-up).'); return }
    const body = messages.map(m =>
      `<div class="msg ${m.role}"><strong>${m.role === 'user' ? 'Vous' : 'ObedGPT'}</strong><div>${escapeHtml(m.content).replace(/\n/g, '<br/>')}</div></div>`
    ).join('')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>ObedGPT — Conversation</title><style>
      body{font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:2rem auto;color:#1c1917;line-height:1.6;padding:0 1rem}
      h2{font-family:Georgia,serif}
      .msg{margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid #eee}
      .msg.user strong{color:#ea580c} .msg.assistant strong{color:#1c1917}
      strong{display:block;margin-bottom:.25rem;font-size:.8rem;text-transform:uppercase;letter-spacing:.03em}
    </style></head><body><h2>Conversation ObedGPT</h2>${body}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  const onKeyDown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  const reset = () => { setMessages([]); clearError(); setAttachedFiles([]); setFileError(null); cancelEdit() }

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !loading

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain px-3 md:px-4 py-3 md:py-4 space-y-3 md:space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center min-h-full py-6 px-2 text-center">
            <div className="hero-orb"><Zap size={38} strokeWidth={2.2} /></div>
            <h2 className="hero-title stagger-in" style={{ animationDelay: '.15s' }}>{greeting()}, que créons-nous ?</h2>
            <p className="mt-3 text-sm md:text-base text-stone-500 h-6 stagger-in" style={{ animationDelay: '.3s' }}>
              <Typewriter phrases={TAGLINES} />
            </p>
            {tempMode && <span className="mt-3 text-xs text-orange-500 stagger-in">Mode temporaire actif : rien n'est sauvegardé</span>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3 w-full max-w-xl mt-7">
              {SUGGESTIONS.map(({ text, icon: Icon, sub }, i) => (
                <Tilt key={text} as="button" onClick={() => { setInput(text); inputRef.current?.focus() }}
                  className="stagger-in text-left px-4 py-3.5 rounded-2xl border border-orange-500/20 text-stone-600"
                  style={{ animationDelay: `${0.4 + i * 0.09}s` }}>
                  <span className="flex items-center gap-3 relative z-10">
                    <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg,#f97316,#f43f5e)', boxShadow: '0 6px 16px -4px rgba(249,115,22,0.6)' }}><Icon size={16} /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-stone-800">{text}</span>
                      <span className="block text-[11px] text-stone-400">{sub}</span>
                    </span>
                  </span>
                </Tilt>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1
          const isEditing = editingIndex === i
          return (
            <div key={i} className={`flex gap-2 md:gap-3 group ${msg.role === 'user' ? 'justify-end msg-in-right' : 'justify-start msg-in-left'}`}>
              {msg.role === 'assistant' && (
                <div className={`avatar-ai mt-0.5 ${loading && isLast ? 'live' : ''}`}><Zap size={13} /></div>
              )}
              <div className="max-w-[85%] sm:max-w-[75%]">
                {isEditing ? (
                  <div className="message-user">
                    <textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={3} autoFocus
                      aria-label="Modifier le message"
                      className="w-full bg-transparent text-xs md:text-sm text-stone-800 outline-none resize-none" />
                    <div className="flex gap-2 justify-end mt-2">
                      <button onClick={cancelEdit} className="text-[11px] text-stone-400 hover:text-stone-600 px-2 py-1">Annuler</button>
                      <button onClick={saveEdit} className="flex items-center gap-1 text-[11px] bg-orange-500 text-white px-2.5 py-1 rounded-lg hover:bg-orange-600">
                        <Check size={11} /> Renvoyer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={msg.role === 'user' ? 'message-user' : `message-ai ${loading && isLast ? 'streaming' : ''}`}>
                    {msg.role === 'user'
                      ? <p className="text-xs md:text-sm text-stone-800 break-words whitespace-pre-wrap">{msg.content}</p>
                      : (msg.content ? <MarkdownRenderer content={msg.content} /> : <ThinkingSkeleton />)
                    }
                  </div>
                )}

                {!isEditing && msg.role === 'user' && (
                  <button onClick={() => startEdit(i)} aria-label="Modifier ce message"
                    className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-orange-500 mt-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity float-right">
                    <Pencil size={10} /> Modifier
                  </button>
                )}
                {!isEditing && msg.role === 'assistant' && loading && isLast && msg.content && (
                  <span className="wave mt-2 ml-1" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                )}
                {!isEditing && msg.role === 'assistant' && msg.content && !(loading && isLast) && (
                  <div className="flex items-center gap-3 mt-1 ml-1">
                    <button onClick={() => copyMessage(msg.content)} aria-label="Copier cette réponse" className="mini-action"><Copy size={11} /> Copier</button>
                    {isLast && lastIsAssistant && (
                      <button onClick={regenerate} aria-label="Régénérer cette réponse" className="mini-action"><RefreshCw size={11} /> Régénérer</button>
                    )}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={10} className="text-orange-400" /></div>
              )}
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      <button className={`scroll-fab ${showFab ? 'show' : ''}`} style={{ bottom: '5.5rem' }} onClick={() => scrollToBottom(true)} aria-label="Aller en bas de la conversation" tabIndex={showFab ? 0 : -1}>
        <ArrowDown size={16} />
      </button>

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
              <button onClick={() => removeFile(i)} aria-label={`Retirer ${file.name}`} className="hover:text-red-500"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {fileError && (
        <div className="px-3 md:px-4 pt-2">
          <p className="text-xs text-red-500 flex items-center justify-between">
            {fileError}
            <button onClick={() => setFileError(null)} aria-label="Fermer ce message" className="text-stone-400 hover:text-stone-600 ml-2"><X size={12} /></button>
          </p>
        </div>
      )}

      {/* Input */}
      <div className="composer px-3 md:px-4 pb-3 md:pb-4 pt-2 border-t border-orange-500/15 safe-bottom">
        <div className="flex gap-2 items-end">
          {messages.length > 0 && (
            <div className="hidden sm:flex gap-1 flex-shrink-0">
              <button onClick={reset} aria-label="Nouvelle conversation" title="Nouvelle conversation" className="btn-ghost p-2 md:p-2.5"><RotateCcw size={15} /></button>
              <button onClick={exportMarkdown} aria-label="Exporter en Markdown" title="Exporter en Markdown" className="btn-ghost p-2 md:p-2.5"><Download size={15} /></button>
              <button onClick={exportPrintable} aria-label="Imprimer / Exporter en PDF" title="Imprimer / Exporter en PDF" className="btn-ghost p-2 md:p-2.5"><Printer size={15} /></button>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple
            accept="image/*,.pdf,.txt,.csv,.json,.doc,.docx"
            className="hidden" aria-hidden="true" />
          <button onClick={() => fileInputRef.current?.click()} aria-label="Joindre un fichier" title="Joindre un fichier"
            className="btn-ghost p-2 md:p-2.5 flex-shrink-0">
            <Paperclip size={15} />
          </button>
          <button onClick={toggleDictation} title={listening ? 'Arrêter la dictée' : 'Dicter un message'}
            aria-label={listening ? 'Arrêter la dictée vocale' : 'Démarrer la dictée vocale'} aria-pressed={listening}
            className={`p-2 md:p-2.5 flex-shrink-0 rounded-xl transition-all ${listening ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'btn-ghost'}`}>
            {listening ? <span className="mic-wave" aria-hidden="true"><i /><i /><i /><i /></span> : <Mic size={15} />}
          </button>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} onPaste={handlePaste}
            rows={1} disabled={loading}
            placeholder={window.innerWidth < 640 ? "Message..." : "Message... (colle une image avec Ctrl+V)"}
            aria-label="Message à envoyer"
            className="input-field resize-none flex-1 text-sm"
            style={{ minHeight: '40px', maxHeight: '120px' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
          />
          {loading ? (
            <button onClick={abort} aria-label="Arrêter la génération" title="Arrêter"
              className="flex items-center justify-center p-2.5 md:p-3 flex-shrink-0 rounded-xl bg-stone-700 text-white hover:bg-stone-800 transition-colors">
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button ref={sendBtnRef} data-magnetic onClick={send} disabled={!input.trim() && attachedFiles.length === 0} aria-label="Envoyer le message"
              className="btn-primary p-2.5 md:p-3 flex-shrink-0">
              <Send size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

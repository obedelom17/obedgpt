import { useState, useRef, useEffect } from 'react'
import { Send, RotateCcw, Mic, RefreshCw, Square, Pencil, Check, Download, Printer, ArrowDown, Copy, Lightbulb, BookOpen, Code2, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import SpotlightCard from '../fx/SpotlightCard'
import Logo from '../Logo'
import { MarkdownRenderer, ErrorBanner, ThinkingSkeleton } from '../ui'
import { useToast } from '../fx/Toast'
import { useStreamingChat } from '../../hooks/useApiCall'
import { useApp } from '../../App'

const BASE_SYSTEM_PROMPT = "Tu es ObedGPT, un assistant IA intelligent créé par Obed Elom AGBEBAVI. Si on te demande qui t'a créé/développé, réponds que c'est Obed Elom AGBEBAVI. Réponds dans la langue de l'utilisateur. Utilise LaTeX pour les maths : $...$ inline, $$...$$ pour les blocs."
const PERSONA_KEY = 'obedgpt-persona'
const PLACEHOLDERS = ['Expliquez-moi la récursivité avec un exemple...', 'Écris une fonction Python qui trie une liste...', 'Résous cette équation : 2x² − 5x + 2 = 0', 'Aide-moi à préparer un exposé sur le climat...', 'Traduis ce paragraphe en anglais...']
const HEADING = ['Comment', 'puis-je', 'vous', 'aider', '?']
const spring = { type: 'spring', stiffness: 380, damping: 30 }

function RotatingPlaceholder({ hidden }) {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI(n => (n + 1) % PLACEHOLDERS.length), 3400); return () => clearInterval(t) }, [])
  return (
    <AnimatePresence mode="wait">
      {!hidden && (
        <motion.span key={i} className="ph" initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }} transition={{ duration: 0.28 }}>
          {PLACEHOLDERS[i]}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

const SUGGESTIONS = [
  { text: 'Devine les questions du prof', icon: Lightbulb, sub: 'Préparer un examen' },
  { text: 'Fais mon exercice de maison', icon: BookOpen, sub: 'Résoudre pas à pas' },
  { text: 'Developpe moi une application', icon: Code2, sub: 'Générer du code complet' },
  { text: 'Traite moi ça', icon: Sparkles, sub: 'Analyser et résumer' },
]


// On n'envoie jamais TOUT l'historique au modèle : au-delà d'un certain
// nombre de messages, le coût en tokens d'un seul tour de chat exploserait
// (chaque message renvoie tout ce qui précède). Le serveur applique de
// toute façon la même limite en garde-fou, mais la tronquer ici évite aussi
// d'envoyer une requête plus lourde que nécessaire sur le réseau.
const MAX_CONTEXT_MESSAGES = 16


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
  const [fileError, setFileError] = useState(null)
  const [listening, setListening] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editValue, setEditValue] = useState('')
  const { loading, error, call, retry, clearError, abort } = useStreamingChat()
  const bottomRef  = useRef(null)
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
    if (messages.length === 0) return
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

  const sendFromMessages = async (newMessages) => {
    const contextWindow = newMessages.slice(-MAX_CONTEXT_MESSAGES)
    await appendAssistantStreamed(onChunk => call('/api/chat', { messages: contextWindow, systemPrompt }, onChunk))
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await sendFromMessages(newMessages)
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
  const reset = () => { setMessages([]); clearError(); setFileError(null); cancelEdit() }

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !loading

  return (
    <div className="flex flex-col h-full relative">
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-5">
        <div className="chat-col space-y-7 min-h-full flex flex-col">
          {messages.length === 0 && !loading && (
            <div className="my-auto py-6 text-center">
              <div className="relative inline-block mb-6">
                <motion.div className="hero-aura" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.12, 1] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
                <motion.div className="relative" animate={{ y: [0, -5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}><Logo size={68} animated /></motion.div>
              </div>
              <h2 className="text-[1.9rem] md:text-[2.5rem] font-bold tracking-tight leading-tight text-stone-800" aria-label="Comment puis-je vous aider ?">
                {HEADING.map((w, i) => (
                  <motion.span key={i} aria-hidden="true" className={`inline-block mr-[0.28em] ${i >= 3 ? 'text-grad' : ''}`} initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.5 + i * 0.09, duration: 0.6, ease: [0.2, 0, 0, 1] }}>{w}</motion.span>
                ))}
              </h2>
              <motion.p className="mt-3 text-sm md:text-base text-stone-500 max-w-md mx-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.5 }}>
                Posez une question, demandez du code ou dictez votre message.
              </motion.p>
              {tempMode && <p className="mt-3 text-xs text-stone-500">Mode temporaire actif : cette conversation ne sera pas sauvegardée.</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-9 text-left">
                {SUGGESTIONS.map(({ text, icon: Icon, sub }, i) => (
                  <motion.div key={text} initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring, delay: 1.15 + i * 0.08 }}>
                    <SpotlightCard onClick={() => { setInput(text); inputRef.current?.focus() }}>
                      <span className="ico"><Icon size={16} /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-stone-800">{text}</span>
                        <span className="block text-xs text-stone-400 mt-0.5">{sub}</span>
                      </span>
                    </SpotlightCard>
                  </motion.div>
                ))}
              </div>
              <motion.div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11.5px] text-stone-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
                <span className="hidden sm:flex items-center gap-1.5"><kbd className="fx-kbd">Entrée</kbd> envoyer</span>
                <span className="hidden sm:flex items-center gap-1.5"><kbd className="fx-kbd">Maj</kbd>+<kbd className="fx-kbd">Entrée</kbd> nouvelle ligne</span>
                <span className="hidden sm:flex items-center gap-1.5"><kbd className="fx-kbd">Ctrl K</kbd> commandes</span>
              </motion.div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1
            const isEditing = editingIndex === i
            const isUser = msg.role === 'user'
            const streamingThis = loading && isLast && !isUser
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} className={`flex gap-3 group ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && <div className={`avatar-wrap mt-0.5 ${streamingThis ? 'live' : ''}`}><span className="ring" /><Logo size={30} thinking={streamingThis && !msg.content} /></div>}
                <div className={`min-w-0 ${isUser ? 'max-w-[86%]' : 'flex-1'}`}>
                  {isEditing ? (
                    <div className="message-user">
                      <textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={3} autoFocus aria-label="Modifier le message" className="w-full bg-transparent text-sm text-white outline-none resize-none" />
                      <div className="flex gap-2 justify-end mt-2">
                        <button onClick={cancelEdit} className="text-xs text-white/80 hover:text-white px-2.5 py-1 rounded-lg">Annuler</button>
                        <button onClick={saveEdit} className="flex items-center gap-1 text-xs bg-white/20 text-white px-2.5 py-1 rounded-lg hover:bg-white/30"><Check size={12} /> Renvoyer</button>
                      </div>
                    </div>
                  ) : (
                    <div className={isUser ? 'message-user' : 'message-ai'}>
                      {isUser
                        ? <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                        : (msg.content ? <MarkdownRenderer content={msg.content} /> : <ThinkingSkeleton />)}
                    </div>
                  )}
                  {!isEditing && isUser && (
                    <div className="flex justify-end mt-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(i)} aria-label="Modifier ce message" className="mini-action"><Pencil size={11} /> Modifier</button>
                    </div>
                  )}
                  {!isEditing && !isUser && msg.content && !streamingThis && (
                    <div className="flex items-center gap-1 mt-1.5 -ml-1.5">
                      <button onClick={() => copyMessage(msg.content)} aria-label="Copier cette réponse" className="mini-action"><Copy size={12} /> Copier</button>
                      {isLast && lastIsAssistant && <button onClick={regenerate} aria-label="Régénérer cette réponse" className="mini-action"><RefreshCw size={12} /> Régénérer</button>}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <AnimatePresence>
        {showFab && (
          <motion.button className="scroll-fab" style={{ bottom: '8.75rem' }} onClick={() => scrollToBottom(true)} aria-label="Aller en bas de la conversation"
            initial={{ opacity: 0, y: 14, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.7 }} whileHover={{ y: -2 }} whileTap={{ scale: 0.9 }} transition={spring}>
            <ArrowDown size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {error && <div className="px-4 md:px-6 pb-2 chat-col"><ErrorBanner error={error} onDismiss={clearError} onRetry={handleRetry} /></div>}

      <div className="composer-wrap">
        {fileError && (
          <div className="chat-col pb-2"><p className="text-xs text-red-500 flex items-center justify-between">{fileError}
            <button onClick={() => setFileError(null)} aria-label="Fermer ce message" className="text-stone-400 hover:text-stone-600 ml-2"><X size={12} /></button></p></div>
        )}
        <div className={`composer ${loading ? 'busy' : ''}`}>
          <div className="relative">
            <RotatingPlaceholder hidden={!!input || loading} />
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} rows={1} disabled={loading} aria-label="Message à envoyer"
              style={{ minHeight: '46px', maxHeight: '170px' }} onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 170) + 'px' }} />
          </div>
          <div className="flex items-center gap-0.5 px-0.5 pt-0.5">
            <button onClick={toggleDictation} title={listening ? 'Arrêter la dictée' : 'Dicter un message'} aria-label={listening ? 'Arrêter la dictée vocale' : 'Démarrer la dictée vocale'} aria-pressed={listening}
              className={`icon-btn ${listening ? '!text-red-500 !bg-red-500/10' : ''}`}>
              {listening ? <span className="mic-wave" aria-hidden="true"><i /><i /><i /><i /></span> : <Mic size={17} />}
            </button>
            {messages.length > 0 && (
              <>
                <button onClick={reset} aria-label="Nouvelle conversation" title="Vider la conversation" className="icon-btn"><RotateCcw size={16} /></button>
                <button onClick={exportMarkdown} aria-label="Exporter en Markdown" title="Exporter en Markdown" className="icon-btn hidden sm:inline-grid"><Download size={16} /></button>
                <button onClick={exportPrintable} aria-label="Imprimer / Exporter en PDF" title="Imprimer / PDF" className="icon-btn hidden sm:inline-grid"><Printer size={16} /></button>
              </>
            )}
            <div className="flex-1" />
            <AnimatePresence mode="wait" initial={false}>
              {loading ? (
                <motion.button key="stop" onClick={abort} aria-label="Arrêter la génération" title="Arrêter" className="send-btn btn-primary" initial={{ scale: 0.5, opacity: 0, rotate: -90 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0 }} transition={spring}><Square size={13} fill="currentColor" /></motion.button>
              ) : (
                <motion.button key="send" ref={sendBtnRef} onClick={send} disabled={!input.trim()} aria-label="Envoyer le message" className="send-btn btn-primary" initial={{ scale: 0.5, opacity: 0, rotate: 90 }} animate={{ scale: input.trim() ? 1 : 0.92, opacity: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0 }} whileTap={{ scale: 0.88 }} transition={spring}><Send size={16} /></motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="composer-note">ObedGPT peut commettre des erreurs. Vérifiez les informations importantes.</p>
      </div>
    </div>
  )
}

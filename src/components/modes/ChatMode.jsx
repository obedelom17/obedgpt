import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, RotateCcw, Mic, RefreshCw, Square, Pencil, Check, Download, Printer, ArrowDown, ArrowRight, Copy, Lightbulb, BookOpen, Code2, Sparkles, Volume2, X, Slash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../Logo'
import { MarkdownRenderer, ErrorBanner, ThinkingSkeleton } from '../ui'
import { useToast } from '../fx/Toast'
import { useStreamingChat } from '../../hooks/useApiCall'
import { useApp } from '../../App'

const BASE_SYSTEM_PROMPT = "Tu es ObedGPT, un assistant IA intelligent créé par Obed Elom AGBEBAVI. Si on te demande qui t'a créé/développé, réponds que c'est Obed Elom AGBEBAVI. Réponds dans la langue de l'utilisateur. Utilise LaTeX pour les maths : $...$ inline, $$...$$ pour les blocs."
const PERSONA_KEY = 'obedgpt-persona'
const PLACEHOLDERS = ['Expliquez-moi la récursivité avec un exemple...', 'Écris une fonction Python qui trie une liste...', 'Résous cette équation : 2x² − 5x + 2 = 0', 'Aide-moi à préparer un exposé sur le climat...', 'Traduis ce paragraphe en anglais...']
// Pose --mx/--my pour le halo qui suit le curseur (voir .spot dans index.css)
const trackPointer = e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`) }
const spring = { type: 'spring', stiffness: 380, damping: 30 }
const easeOut = [0.2, 0, 0, 1]

const SUGGESTIONS = [
  { text: 'Devine les questions du prof', icon: Lightbulb, sub: 'Préparer un examen' },
  { text: 'Fais mon exercice de maison', icon: BookOpen, sub: 'Résoudre pas à pas' },
  { text: 'Developpe moi une application', icon: Code2, sub: 'Générer du code complet' },
  { text: 'Traite moi ça', icon: Sparkles, sub: 'Analyser et résumer' },
]

// Commandes rapides : tape « / » au début du message pour insérer un modèle.
const SLASH = [
  { cmd: '/resume',    hint: 'Résumer un texte en points clés',           tpl: 'Résume ce texte en 5 points clés :\n\n' },
  { cmd: '/traduire',  hint: 'Traduire vers l\'anglais',                  tpl: 'Traduis en anglais le texte suivant :\n\n' },
  { cmd: '/expliquer', hint: 'Expliquer simplement, avec un exemple',      tpl: 'Explique simplement, avec un exemple concret :\n\n' },
  { cmd: '/corriger',  hint: 'Corriger orthographe et grammaire',          tpl: 'Corrige l\'orthographe et la grammaire sans changer le sens :\n\n' },
  { cmd: '/code',      hint: 'Écrire un programme complet',                tpl: 'Écris le code complet pour : ' },
  { cmd: '/plan',      hint: 'Construire un plan détaillé',                tpl: 'Prépare un plan détaillé pour : ' },
]

// On n'envoie jamais TOUT l'historique au modèle : au-delà d'un certain
// nombre de messages, le coût en tokens d'un tour exploserait. Le serveur
// applique la même limite en garde-fou.
const MAX_CONTEXT_MESSAGES = 16

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Bonne nuit.'
  if (h < 12) return 'Bonjour.'
  if (h < 18) return 'Bon après-midi.'
  return 'Bonsoir.'
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// Texte « lisible » pour la synthèse vocale : on retire blocs de code et symboles Markdown.
function toSpeakable(md) {
  return md.replace(/```[\s\S]*?```/g, ' (extrait de code) ').replace(/[`*_#>|~]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim()
}

function RotatingPlaceholder({ hidden }) {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI(n => (n + 1) % PLACEHOLDERS.length), 3600); return () => clearInterval(t) }, [])
  return (
    <AnimatePresence mode="wait">
      {!hidden && (
        <motion.span key={i} className="ph" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.26 }}>
          {PLACEHOLDERS[i]}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

export default function ChatMode() {
  const { activeChatId, tempMode, saveConversation, history, setBusy } = useApp()
  const toast = useToast()
  const savedConv = activeChatId ? history.find(c => c.id === activeChatId) : null

  const [messages, setMessages] = useState(() => savedConv?.messages || [])
  const [input, setInput] = useState('')
  const [systemPrompt] = useState(() => {
    const persona = localStorage.getItem(PERSONA_KEY)
    return persona ? `${BASE_SYSTEM_PROMPT}\n\nInstructions supplémentaires de l'utilisateur : ${persona}` : BASE_SYSTEM_PROMPT
  })
  const [fileError, setFileError] = useState(null)
  const [listening, setListening] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [speakingIdx, setSpeakingIdx] = useState(null)
  const [slashIdx, setSlashIdx] = useState(0)
  const { loading, error, call, retry, clearError, abort } = useStreamingChat()
  const bottomRef = useRef(null)
  const recognitionRef = useRef(null)
  const inputRef = useRef(null)
  const heroGreeting = useMemo(greeting, [])

  // Menu des commandes « / »
  const slashMatches = useMemo(() => {
    if (!/^\/[a-zé]*$/i.test(input)) return []
    return SLASH.filter(s => s.cmd.startsWith(input.toLowerCase()))
  }, [input])
  useEffect(() => { setSlashIdx(0) }, [input])

  // Auto-save des conversations non temporaires
  useEffect(() => {
    if (!tempMode && activeChatId && messages.length > 0) {
      const title = messages[0].content.slice(0, 50) || 'Nouvelle conversation'
      saveConversation(activeChatId, title, messages)
    }
  }, [messages, activeChatId, tempMode, saveConversation])

  useEffect(() => { setBusy(loading); return () => setBusy(false) }, [loading, setBusy])

  // Hauteur du champ de saisie (aussi après insertion d'un modèle)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 170) + 'px'
  }, [input])

  // Défilement intelligent : on suit le texte seulement si l'utilisateur est
  // déjà en bas, avec un bouton pour redescendre.
  const scrollRef = useRef(null)
  const stickRef = useRef(true)
  const [showFab, setShowFab] = useState(false)
  const progRef = useRef(null)
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    progRef.current?.style.setProperty('--p', max > 0 ? String(el.scrollTop / max) : '0')
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

  // Coupe proprement dictée et lecture si le composant est démonté.
  useEffect(() => () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel() }, [])

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

  // Lecture à voix haute d'une réponse (synthèse vocale du navigateur).
  const toggleSpeak = (i, text) => {
    const synth = window.speechSynthesis
    if (!synth) { setFileError("La synthèse vocale n'est pas supportée par ce navigateur."); return }
    if (speakingIdx === i) { synth.cancel(); setSpeakingIdx(null); return }
    synth.cancel()
    const utt = new SpeechSynthesisUtterance(toSpeakable(text))
    const fr = synth.getVoices().find(v => v.lang.startsWith('fr'))
    if (fr) utt.voice = fr
    utt.lang = fr?.lang || 'fr-FR'
    utt.onend = () => setSpeakingIdx(null)
    utt.onerror = () => setSpeakingIdx(null)
    setSpeakingIdx(i)
    synth.speak(utt)
  }

  // Ajoute un message assistant vide puis le remplit au fil du streaming.
  // On mesure la durée de génération pour l'afficher sous la réponse.
  const appendAssistantStreamed = async (apiCallFn) => {
    const t0 = Date.now()
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
    else if (!data.aborted) {
      const ms = Date.now() - t0
      setMessages(prev => { const next = [...prev]; next[next.length - 1] = { ...next[next.length - 1], ms }; return next })
    }
    return data
  }

  const sendFromMessages = async (newMessages) => {
    // L'API ne reçoit que role + content (pas les champs internes comme `ms`).
    const contextWindow = newMessages.slice(-MAX_CONTEXT_MESSAGES).map(({ role, content }) => ({ role, content }))
    await appendAssistantStreamed(onChunk => call('/api/chat', { messages: contextWindow, systemPrompt }, onChunk))
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    window.speechSynthesis?.cancel(); setSpeakingIdx(null)
    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    await sendFromMessages(newMessages)
  }

  const handleRetry = async () => { await appendAssistantStreamed(onChunk => retry(onChunk)) }

  const regenerate = async () => {
    if (loading) return
    let end = messages.length
    while (end > 0 && messages[end - 1].role === 'assistant') end--
    const trimmed = messages.slice(0, end)
    if (trimmed.length === 0) return
    setMessages(trimmed)
    await sendFromMessages(trimmed)
  }

  const startEdit = (i) => { if (loading) return; setEditingIndex(i); setEditValue(messages[i].content) }
  const cancelEdit = () => { setEditingIndex(null); setEditValue('') }
  const saveEdit = async () => {
    const text = editValue.trim()
    if (!text) return
    const trimmed = [...messages.slice(0, editingIndex), { role: 'user', content: text }]
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
    if (!win) { setFileError("Le navigateur a bloqué la fenêtre d'impression (pop-up)."); return }
    const body = messages.map(m =>
      `<div class="msg ${m.role}"><strong>${m.role === 'user' ? 'Vous' : 'ObedGPT'}</strong><div>${escapeHtml(m.content).replace(/\n/g, '<br/>')}</div></div>`
    ).join('')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>ObedGPT — Conversation</title><style>
      body{font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:2rem auto;color:#121714;line-height:1.6;padding:0 1rem}
      h2{font-family:Georgia,serif}
      .msg{margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid #e3e5df}
      .msg.user strong{color:#0e7a5c} .msg.assistant strong{color:#121714}
      strong{display:block;margin-bottom:.25rem;font-size:.8rem;text-transform:uppercase;letter-spacing:.03em}
    </style></head><body><h2>Conversation ObedGPT</h2>${body}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  const pickSlash = (s) => { setInput(s.tpl); setTimeout(() => inputRef.current?.focus(), 0) }

  const onKeyDown = e => {
    if (slashMatches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(i => (i + 1) % slashMatches.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIdx(i => (i - 1 + slashMatches.length) % slashMatches.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickSlash(slashMatches[slashIdx]); return }
      if (e.key === 'Escape') { e.preventDefault(); setInput(''); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }
  const reset = () => { window.speechSynthesis?.cancel(); setSpeakingIdx(null); setMessages([]); clearError(); setFileError(null); cancelEdit() }

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !loading
  const fmtMs = ms => ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace('.', ',')} s`

  return (
    <div className="flex flex-col h-full relative">
      {messages.length > 0 && <div ref={progRef} className="read-progress" aria-hidden="true" />}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-5">
        <div className="chat-col space-y-7 min-h-full flex flex-col">
          {messages.length === 0 && !loading && (
            <div className="my-auto py-8">
              <motion.div className="mb-9 logo-halo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}><Logo size={60} animated /></motion.div>
              <h2 className="hero-title" aria-label={`${heroGreeting} Par quoi commencer ?`}>
                <span className="line-mask"><motion.span className="block" initial={{ y: '108%' }} animate={{ y: 0 }} transition={{ delay: 0.35, duration: 0.7, ease: easeOut }}>{heroGreeting}</motion.span></span>
                <span className="line-mask soft"><motion.span className="block" initial={{ y: '108%' }} animate={{ y: 0 }} transition={{ delay: 0.47, duration: 0.7, ease: easeOut }}>Par quoi commencer ?</motion.span></span>
              </h2>
              {tempMode && <p className="mt-4 text-sm text-ink3">Mode temporaire actif : cette conversation ne sera pas sauvegardée.</p>}
              <div className="bento mt-10">
                {SUGGESTIONS.map(({ text, icon: Icon, sub }, i) => (
                  <motion.button key={text} className="bento-card spot" onMouseMove={trackPointer} onClick={() => { setInput(text); inputRef.current?.focus() }}
                    initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.8 + i * 0.09, duration: 0.6, ease: easeOut }}>
                    <span className="b-ico"><Icon size={17} /></span>
                    <span className="min-w-0">
                      <span className="b-title">{text}</span>
                      <span className="b-sub">{sub}</span>
                    </span>
                    <ArrowRight size={16} className="b-go" />
                  </motion.button>
                ))}
              </div>
              <motion.div className="hero-hints mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
                <span className="hidden sm:flex items-center gap-1.5"><kbd className="fx-kbd">/</kbd> commandes rapides</span>
                <span className="hidden sm:flex items-center gap-1.5"><kbd className="fx-kbd">Maj</kbd>+<kbd className="fx-kbd">Entrée</kbd> nouvelle ligne</span>
                <span className="hidden sm:flex items-center gap-1.5"><kbd className="fx-kbd">Ctrl K</kbd> palette</span>
              </motion.div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1
            const isEditing = editingIndex === i
            const isUser = msg.role === 'user'
            const streamingThis = loading && isLast && !isUser
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className={`flex gap-3 group ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && <div className="avatar-wrap mt-0.5"><Logo size={28} thinking={streamingThis && !msg.content} /></div>}
                <div className={`min-w-0 ${isUser ? 'max-w-[86%]' : 'flex-1'}`}>
                  {isEditing ? (
                    <div className="message-user">
                      <textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={3} autoFocus aria-label="Modifier le message" className="w-full bg-transparent text-sm text-ink outline-none resize-none" />
                      <div className="flex gap-2 justify-end mt-2">
                        <button onClick={cancelEdit} className="text-xs text-ink2 hover:text-ink px-2.5 py-1 rounded-lg">Annuler</button>
                        <button onClick={saveEdit} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}><Check size={12} /> Renvoyer</button>
                      </div>
                    </div>
                  ) : (
                    <div className={isUser ? 'message-user' : streamingThis ? 'streaming' : ''}>
                      {isUser
                        ? <p className="text-[.95rem] break-words whitespace-pre-wrap">{msg.content}</p>
                        : (msg.content ? <MarkdownRenderer content={msg.content} /> : <ThinkingSkeleton />)}
                    </div>
                  )}
                  {!isEditing && isUser && (
                    <div className="flex justify-end mt-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(i)} aria-label="Modifier ce message" className="mini-action"><Pencil size={11} /> Modifier</button>
                    </div>
                  )}
                  {!isEditing && !isUser && msg.content && !streamingThis && (
                    <div className="flex items-center gap-0.5 mt-1.5 -ml-2 flex-wrap">
                      <button onClick={() => copyMessage(msg.content)} aria-label="Copier cette réponse" className="mini-action"><Copy size={12} /> Copier</button>
                      <button onClick={() => toggleSpeak(i, msg.content)} aria-label={speakingIdx === i ? 'Arrêter la lecture' : 'Lire à voix haute'} aria-pressed={speakingIdx === i} className="mini-action">
                        {speakingIdx === i ? <Square size={11} fill="currentColor" /> : <Volume2 size={12} />} {speakingIdx === i ? 'Arrêter' : 'Écouter'}
                      </button>
                      {isLast && lastIsAssistant && <button onClick={regenerate} aria-label="Régénérer cette réponse" className="mini-action"><RefreshCw size={12} /> Régénérer</button>}
                      {msg.ms != null && <span className="meta-time" title="Durée de génération">{fmtMs(msg.ms)}</span>}
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
          <div className="chat-col pb-2"><p className="text-xs text-danger flex items-center justify-between">{fileError}
            <button onClick={() => setFileError(null)} aria-label="Fermer ce message" className="text-ink3 hover:text-ink ml-2"><X size={12} /></button></p></div>
        )}
        <div className={`composer ${loading ? 'busy' : ''}`}>
          <span className="progress" />
          <AnimatePresence>
            {slashMatches.length > 0 && (
              <motion.div className="slash-menu" role="listbox" aria-label="Commandes rapides" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}>
                {slashMatches.map((s, i) => (
                  <button key={s.cmd} role="option" aria-selected={i === slashIdx} className={`slash-item ${i === slashIdx ? 'sel' : ''}`} onMouseMove={() => setSlashIdx(i)} onMouseDown={e => { e.preventDefault(); pickSlash(s) }}>
                    <span className="cmd">{s.cmd}</span><span className="hint">{s.hint}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative">
            <RotatingPlaceholder hidden={!!input || loading} />
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} rows={1} disabled={loading} aria-label="Message à envoyer"
              style={{ minHeight: '46px', maxHeight: '170px' }} />
          </div>
          <div className="flex items-center gap-0.5 px-0.5 pt-0.5">
            <button onClick={toggleDictation} title={listening ? 'Arrêter la dictée' : 'Dicter un message'} aria-label={listening ? 'Arrêter la dictée vocale' : 'Démarrer la dictée vocale'} aria-pressed={listening}
              className="icon-btn" style={listening ? { color: 'var(--danger)', background: 'var(--surface-2)' } : undefined}>
              {listening ? <span className="mic-wave" aria-hidden="true"><i /><i /><i /><i /></span> : <Mic size={17} />}
            </button>
            <button onClick={() => { setInput('/'); inputRef.current?.focus() }} title="Commandes rapides" aria-label="Ouvrir les commandes rapides" className="icon-btn hidden sm:inline-grid"><Slash size={16} /></button>
            {messages.length > 0 && (
              <>
                <button onClick={reset} aria-label="Vider la conversation" title="Vider la conversation" className="icon-btn"><RotateCcw size={16} /></button>
                <button onClick={exportMarkdown} aria-label="Exporter en Markdown" title="Exporter en Markdown" className="icon-btn hidden sm:inline-grid"><Download size={16} /></button>
                <button onClick={exportPrintable} aria-label="Imprimer / Exporter en PDF" title="Imprimer / PDF" className="icon-btn hidden sm:inline-grid"><Printer size={16} /></button>
              </>
            )}
            <div className="flex-1" />
            <AnimatePresence mode="wait" initial={false}>
              {loading ? (
                <motion.button key="stop" onClick={abort} aria-label="Arrêter la génération" title="Arrêter" className="send-btn btn-primary" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={spring}><Square size={13} fill="currentColor" /></motion.button>
              ) : (
                <motion.button key="send" onClick={send} disabled={!input.trim()} aria-label="Envoyer le message" className="send-btn btn-primary" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} whileTap={{ scale: 0.88 }} transition={spring}><Send size={16} /></motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="composer-note">ObedGPT peut commettre des erreurs. Vérifiez les informations importantes.</p>
      </div>
    </div>
  )
}

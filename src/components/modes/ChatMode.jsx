import { useState, useRef, useEffect } from 'react'
import { Send, RotateCcw, User, Zap, FileText, X, Paperclip, Image as ImageIcon, Mic, RefreshCw, Square, Pencil, Check, Download, Printer, ArrowDown, Copy, Lightbulb, BookOpen, Code2, Sparkles, Eye, Volume2, Calculator, FileDown } from 'lucide-react'
import Logo from '../Logo'
import { MarkdownRenderer, ErrorBanner, ThinkingSkeleton } from '../ui'
import { useToast } from '../fx/Toast'
import { useStreamingChat } from '../../hooks/useApiCall'
import { useApp } from '../../App'

const BASE_SYSTEM_PROMPT = "Tu es ObedGPT, un assistant IA intelligent créé par Obed Elom AGBEBAVI. Si on te demande qui t'a créé/développé, réponds que c'est Obed Elom AGBEBAVI. Réponds dans la langue de l'utilisateur. Utilise LaTeX pour les maths : $...$ inline, $$...$$ pour les blocs."
const PERSONA_KEY = 'obedgpt-persona'

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
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-4">
        <div className="chat-col space-y-6 min-h-full flex flex-col">
          {messages.length === 0 && !loading && (
            <div className="my-auto py-6 text-center">
              <Logo size={44} className="mx-auto mb-5" />
              <h2 className="text-2xl md:text-[1.75rem] font-semibold tracking-tight text-stone-800">Comment puis-je vous aider ?</h2>
              <p className="mt-2 text-sm text-stone-500 max-w-md mx-auto">Posez une question, joignez un fichier ou dictez votre message.</p>
              {tempMode && <p className="mt-3 text-xs text-stone-500">Mode temporaire actif : cette conversation ne sera pas sauvegardée.</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-8 text-left">
                {SUGGESTIONS.map(({ text, icon: Icon, sub }) => (
                  <button key={text} className="suggestion" onClick={() => { setInput(text); inputRef.current?.focus() }}>
                    <span className="ico"><Icon size={16} /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-stone-800">{text}</span>
                      <span className="block text-xs text-stone-400 mt-0.5">{sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1
            const isEditing = editingIndex === i
            const isUser = msg.role === 'user'
            return (
              <div key={i} className={`msg-in flex gap-3 group ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && <Logo size={28} className="avatar-ai mt-0.5" />}
                <div className={`min-w-0 ${isUser ? 'max-w-[85%]' : 'flex-1'}`}>
                  {isEditing ? (
                    <div className="message-user">
                      <textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={3} autoFocus aria-label="Modifier le message"
                        className="w-full bg-transparent text-sm text-stone-800 outline-none resize-none" />
                      <div className="flex gap-2 justify-end mt-2">
                        <button onClick={cancelEdit} className="btn-ghost !min-h-0 !py-1 !px-2.5 text-xs">Annuler</button>
                        <button onClick={saveEdit} className="btn-primary !min-h-0 !py-1 !px-2.5 text-xs"><Check size={12} /> Renvoyer</button>
                      </div>
                    </div>
                  ) : (
                    <div className={isUser ? 'message-user' : 'message-ai'}>
                      {isUser
                        ? <p className="text-sm text-stone-800 break-words whitespace-pre-wrap">{msg.content}</p>
                        : (msg.content ? <MarkdownRenderer content={msg.content} /> : <ThinkingSkeleton />)}
                    </div>
                  )}
                  {!isEditing && isUser && (
                    <div className="flex justify-end mt-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(i)} aria-label="Modifier ce message" className="mini-action"><Pencil size={11} /> Modifier</button>
                    </div>
                  )}
                  {!isEditing && !isUser && loading && isLast && msg.content && <span className="typing mt-1" aria-label="Génération en cours"><i /><i /><i /></span>}
                  {!isEditing && !isUser && msg.content && !(loading && isLast) && (
                    <div className="flex items-center gap-1 mt-1 -ml-1">
                      <button onClick={() => copyMessage(msg.content)} aria-label="Copier cette réponse" className="mini-action"><Copy size={12} /> Copier</button>
                      {isLast && lastIsAssistant && <button onClick={regenerate} aria-label="Régénérer cette réponse" className="mini-action"><RefreshCw size={12} /> Régénérer</button>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <button className={`scroll-fab ${showFab ? 'show' : ''}`} style={{ bottom: '8.5rem' }} onClick={() => scrollToBottom(true)} aria-label="Aller en bas de la conversation" tabIndex={showFab ? 0 : -1}><ArrowDown size={16} /></button>

      {error && <div className="px-4 md:px-6 pb-2 chat-col"><ErrorBanner error={error} onDismiss={clearError} onRetry={handleRetry} /></div>}

      <div className="composer-wrap">
        {attachedFiles.length > 0 && (
          <div className="chat-col flex flex-wrap gap-2 pb-2">
            {attachedFiles.map((file, i) => (
              <div key={i} className="chip text-stone-600">
                {isImage(file.type) ? <ImageIcon size={12} /> : <FileText size={12} />}
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button onClick={() => removeFile(i)} aria-label={`Retirer ${file.name}`} className="hover:text-red-500"><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        {fileError && (
          <div className="chat-col pb-2"><p className="text-xs text-red-500 flex items-center justify-between">{fileError}
            <button onClick={() => setFileError(null)} aria-label="Fermer ce message" className="text-stone-400 hover:text-stone-600 ml-2"><X size={12} /></button></p></div>
        )}
        <div className="composer">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*,.pdf,.txt,.csv,.json,.doc,.docx" className="hidden" aria-hidden="true" />
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} onPaste={handlePaste} rows={1} disabled={loading}
            placeholder="Écrivez votre message..." aria-label="Message à envoyer" className="input-field text-sm" style={{ minHeight: '44px', maxHeight: '160px' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px' }} />
          <div className="flex items-center gap-0.5 px-0.5 pt-0.5">
            <button onClick={() => fileInputRef.current?.click()} aria-label="Joindre un fichier" title="Joindre un fichier" className="icon-btn"><Paperclip size={17} /></button>
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
            {loading ? (
              <button onClick={abort} aria-label="Arrêter la génération" title="Arrêter" className="send-btn btn-primary"><Square size={13} fill="currentColor" /></button>
            ) : (
              <button ref={sendBtnRef} onClick={send} disabled={!input.trim() && attachedFiles.length === 0} aria-label="Envoyer le message" className="send-btn btn-primary"><Send size={16} /></button>
            )}
          </div>
        </div>
        <p className="composer-note">ObedGPT peut commettre des erreurs. Vérifiez les informations importantes.</p>
      </div>
    </div>
  )
}

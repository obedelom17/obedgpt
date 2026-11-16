import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, RotateCcw, Mic, RefreshCw, ChevronLeft, ChevronRight, Square, Pencil, Check, Download, Printer, ArrowDown, ArrowRight, Copy, Lightbulb, BookOpen, Code2, Sparkles, Volume2, X, Slash, SlidersHorizontal, ImagePlus, Globe, Terminal, Wrench, Brain, ChevronDown, ExternalLink, Loader2, Braces, Share2, FileText, Paintbrush } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../Logo'
import { MarkdownRenderer, ErrorBanner, ThinkingSkeleton } from '../ui'
import { useToast } from '../fx/Toast'
import { useStreamingChat } from '../../hooks/useApiCall'
import { useApp } from '../../App'
import GenerationPanel from '../chat/GenerationPanel'
import ShareDialog from '../chat/ShareDialog'
import DocsDialog from '../chat/DocsDialog'
import { useDocs, importDocs, removeDoc } from '../../lib/docs/useDocs'
import { getActiveIds, setActiveIds } from '../../lib/docs/store'
import { buildDocContext } from '../../lib/docs/query'
import { isImageFile } from '../../lib/docs/extract'
import { tr } from '../../i18n'
import { Chip } from '../ui/controls'
import { usePrefs } from '../../lib/prefs'
import { postJson } from '../../lib/api'
import { recordMic, toWavChunks, imageToDataUrls } from '../../lib/audio'
import { transcribeBlob } from '../../lib/api'
import { speakText } from '../../lib/speaker'
import { detectImageIntent } from '../../lib/imageIntent'
import { newImageId, saveImage, getImage } from '../../lib/gallery'

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
  { cmd: '/image',     hint: 'Générer une image (Flux)',                   tpl: '/image ' },
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

// Image générée : affichée depuis le message, ou relue depuis la galerie (IndexedDB) après rechargement.
function GenImage({ src, id, alt, name, onText }) {
  const [url, setUrl] = useState(src || '')
  const [gone, setGone] = useState(false)
  useEffect(() => { if (!src && id) getImage(id).then(r => (r?.data ? setUrl(r.data) : setGone(true))) }, [src, id])
  if (gone) return <p className="text-sm text-ink3">Image supprimée de la galerie.</p>
  if (!url) return <div className="skeleton-line" style={{ width: 320, height: 320, borderRadius: 16 }} />
  return (
    <figure className="gen-image">
      <img src={url} alt={alt} />
      <div className="flex gap-2 flex-wrap">
        <a href={url} download={name} className="mini-action"><Download size={12} /> Télécharger</a>
        {onText && <button onClick={onText} className="mini-action">Répondre par texte</button>}
      </div>
    </figure>
  )
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
  const [prefs, setPrefs] = usePrefs()
  const [panelOpen, setPanelOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(null) // { messages, scope }
  // Documents importés (bibliothèque partagée) et documents actifs pour CETTE conversation
  const { docs } = useDocs()
  const [docsOpen, setDocsOpen] = useState(false)
  const [activeDocIds, setActiveDocIds] = useState(() => (activeChatId ? getActiveIds(activeChatId) : []))
  const [docStatus, setDocStatus] = useState('')
  const [docErrors, setDocErrors] = useState([])
  const [preparing, setPreparing] = useState(false)
  const lastDocRef = useRef(null)
  const activeDocs = docs.filter(d => activeDocIds.includes(d.id))
  useEffect(() => { setActiveDocIds(activeChatId ? getActiveIds(activeChatId) : []) }, [activeChatId])
  useEffect(() => { if (activeChatId) setActiveIds(activeChatId, activeDocIds) }, [activeChatId, activeDocIds])
  const [attachments, setAttachments] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [speakState, setSpeakState] = useState('idle')
  const [agentBusy, setAgentBusy] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)
  const [agentError, setAgentError] = useState(null)
  const speakerRef = useRef(null)
  const recorderRef = useRef(null)
  const agentAbort = useRef(null)
  const fileInputRef = useRef(null)
  const { loading: streaming, error: streamError, call, retry, clearError: clearStreamError, abort: abortStream } = useStreamingChat()
  const loading = streaming || agentBusy || preparing || imgBusy
  const error = streamError || agentError
  const clearError = () => { clearStreamError(); setAgentError(null) }
  const abort = () => { abortStream(); agentAbort.current?.abort() }
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
      const title = messages[0].content.slice(0, 50) || (messages[0].images?.length ? 'Analyse d\'image' : 'Nouvelle conversation')
      saveConversation(activeChatId, title, messages.map(({ fullImages, genImage, ...m }) => m))
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

  // Coupe proprement micro et lecture si le composant est démonté.
  useEffect(() => () => { recorderRef.current?.cancel(); speakerRef.current?.stop(); window.speechSynthesis?.cancel(); agentAbort.current?.abort() }, [])

  // Dictée : enregistrement micro (arrêt automatique au silence) puis Whisper.
  const toggleDictation = async () => {
    if (listening) { recorderRef.current?.stop(); return }
    if (transcribing) return
    try {
      const rec = await recordMic({ vad: true })
      recorderRef.current = rec; setListening(true)
      const { blob, heard } = await rec.done
      setListening(false)
      if (!heard) { toast('Aucune voix détectée'); return }
      setTranscribing(true)
      const { chunks } = await toWavChunks(blob, 100)
      let text = ''
      for (const c of chunks) { const r = await transcribeBlob(c.blob, { language: prefs.sttLanguage }); text += (text ? ' ' : '') + r.text.trim() }
      if (text.trim()) { setInput(prev => (prev ? prev + ' ' : '') + text.trim()); setTimeout(() => inputRef.current?.focus(), 0) }
      else toast('Rien compris, réessaie')
    } catch (e) { setListening(false); setFileError(e.message || 'Micro indisponible.') }
    finally { setTranscribing(false); recorderRef.current = null }
  }

  // Lecture à voix haute d'une réponse : Groq Orpheus ou navigateur.
  const toggleSpeak = (i, text) => {
    if (speakingIdx === i) { speakerRef.current?.stop(); setSpeakingIdx(null); setSpeakState('idle'); return }
    speakerRef.current?.stop()
    setSpeakingIdx(i); setSpeakState('loading')
    speakerRef.current = speakText(text, prefs, (st, msg) => {
      if (st === 'end') { setSpeakingIdx(cur => (cur === i ? null : cur)); setSpeakState('idle') }
      else if (st === 'fallback') toast('Voix Groq indisponible, voix du navigateur utilisée')
      else setSpeakState(st)
    })
  }

  // Images : sélection, collage, glisser-déposer (compressées avant envoi).
  const addImages = async files => {
    const imgs = [...files].filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    try {
      const room = 3 - attachments.length
      const done = await Promise.all(imgs.slice(0, Math.max(0, room)).map(f => imageToDataUrls(f)))
      setAttachments(a => [...a, ...done])
      if (imgs.length > room) toast('3 images maximum par message')
    } catch (e) { setFileError(e.message) }
  }
  const onPaste = e => { const f = [...(e.clipboardData?.files || [])]; if (f.some(x => x.type.startsWith('image/'))) { e.preventDefault(); addImages(f) } }
  const handleDocFiles = async files => {
    if (!files.length || docStatus) return
    setDocErrors([]); setDocStatus('Lecture des fichiers…')
    const { added, errors } = await importDocs(files, { onStatus: setDocStatus })
    setDocStatus(''); setDocErrors(errors)
    if (added.length) { setActiveDocIds(ids => [...new Set([...ids, ...added.map(d => d.id)])]); toast(`${added.length} document${added.length > 1 ? 's' : ''} prêt${added.length > 1 ? 's' : ''}`) }
    if (errors.length && !docsOpen) setFileError(errors[0])
  }
  const toggleDoc = id => setActiveDocIds(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))
  const onDrop = e => {
    e.preventDefault(); setDragOver(false)
    const files = [...e.dataTransfer.files]
    addImages(files.filter(isImageFile)); handleDocFiles(files.filter(f => !isImageFile(f)))
  }

  // Ajoute un message assistant vide puis le remplit au fil du flux
  // (texte, raisonnement, sources, utilisation). Mesure la durée de génération.
  const patchLast = fn => setMessages(prev => { const next = [...prev]; next[next.length - 1] = fn(next[next.length - 1]); return next })
  const appendAssistantStreamed = async (apiCallFn, extra) => {
    const t0 = Date.now()
    setMessages(prev => [...prev, { role: 'assistant', content: '', ...(extra || {}) }])
    const handlers = {
      onChunk: d => patchLast(m => ({ ...m, content: m.content + d })),
      onReasoning: d => patchLast(m => ({ ...m, reasoning: (m.reasoning || '') + d })),
      onMeta: v => patchLast(m => ({ ...m, model: v.model, features: v.features })),
      onTools: v => patchLast(m => ({ ...m, tools: v })),
      onUsage: v => patchLast(m => ({ ...m, usage: v })),
    }
    const data = await apiCallFn(handlers)
    if (!data) setMessages(prev => prev.slice(0, -1))
    else if (!data.aborted) {
      patchLast(m => ({ ...m, ms: Date.now() - t0 }))
      if (prefs.autoSpeak && data.text) setTimeout(() => toggleSpeak(-1, data.text), 50)
    }
    return data
  }

  // Seule la dernière image envoyée repart au modèle (limite de 5 images et de poids).
  const toApiMessages = list => {
    const lastImg = list.map(m => !!m.fullImages?.length).lastIndexOf(true)
    return list.slice(-MAX_CONTEXT_MESSAGES).map((m, idx, arr) => {
      const abs = list.length - arr.length + idx
      if (abs === lastImg) return { role: m.role, content: [{ type: 'text', text: m.content || 'Analyse cette image.' }, ...m.fullImages.map(u => ({ type: 'image_url', image_url: { url: u } }))] }
      return { role: m.role, content: m.content + (m.images?.length && abs !== lastImg ? '\n[image jointe précédemment]' : '') }
    })
  }
  const genOptions = () => ({ model: prefs.model === 'auto' ? undefined : prefs.model, reasoning: prefs.reasoning === 'off' ? undefined : prefs.reasoning, temperature: prefs.temperature, maxTokens: prefs.maxTokens, webSearch: prefs.webSearch, codeExec: prefs.codeExec, json: prefs.jsonMode })

  const runAgent = async (list, extra = {}) => {
    const t0 = Date.now(); const ac = new AbortController(); agentAbort.current = ac
    setAgentBusy(true); setAgentError(null)
    try {
      const data = await postJson('/api/agent', { messages: toApiMessages(list), systemPrompt, model: genOptions().model, temperature: prefs.temperature, maxTokens: prefs.maxTokens, mcpServers: prefs.mcpServers.filter(s => s.url), ...extra }, ac.signal)
      setMessages(prev => [...prev, { role: 'assistant', content: data.text, steps: data.steps, model: data.model, ms: Date.now() - t0, ...(extra.context ? { sources: lastDocRef.current?.sources, docMode: lastDocRef.current?.mode } : {}) }])
      if (prefs.autoSpeak && data.text) setTimeout(() => toggleSpeak(-1, data.text), 50)
    } catch (e) { if (e.name !== 'AbortError') setAgentError(e.message) }
    finally { setAgentBusy(false) }
  }

  // Contexte tiré des documents actifs (lecture complète ou meilleurs passages).
  const prepareDocs = async list => {
    lastDocRef.current = null
    if (!activeDocs.length) return null
    const question = [...list].reverse().find(m => m.role === 'user')?.content || ''
    setPreparing(true)
    try { lastDocRef.current = await buildDocContext({ docs: activeDocs, question, depth: prefs.docDepth, onStatus: setDocStatus }) }
    catch { lastDocRef.current = null } finally { setPreparing(false); setDocStatus('') }
    return lastDocRef.current
  }
  const docExtra = d => (d ? { sources: d.sources, docMode: d.mode } : undefined)

  const sendFromMessages = async (newMessages) => {
    const d = await prepareDocs(newMessages)
    const ctx = d ? { context: d.context } : {}
    if (prefs.agent) return runAgent(newMessages, ctx)
    await appendAssistantStreamed(h => call('/api/chat', { messages: toApiMessages(newMessages), systemPrompt, ...genOptions(), ...ctx }, h), docExtra(d))
  }

  // /image <description> : génération d'image (Cloudflare Workers AI)
  const generateImage = async (prompt, list, auto = false) => {
    setImgBusy(true)
    try {
      const data = await postJson('/api/image', { prompt })
      const genId = newImageId()
      saveImage({ id: genId, prompt, data: data.image })
      setMessages([...list, { role: 'assistant', content: `Image générée : ${prompt}`, genImage: data.image, genId, genPrompt: data.prompt, ...(auto ? { genAuto: true } : {}) }])
    } catch (e) { setFileError(e.message) } finally { setImgBusy(false) }
  }

  // « Ce n'était pas une demande d'image » : on relance la même question en réponse texte.
  const answerAsText = async i => {
    if (loading) return
    const list = messages.slice(0, i)
    setMessages(list)
    await sendFromMessages(list)
  }

  const send = async () => {
    const text = input.trim() || (attachments.length ? 'Analyse cette image.' : '')
    if (!text || loading) return
    const gen = /^\/image\s+([\s\S]{3,})$/i.exec(text)
    if (gen) {
      const list = [...messages, { role: 'user', content: text }]
      setMessages(list); setInput(''); setAttachments([])
      return generateImage(gen[1].trim(), list)
    }
    // Demande d'image en langage naturel (sans pièce jointe ni document actif, hors mode agent)
    const auto = prefs.autoImage && !prefs.agent && attachments.length === 0 && !(activeDocs?.length) ? detectImageIntent(text) : null
    if (auto) {
      const list = [...messages, { role: 'user', content: text }]
      setMessages(list); setInput('')
      return generateImage(auto, list, true)
    }
    speakerRef.current?.stop(); setSpeakingIdx(null)
    const imgs = attachments
    const newMessages = [...messages, { role: 'user', content: text, ...(imgs.length ? { images: imgs.map(a => a.thumb), fullImages: imgs.map(a => a.full) } : {}) }]
    setMessages(newMessages)
    setInput(''); setAttachments([])
    await sendFromMessages(newMessages)
  }

  const handleRetry = async () => { if (prefs.agent) { clearError(); return runAgent(messages, lastDocRef.current ? { context: lastDocRef.current.context } : {}) } await appendAssistantStreamed(h => retry(h), docExtra(lastDocRef.current)) }

  const regenerate = async () => {
    if (loading) return
    let end = messages.length
    while (end > 0 && messages[end - 1].role === 'assistant') end--
    const trimmed = messages.slice(0, end)
    if (trimmed.length === 0) return
    const prevMsg = messages[messages.length - 1]
    const { alts: prevAlts = [], altIdx: _i, ...prevFields } = prevMsg
    setMessages(trimmed)
    await sendFromMessages(trimmed)
    // Garde l'ancienne réponse comme variante (ou la restaure si la génération a échoué)
    setMessages(cur => {
      const last = cur[cur.length - 1]
      if (cur.length === trimmed.length + 1 && last?.role === 'assistant' && last.content) {
        const alts = [...prevAlts, prevFields].slice(-5)
        return [...cur.slice(0, -1), { ...last, alts, altIdx: alts.length }]
      }
      if (cur.length === trimmed.length) return [...cur, prevMsg]
      return cur
    })
  }

  // Bascule vers une autre variante de la réponse i (l'actuelle prend sa place dans la liste)
  const switchAlt = (i, k) => setMessages(cur => cur.map((m, j) => {
    if (j !== i || !m.alts?.length) return m
    const { alts, altIdx, ...rest } = m
    const all = alts.slice(); all.splice(altIdx, 0, rest)
    if (k < 0 || k >= all.length) return m
    const [chosen] = all.splice(k, 1)
    return { ...chosen, alts: all, altIdx: k }
  }))

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

  const pickSlash = (s) => { setInput(tr(s.tpl)); setTimeout(() => inputRef.current?.focus(), 0) }

  const onKeyDown = e => {
    if (slashMatches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(i => (i + 1) % slashMatches.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIdx(i => (i - 1 + slashMatches.length) % slashMatches.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickSlash(slashMatches[slashIdx]); return }
      if (e.key === 'Escape') { e.preventDefault(); setInput(''); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }
  const reset = () => { speakerRef.current?.stop(); window.speechSynthesis?.cancel(); setSpeakingIdx(null); setMessages([]); setAttachments([]); clearError(); setFileError(null); cancelEdit() }

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
                  <motion.button key={text} className="bento-card spot" onMouseMove={trackPointer} onClick={() => { setInput(tr(text)); inputRef.current?.focus() }}
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
                      {isUser && msg.images?.length > 0 && <div className="msg-images">{msg.images.map((u, k) => <img key={k} src={u} alt={`Image jointe ${k + 1}`} />)}</div>}
                      {isUser
                        ? <p className="text-[.95rem] break-words whitespace-pre-wrap">{msg.content}</p>
                        : <>
                            {msg.steps?.length > 0 && (
                              <div className="steps" aria-label="Outils utilisés">
                                {msg.steps.map((st, k) => <div key={k} className="step"><Wrench size={12} className="flex-shrink-0 translate-y-[1px]" /><b>{st.name}</b><span>{JSON.stringify(st.args)} → {typeof st.result === 'string' ? st.result : JSON.stringify(st.result)}</span></div>)}
                              </div>
                            )}
                            {msg.reasoning && (
                              <details className="reasoning" open={streamingThis && !msg.content}>
                                <summary><Brain size={14} /> {streamingThis && !msg.content ? 'Réflexion en cours…' : 'Raisonnement'}<ChevronDown size={14} className="chev" /></summary>
                                <div className="r-body">{msg.reasoning}</div>
                              </details>
                            )}
                            {(msg.genImage || msg.genId) && <GenImage src={msg.genImage} id={msg.genId} alt={msg.content} name={`obedgpt-image-${i}.jpg`} onText={msg.genAuto && isLast ? () => answerAsText(i) : null} />}
                            {msg.genImage || msg.genId ? null : msg.content ? <MarkdownRenderer content={msg.content} /> : (!msg.reasoning && <ThinkingSkeleton />)}
                            {msg.tools?.filter(t => t.code).map((t, k) => (
                              <details key={k} className="reasoning mt-3"><summary><Terminal size={14} /> Code exécuté<ChevronDown size={14} className="chev" /></summary>
                                <div className="px-3 pb-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}><MarkdownRenderer content={'```python\n' + t.code + '\n```' + (t.output ? '\n```text\n' + t.output + '\n```' : '')} /></div>
                              </details>
                            ))}
                            {msg.sources?.length > 0 && (
                              <div className="sources" aria-label="Sources des documents">
                                {msg.sources.slice(0, 12).map((s, k) => <span key={k} className="source doc-source" title={`${s.name} — ${s.ref}`}><FileText size={12} /><span>{s.name}</span><em>{s.ref}</em></span>)}
                                {msg.docMode && msg.docMode !== 'full' && <span className="source doc-source" title="Seuls certains passages ont été envoyés au modèle"><em>{msg.docMode === 'rag' ? 'extraits pertinents' : 'extraits répartis'}</em></span>}
                              </div>
                            )}
                            {msg.tools?.some(t => t.results?.length) && (
                              <div className="sources" aria-label="Sources web">
                                {[...new Map(msg.tools.flatMap(t => t.results || []).map(r => [r.url, r])).values()].slice(0, 8).map(r => {
                                  let host = r.url; try { host = new URL(r.url).hostname.replace(/^www\./, '') } catch {}
                                  return <a key={r.url} className="source" href={r.url} target="_blank" rel="noopener noreferrer" title={r.title}><Globe size={12} /><span>{host}</span><ExternalLink size={10} /></a>
                                })}
                              </div>
                            )}
                          </>}
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
                        {speakingIdx === i ? (speakState === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Square size={11} fill="currentColor" />) : <Volume2 size={12} />} {speakingIdx === i ? 'Arrêter' : 'Écouter'}
                      </button>
                      {msg.alts?.length > 0 && (
                        <span className="alt-nav" role="group" aria-label="Variantes de la réponse">
                          <button onClick={() => switchAlt(i, msg.altIdx - 1)} disabled={msg.altIdx === 0 || loading} aria-label="Variante précédente"><ChevronLeft size={13} /></button>
                          <span>{msg.altIdx + 1}/{msg.alts.length + 1}</span>
                          <button onClick={() => switchAlt(i, msg.altIdx + 1)} disabled={msg.altIdx === msg.alts.length || loading} aria-label="Variante suivante"><ChevronRight size={13} /></button>
                        </span>
                      )}
                      {isLast && lastIsAssistant && <button onClick={regenerate} aria-label="Régénérer cette réponse" className="mini-action"><RefreshCw size={12} /> Régénérer</button>}
                      <button onClick={() => setShareOpen({ messages: messages.slice(Math.max(0, i - 1), i + 1), scope: 'one' })} aria-label="Partager cet échange" className="mini-action"><Share2 size={12} /> Partager</button>
                      {msg.ms != null && <span className="meta-time" title="Durée de génération">{fmtMs(msg.ms)}</span>}
                      {msg.model && <span className="meta-time hidden sm:inline" title="Modèle utilisé">{msg.model.split('/').pop()}</span>}
                      {msg.usage?.total && <span className="meta-time hidden sm:inline" title="Tokens utilisés">{msg.usage.total} tok</span>}
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
        <div className={`composer relative ${loading ? 'busy' : ''}`} onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true) } }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
          <span className="progress" />
          {dragOver && <div className="drop-hint">Dépose tes images ici</div>}
          <AnimatePresence>{panelOpen && <GenerationPanel onClose={() => setPanelOpen(false)} />}</AnimatePresence>
          {attachments.length > 0 && (
            <div className="attach-strip">
              {attachments.map((a, k) => <div key={k} className="attach"><img src={a.thumb} alt={`Image ${k + 1}`} /><button onClick={() => setAttachments(list => list.filter((_, j) => j !== k))} aria-label="Retirer l'image">×</button></div>)}
            </div>
          )}
          {(activeDocs.length > 0 || docStatus) && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
              {activeDocs.map(d => <Chip key={d.id} tone="accent" title={d.name} onRemove={() => toggleDoc(d.id)}><FileText size={11} /> <span className="truncate max-w-[9.5rem]">{d.name}</span></Chip>)}
              {docStatus && <Chip tone="signal"><Loader2 size={11} className="animate-spin" /> {docStatus}</Chip>}
            </div>
          )}
          {(prefs.webSearch || prefs.codeExec || prefs.agent || prefs.jsonMode || prefs.reasoning !== 'off' || prefs.model !== 'auto') && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
              {prefs.model !== 'auto' && <Chip>{prefs.model.split('/').pop()}</Chip>}
              {prefs.webSearch && <Chip tone="accent"><Globe size={11} /> Web</Chip>}
              {prefs.codeExec && <Chip tone="accent"><Terminal size={11} /> Code</Chip>}
              {prefs.agent && <Chip tone="signal"><Wrench size={11} /> Agent</Chip>}
              {prefs.jsonMode && <Chip><Braces size={11} /> JSON</Chip>}
              {prefs.reasoning !== 'off' && <Chip><Brain size={11} /> {prefs.reasoning}</Chip>}
            </div>
          )}
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
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} onPaste={onPaste} rows={1} disabled={loading} aria-label="Message à envoyer"
              style={{ minHeight: '46px', maxHeight: '170px' }} />
          </div>
          <div className="flex items-center gap-0.5 px-0.5 pt-0.5">
            <button onClick={toggleDictation} title={listening ? 'Arrêter la dictée' : 'Dicter (Whisper)'} aria-label={listening ? 'Arrêter la dictée vocale' : 'Démarrer la dictée vocale'} aria-pressed={listening}
              className="icon-btn" style={listening ? { color: 'var(--danger)', background: 'var(--surface-2)' } : undefined}>
              {transcribing ? <Loader2 size={16} className="animate-spin" /> : listening ? <span className="mic-wave" aria-hidden="true"><i /><i /><i /><i /></span> : <Mic size={17} />}
            </button>
            <button onClick={() => setDocsOpen(true)} title="Documents : PDF, Word, Excel, PowerPoint…" aria-label="Joindre un document" className="icon-btn" style={activeDocs.length ? { color: 'var(--accent)' } : undefined}><FileText size={17} /></button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={e => { addImages(e.target.files); e.target.value = '' }} />
            <button onClick={() => fileInputRef.current?.click()} title="Joindre une image (vision)" aria-label="Joindre une image" className="icon-btn"><ImagePlus size={17} /></button>
            <button onClick={() => { setInput('/image '); inputRef.current?.focus() }} title="Générer une image" aria-label="Générer une image" className="icon-btn"><Paintbrush size={16} /></button>
            <button onClick={() => setPanelOpen(o => !o)} title="Réglages Groq : modèle, web, code, agent" aria-label="Ouvrir les réglages Groq" aria-expanded={panelOpen} className="icon-btn" style={panelOpen || prefs.webSearch || prefs.codeExec || prefs.agent ? { color: 'var(--accent)' } : undefined}><SlidersHorizontal size={16} /></button>
            <button onClick={() => { setInput('/'); inputRef.current?.focus() }} title="Commandes rapides" aria-label="Ouvrir les commandes rapides" className="icon-btn hidden sm:inline-grid"><Slash size={16} /></button>
            {messages.length > 0 && (
              <>
                <button onClick={() => setShareOpen({ messages, scope: 'all' })} aria-label="Partager la conversation" title="Partager par lien" className="icon-btn"><Share2 size={16} /></button>
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
                <motion.button key="send" onClick={send} disabled={!input.trim() && !attachments.length} aria-label="Envoyer le message" className="send-btn btn-primary" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} whileTap={{ scale: 0.88 }} transition={spring}><Send size={16} /></motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="composer-note">ObedGPT peut commettre des erreurs. Vérifiez les informations importantes.</p>
      </div>
      {docsOpen && <DocsDialog docs={docs} activeIds={activeDocIds} onToggle={toggleDoc} onImport={handleDocFiles} onDelete={id => { removeDoc(id); setActiveDocIds(ids => ids.filter(x => x !== id)) }} depth={prefs.docDepth} onDepth={v => setPrefs({ docDepth: v })} status={docStatus && !preparing ? docStatus : ''} errors={docErrors} onClose={() => setDocsOpen(false)} />}
      {shareOpen && <ShareDialog title={messages[0]?.content?.slice(0, 60)} messages={shareOpen.messages.map(({ role, content }) => ({ role, content }))} initialScope={shareOpen.scope} onClose={() => setShareOpen(null)} />}
    </div>
  )
}

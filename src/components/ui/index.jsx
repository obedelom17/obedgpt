import { useState, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, Upload, X, File, AlertTriangle, Clock, WifiOff, KeyRound, FileX, Cpu } from 'lucide-react'

export function classifyError(input) {
  if (!input) return null
  if (typeof input === 'object' && input.type) return input
  const msg = String(input)

  if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED')) {
    const match = msg.match(/retry in (\d+\.?\d*)s/i)
    return { type: '429', delay: match ? Math.ceil(parseFloat(match[1])) : 30 }
  }
  if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('overloaded'))
    return { type: '503', delay: 15 }
  if (msg.includes('401') || msg.includes('403') || msg.includes('API_KEY') || msg.includes('invalid authentication') || msg.includes('Invalid API Key'))
    return { type: 'auth', delay: 0 }
  if (msg.includes('413') || msg.includes('too large') || msg.includes('Request Entity Too Large'))
    return { type: '413', delay: 0 }
  if (msg.includes('quota') && (msg.includes('day') || msg.includes('exceeded')))
    return { type: 'quota', delay: 0 }
  if (msg.includes('context') || msg.includes('token_limit') || msg.includes('CONTEXT_WINDOW'))
    return { type: 'context', delay: 0 }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ECONNREFUSED'))
    return { type: 'network', delay: 5 }
  if (msg.includes('500') || msg.includes('Internal Server Error'))
    return { type: '500', delay: 10 }
  if (msg.includes('400') || msg.includes('Bad Request') || msg.includes('INVALID_ARGUMENT'))
    return { type: '400', delay: 0 }
  if (msg.includes('unsupported') || msg.includes('format') || msg.includes('invalid file'))
    return { type: 'format', delay: 0 }
  return { type: 'generic', delay: 0, raw: msg }
}

const ERROR_CONFIG = {
  '429':    { icon: Clock,         color: 'amber',  title: 'Quota par minute dépassé',              body: 'Patiente quelques secondes puis réessaie automatiquement.', retryable: true },
  '503':    { icon: WifiOff,       color: 'orange', title: 'Service momentanément surchargé',    body: "Forte demande en ce moment. Réessaie automatique dans quelques secondes.", retryable: true },
  'auth':   { icon: KeyRound,      color: 'red',    title: 'Clé API invalide',                   body: 'Vérifie GROQ_API_KEY et GEMINI_API_KEY dans Vercel → Settings → Environment Variables.', retryable: false },
  '413':    { icon: FileX,         color: 'red',    title: 'Fichier trop volumineux',            body: "Limite : ~25MB pour l'audio, ~10MB pour les images. Réduis la taille.", retryable: false },
  'quota':  { icon: AlertTriangle, color: 'red',    title: 'Quota journalier atteint',           body: 'Limite gratuite atteinte. Réessaie demain ou consulte console.groq.com.', retryable: false },
  'context':{ icon: Cpu,           color: 'amber',  title: 'Conversation trop longue',           body: 'Fenêtre de contexte dépassée. Commence une nouvelle conversation.', retryable: false },
  'network':{ icon: WifiOff,       color: 'red',    title: 'Erreur réseau',                      body: 'Vérifie ta connexion internet et réessaie.', retryable: true },
  '500':    { icon: AlertTriangle, color: 'red',    title: 'Erreur serveur interne',             body: 'Problème côté serveur. Réessaie dans quelques secondes.', retryable: true },
  '400':    { icon: AlertTriangle, color: 'red',    title: 'Requête invalide',                   body: 'Le fichier ou le format est incorrect. Essaie un autre fichier.', retryable: false },
  'format': { icon: FileX,         color: 'red',    title: 'Format non supporté',                body: "Ce format de fichier n'est pas accepté. Essaie JPG, PNG, MP3, WAV.", retryable: false },
  'generic':{ icon: AlertTriangle, color: 'red',    title: 'Erreur inattendue',                  body: null, retryable: false },
}

const COLOR_CLASSES = {
  amber:  { wrap: 'bg-amber-50 border-amber-200',   bar: 'bg-amber-500',  text: 'text-amber-800', sub: 'text-amber-600',  icon: 'text-amber-500',  btn: 'text-amber-700 hover:text-amber-900' },
  orange: { wrap: 'bg-orange-50 border-orange-200', bar: 'bg-orange-500', text: 'text-orange-800',sub: 'text-orange-600', icon: 'text-orange-500', btn: 'text-orange-700 hover:text-orange-900' },
  red:    { wrap: 'bg-red-50 border-red-200',       bar: 'bg-red-400',    text: 'text-red-800',   sub: 'text-red-600',    icon: 'text-red-400',    btn: 'text-red-700 hover:text-red-900' },
}

export function LoadingDots({ label = "L'IA réfléchit..." }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1">
      <div className="flex gap-1">
        {[0,1,2].map(i => <span key={i} className="loading-dot w-2 h-2 rounded-full bg-orange-400 block" />)}
      </div>
      <span className="text-xs font-mono text-stone-400">{label}</span>
    </div>
  )
}

function CopyButton({ code }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-stone-400 hover:text-orange-500 transition-colors">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

export function MarkdownRenderer({ content }) {
  return (
    <div className="prose-obedgpt">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const lang = match?.[1] || ''
            const code = String(children).replace(/
$/, '')
            if (!inline && (match || code.includes('\n'))) {
              return (
                <div className="syntax-wrapper">
                  <div className="syntax-header">
                    <span>{lang || 'code'}</span>
                    <CopyButton code={code} />
                  </div>
                  <SyntaxHighlighter style={oneLight} language={lang || 'text'} PreTag="div"
                    customStyle={{ margin: 0, borderRadius: 0, background: '#FFFBF7', fontSize: '0.8rem', padding: '1rem' }}
                    {...props}>{code}</SyntaxHighlighter>
                </div>
              )
            }
            return <code className={className} {...props}>{children}</code>
          },
        }}
      >{content}</ReactMarkdown>
    </div>
  )
}

export function ErrorBanner({ error, onDismiss, onRetry }) {
  const [countdown, setCountdown] = useState(null)
  const [initialDelay, setInitialDelay] = useState(30)

  const classified = classifyError(error)

  useEffect(() => {
    if (!classified) { setCountdown(null); return }
    const delay = classified.delay || 0
    if (delay > 0) {
      setInitialDelay(delay)
      setCountdown(delay)
      const iv = setInterval(() => setCountdown(p => { if (p <= 1) { clearInterval(iv); return 0 } return p - 1 }), 1000)
      return () => clearInterval(iv)
    }
  }, [error])

  if (!classified) return null

  const cfg = ERROR_CONFIG[classified.type] || ERROR_CONFIG.generic
  const col = COLOR_CLASSES[cfg.color]
  const Icon = cfg.icon
  const bodyText = cfg.body || classified.raw || 'Une erreur est survenue.'
  const showBar = countdown !== null && countdown > 0

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl text-sm border animate-fade-in ${col.wrap}`}>
      <Icon size={15} className={`flex-shrink-0 mt-0.5 ${col.icon}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${col.text}`}>{cfg.title}</p>
        <p className={`text-xs mt-0.5 ${col.sub}`}>{bodyText}</p>
        {showBar && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div className={`h-full ${col.bar} rounded-full transition-all duration-1000`}
                style={{ width: `${(countdown / initialDelay) * 100}%` }} />
            </div>
            <span className={`text-xs font-mono w-7 flex-shrink-0 ${col.sub}`}>{countdown}s</span>
          </div>
        )}
        {countdown === 0 && cfg.retryable && onRetry && (
          <button onClick={() => { onDismiss?.(); onRetry() }}
            className={`mt-2 text-xs font-semibold underline underline-offset-2 ${col.btn}`}>
            Réessayer maintenant →
          </button>
        )}
      </div>
      <button onClick={onDismiss} className="flex-shrink-0 text-stone-400 hover:text-stone-600 transition-colors mt-0.5">
        <X size={14} />
      </button>
    </div>
  )
}

export function FileUploadZone({ onFile, accept, label, hint, maxSizeMB = 10, currentFile }) {
  const [dragging, setDragging] = useState(false)
  const [err, setErr] = useState(null)

  const handleFile = useCallback((file) => {
    setErr(null)
    if (!file) return
    if (file.size / 1024 / 1024 > maxSizeMB) { setErr(`Fichier trop grand (max ${maxSizeMB}MB)`); return }
    const reader = new FileReader()
    reader.onload = e => onFile({ file, base64: e.target.result.split(',')[1], mimeType: file.type, name: file.name })
    reader.onerror = () => setErr('Impossible de lire ce fichier.')
    reader.readAsDataURL(file)
  }, [onFile, maxSizeMB])

  const onDrop = useCallback(e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }, [handleFile])

  return (
    <div>
      {currentFile ? (
        <div className="flex items-center gap-3 p-3 card rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <File size={16} className="text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-stone-800 truncate font-medium">{currentFile.name}</div>
            <div className="text-xs text-stone-400 mt-0.5">{(currentFile.file.size / 1024).toFixed(0)} KB · {currentFile.mimeType}</div>
          </div>
          <button onClick={() => onFile(null)} className="text-stone-400 hover:text-red-400 transition-colors"><X size={16} /></button>
        </div>
      ) : (
        <label onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
          className={`drop-zone flex flex-col items-center justify-center gap-2 p-8 cursor-pointer ${dragging ? 'drag-over' : ''}`}>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
            <Upload size={20} className="text-orange-400" />
          </div>
          <div className="text-sm font-medium text-stone-600">{label || 'Déposer un fichier'}</div>
          <div className="text-xs text-stone-400 text-center">{hint || `Max ${maxSizeMB}MB`}</div>
          <input type="file" accept={accept} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} className="hidden" />
        </label>
      )}
      {err && <p className="text-xs text-red-500 mt-2 px-1">{err}</p>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
        <Icon size={24} className="text-orange-300" />
      </div>
      <div className="text-stone-600 font-display font-medium text-sm">{title}</div>
      {description && <div className="text-stone-400 text-xs max-w-xs">{description}</div>}
    </div>
  )
}

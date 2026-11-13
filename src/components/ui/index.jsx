import { useState, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, X, AlertTriangle, Clock, WifiOff, KeyRound, FileX, Cpu } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.jsx'
import { useToast } from '../fx/Toast'

export function classifyError(input) {
  if (!input) return null
  if (typeof input === 'object' && input.type) return input
  const msg = String(input)

  if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RATE_LIMIT')) {
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
  'auth':   { icon: KeyRound,      color: 'red',    title: 'Clé API Groq invalide',                   body: 'Vérifie GROQ_API_KEYS dans Vercel → Settings → Environment Variables.', retryable: false },
  '413':    { icon: FileX,         color: 'red',    title: 'Message trop volumineux',            body: 'Réduis la taille du message ou du texte envoyé.', retryable: false },
  'quota':  { icon: AlertTriangle, color: 'red',    title: 'Quota journalier atteint',           body: 'Limite gratuite atteinte. Réessaie demain.', retryable: false },
  'context':{ icon: Cpu,           color: 'amber',  title: 'Conversation trop longue',           body: 'Fenêtre de contexte dépassée. Commence une nouvelle conversation.', retryable: false },
  'network':{ icon: WifiOff,       color: 'red',    title: 'Erreur réseau',                      body: 'Vérifie ta connexion internet et réessaie.', retryable: true },
  '500':    { icon: AlertTriangle, color: 'red',    title: 'Erreur serveur interne',             body: 'Problème côté serveur. Réessaie dans quelques secondes.', retryable: true },
  '400':    { icon: AlertTriangle, color: 'red',    title: 'Requête invalide',                   body: 'La requête est incorrecte. Reformule ou raccourcis ton message.', retryable: false },
  'format': { icon: FileX,         color: 'red',    title: 'Format non supporté',                body: "Ce format n'est pas accepté.", retryable: false },
  'generic':{ icon: AlertTriangle, color: 'red',    title: 'Erreur inattendue',                  body: null, retryable: false },
}

const COLOR_CLASSES = {
  amber:  { wrap: 'bg-amber-50 border-amber-200',   bar: 'bg-amber-500',  text: 'text-amber-800', sub: 'text-amber-600',  icon: 'text-amber-500',  btn: 'text-amber-700 hover:text-amber-900' },
  orange: { wrap: 'bg-orange-50 border-orange-200', bar: 'bg-orange-500', text: 'text-orange-800',sub: 'text-orange-600', icon: 'text-orange-500', btn: 'text-orange-700 hover:text-orange-900' },
  red:    { wrap: 'bg-red-50 border-red-200',       bar: 'bg-red-400',    text: 'text-red-800',   sub: 'text-red-600',    icon: 'text-red-400',    btn: 'text-red-700 hover:text-red-900' },
}

export function ThinkingSkeleton() {
  return (
    <div className="py-1 space-y-2.5 min-w-[200px] sm:min-w-[320px]" aria-label="ObedGPT réfléchit">
      <div className="text-sm font-medium shimmer-text w-fit">Réflexion en cours…</div>
      <div className="skeleton-line" style={{ width: '92%' }} />
      <div className="skeleton-line" style={{ width: '74%', animationDelay: '.15s' }} />
      <div className="skeleton-line" style={{ width: '52%', animationDelay: '.3s' }} />
    </div>
  )
}

export function LoadingDots({ label = "ObedGPT réfléchit..." }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1">
      <div className="flex gap-1">
        {[0,1,2].map(i => <span key={i} className="loading-dot w-1.5 h-1.5 rounded-full block" style={{ background: 'var(--text-3)' }} />)}
      </div>
      <span className="text-xs font-mono text-stone-400">{label}</span>
    </div>
  )
}

function CopyButton({ code }) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  return (
    <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); toast('Code copié'); setTimeout(() => setCopied(false), 2000) }}
      aria-label={copied ? 'Code copié' : 'Copier le code'}
      className="text-stone-400 hover:text-stone-600 transition-colors">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

export function MarkdownRenderer({ content }) {
  const { theme } = useTheme()
  return (
    <div className="prose-obedgpt">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const lang = match?.[1] || ''
            const code = String(children).replace(/\n$/, '')
            if (!inline && (match || code.includes('\n'))) {
              return (
                <div className="syntax-wrapper">
                  <div className="syntax-header">
                    <span>{lang || 'code'}</span>
                    <CopyButton code={code} />
                  </div>
                  <SyntaxHighlighter style={theme === 'dark' ? oneDark : oneLight} language={lang || 'text'} PreTag="div"
                    customStyle={{ margin: 0, borderRadius: 0, background: theme === 'dark' ? '#0e0e12' : '#fafafa', fontSize: '0.8rem', padding: '1rem' }}
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
      <button onClick={onDismiss} aria-label="Fermer ce message" className="flex-shrink-0 text-stone-400 hover:text-stone-600 transition-colors mt-0.5">
        <X size={14} />
      </button>
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

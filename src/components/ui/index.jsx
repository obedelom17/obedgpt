import { useState, useEffect } from 'react'
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
    const match = msg.match(/(?:retry in|dans) (\d+\.?\d*)\s?s/i)
    return { type: '429', delay: match ? Math.ceil(parseFloat(match[1])) : 30 }
  }
  if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('overloaded') || msg.includes('indisponible'))
    return { type: '503', delay: 15 }
  if (msg.includes('401') || msg.includes('403') || msg.includes('API_KEY') || msg.includes('invalid authentication') || msg.includes('Invalid API Key') || msg.includes('GROQ_KEYS'))
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
  '429':    { icon: Clock,         tone: 'warn',   title: 'Trop de requêtes',            body: 'Patiente quelques secondes, puis réessaie.', retryable: true },
  '503':    { icon: WifiOff,       tone: 'warn',   title: 'Service surchargé',           body: 'Forte demande en ce moment. Nouvelle tentative possible dans quelques secondes.', retryable: true },
  'auth':   { icon: KeyRound,      tone: 'danger', title: 'Clé Groq manquante ou invalide', body: 'Vérifie GROQ_API_KEYS dans Vercel (Settings > Environment Variables).', retryable: false },
  '413':    { icon: FileX,         tone: 'danger', title: 'Message trop volumineux',     body: 'Réduis la taille du message ou du texte envoyé.', retryable: false },
  'quota':  { icon: AlertTriangle, tone: 'danger', title: 'Quota journalier atteint',    body: 'Limite gratuite atteinte. Réessaie demain.', retryable: false },
  'context':{ icon: Cpu,           tone: 'warn',   title: 'Conversation trop longue',    body: 'Fenêtre de contexte dépassée. Commence une nouvelle conversation.', retryable: false },
  'network':{ icon: WifiOff,       tone: 'danger', title: 'Erreur réseau',               body: 'Vérifie ta connexion internet, puis réessaie.', retryable: true },
  '500':    { icon: AlertTriangle, tone: 'danger', title: 'Erreur serveur',              body: 'Problème côté serveur. Réessaie dans quelques secondes.', retryable: true },
  '400':    { icon: AlertTriangle, tone: 'danger', title: 'Requête invalide',            body: 'Reformule ou raccourcis ton message.', retryable: false },
  'format': { icon: FileX,         tone: 'danger', title: 'Format non supporté',         body: "Ce format n'est pas accepté.", retryable: false },
  'generic':{ icon: AlertTriangle, tone: 'danger', title: 'Erreur inattendue',           body: null, retryable: false },
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

export function LoadingDots({ label = 'ObedGPT réfléchit...' }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => <span key={i} className="loading-dot w-1.5 h-1.5 rounded-full block" style={{ background: 'var(--accent)' }} />)}
      </div>
      <span className="text-xs font-mono text-ink3">{label}</span>
    </div>
  )
}

export function CopyButton({ code, label = true }) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  return (
    <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); toast('Code copié'); setTimeout(() => setCopied(false), 1800) }}
      aria-label={copied ? 'Code copié' : 'Copier le code'} className="copy-btn">
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {label && <span>{copied ? 'Copié' : 'Copier'}</span>}
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
              const lines = code.split('\n').length
              return (
                <div className="syntax-wrapper">
                  <div className="syntax-header">
                    <span>{lang || 'code'} · {lines} ligne{lines > 1 ? 's' : ''}</span>
                    <CopyButton code={code} />
                  </div>
                  <SyntaxHighlighter style={theme === 'dark' ? oneDark : oneLight} language={lang || 'text'} PreTag="div"
                    customStyle={{ margin: 0, borderRadius: 0, background: 'transparent', fontSize: '0.82rem', padding: '1rem' }}
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
  const Icon = cfg.icon
  const bodyText = cfg.body || classified.raw || 'Une erreur est survenue.'
  const showBar = countdown !== null && countdown > 0

  return (
    <div className="alert animate-fade-in" data-tone={cfg.tone} role="alert">
      <Icon size={16} className="alert-ico flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{cfg.title}</p>
        <p className="text-xs mt-0.5 text-ink2">{bodyText}</p>
        {showBar && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${(countdown / initialDelay) * 100}%`, background: cfg.tone === 'warn' ? 'var(--warn)' : 'var(--danger)' }} />
            </div>
            <span className="text-xs font-mono w-7 flex-shrink-0 text-ink3">{countdown}s</span>
          </div>
        )}
        {countdown === 0 && cfg.retryable && onRetry && (
          <button onClick={() => { onDismiss?.(); onRetry() }} className="mt-2 text-xs font-semibold underline underline-offset-2 text-accent">
            Réessayer maintenant
          </button>
        )}
      </div>
      <button onClick={onDismiss} aria-label="Fermer ce message" className="flex-shrink-0 text-ink3 hover:text-ink transition-colors mt-0.5"><X size={14} /></button>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 px-8 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
        <Icon size={22} className="text-accent" />
      </div>
      <div className="font-display font-semibold text-ink">{title}</div>
      {description && <div className="text-ink3 text-sm max-w-xs">{description}</div>}
    </div>
  )
}

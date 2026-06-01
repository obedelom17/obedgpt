import { useState, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, Upload, X, File, AlertTriangle, Clock } from 'lucide-react'

// ——— Parse retry delay from 429 error ———
export function parseRetryDelay(message) {
  const match = message?.match(/retry in (\d+\.?\d*)s/i)
  return match ? Math.ceil(parseFloat(match[1])) : 30
}

export function is429(message) {
  return message?.includes('429') || message?.includes('Too Many Requests') || message?.includes('quota')
}

// ——— Loading dots ———
export function LoadingDots({ label = "L'IA réfléchit..." }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 text-stone-400 text-sm">
      <div className="flex gap-1">
        <span className="loading-dot w-2 h-2 rounded-full bg-orange-400 block" />
        <span className="loading-dot w-2 h-2 rounded-full bg-orange-400 block" />
        <span className="loading-dot w-2 h-2 rounded-full bg-orange-400 block" />
      </div>
      <span className="text-xs font-mono text-stone-400">{label}</span>
    </div>
  )
}

// ——— Copy button ———
function CopyButton({ code }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-stone-400 hover:text-orange-500 transition-colors">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

// ——— Markdown renderer ———
export function MarkdownRenderer({ content }) {
  return (
    <div className="prose-obedgpt">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
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
                  <SyntaxHighlighter
                    style={oneLight}
                    language={lang || 'text'}
                    PreTag="div"
                    customStyle={{ margin: 0, borderRadius: 0, background: '#FFFBF7', fontSize: '0.8rem', padding: '1rem' }}
                    {...props}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              )
            }
            return <code className={className} {...props}>{children}</code>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// ——— File Upload Zone ———
export function FileUploadZone({ onFile, accept, label, hint, maxSizeMB = 10, currentFile }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = useCallback((file) => {
    setError(null)
    if (!file) return
    if (file.size / 1024 / 1024 > maxSizeMB) { setError(`Fichier trop grand (max ${maxSizeMB}MB)`); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1]
      onFile({ file, base64, mimeType: file.type, name: file.name })
    }
    reader.readAsDataURL(file)
  }, [onFile, maxSizeMB])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div>
      {currentFile ? (
        <div className="flex items-center gap-3 p-3 card rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <File size={16} className="text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-stone-800 truncate font-medium">{currentFile.name}</div>
            <div className="text-xs text-stone-400 mt-0.5">{(currentFile.file.size / 1024).toFixed(0)} KB</div>
          </div>
          <button onClick={() => onFile(null)} className="text-stone-400 hover:text-red-400 transition-colors">
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`drop-zone flex flex-col items-center justify-center gap-2 p-8 cursor-pointer ${dragging ? 'drag-over' : ''}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
            <Upload size={20} className="text-orange-400" />
          </div>
          <div className="text-sm font-medium text-stone-600">{label || 'Déposer un fichier'}</div>
          <div className="text-xs text-stone-400 text-center">{hint || `Max ${maxSizeMB}MB`}</div>
          <input type="file" accept={accept} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} className="hidden" />
        </label>
      )}
      {error && <p className="text-xs text-red-500 mt-2 px-1">{error}</p>}
    </div>
  )
}

// ——— Empty state ———
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

// ——— Smart Error Banner (handles 429 with countdown) ———
export function ErrorBanner({ error, onDismiss, onRetry }) {
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    if (!error) { setCountdown(null); return }
    if (is429(error)) {
      const delay = parseRetryDelay(error)
      setCountdown(delay)
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0 }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [error])

  if (!error) return null

  const isRateLimit = is429(error)

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl text-sm border
      ${isRateLimit
        ? 'bg-amber-50 border-amber-200 text-amber-800'
        : 'bg-red-50 border-red-200 text-red-700'
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isRateLimit ? <Clock size={15} className="text-amber-500" /> : <AlertTriangle size={15} className="text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        {isRateLimit ? (
          <>
            <p className="font-medium text-amber-800">Service temporairement surchargé</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Trop de requêtes en même temps. L'IA sera disponible dans quelques instants.
            </p>
            {countdown !== null && countdown > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(countdown / parseRetryDelay(error)) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-amber-700 w-8">{countdown}s</span>
              </div>
            )}
            {countdown === 0 && onRetry && (
              <button onClick={onRetry} className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 underline">
                Réessayer maintenant →
              </button>
            )}
          </>
        ) : (
          <p>{error}</p>
        )}
      </div>
      <button onClick={onDismiss} className="flex-shrink-0 text-stone-400 hover:text-stone-600">
        <X size={14} />
      </button>
    </div>
  )
}

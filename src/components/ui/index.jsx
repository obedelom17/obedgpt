import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, Upload, X, File } from 'lucide-react'

// ——— Loading dots ———
export function LoadingDots({ label = 'Gemini réfléchit...' }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 text-slate-400 text-sm">
      <div className="flex gap-1">
        <span className="loading-dot w-2 h-2 rounded-full bg-amber-500 block" />
        <span className="loading-dot w-2 h-2 rounded-full bg-amber-500 block" />
        <span className="loading-dot w-2 h-2 rounded-full bg-amber-500 block" />
      </div>
      <span className="text-xs font-mono text-slate-500">{label}</span>
    </div>
  )
}

// ——— Copy button ———
function CopyButton({ code }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-slate-500 hover:text-amber-400 transition-colors">
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
                    style={vscDarkPlus}
                    language={lang || 'text'}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: 0,
                      background: '#080F1E',
                      fontSize: '0.8rem',
                      padding: '1rem',
                    }}
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
    const sizeMB = file.size / 1024 / 1024
    if (sizeMB > maxSizeMB) {
      setError(`Fichier trop grand (max ${maxSizeMB}MB)`)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1]
      onFile({ file, base64, mimeType: file.type, name: file.name })
    }
    reader.readAsDataURL(file)
  }, [onFile, maxSizeMB])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      {currentFile ? (
        <div className="flex items-center gap-3 p-3 card rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <File size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-200 truncate font-medium">{currentFile.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {(currentFile.file.size / 1024).toFixed(0)} KB · {currentFile.mimeType}
            </div>
          </div>
          <button
            onClick={() => onFile(null)}
            className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`drop-zone flex flex-col items-center justify-center gap-2 p-8 cursor-pointer
                      ${dragging ? 'drag-over' : ''}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Upload size={20} className="text-amber-400" />
          </div>
          <div className="text-sm font-medium text-slate-300">{label || 'Déposer un fichier'}</div>
          <div className="text-xs text-slate-500 text-center">{hint || `Max ${maxSizeMB}MB`}</div>
          <input type="file" accept={accept} onChange={onInputChange} className="hidden" />
        </label>
      )}
      {error && <p className="text-xs text-red-400 mt-2 px-1">{error}</p>}
    </div>
  )
}

// ——— Empty state ———
export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
        <Icon size={24} className="text-amber-500/60" />
      </div>
      <div className="text-slate-400 font-display font-medium text-sm">{title}</div>
      {description && <div className="text-slate-600 text-xs max-w-xs">{description}</div>}
    </div>
  )
}

// ——— Error Banner ———
export function ErrorBanner({ error, onDismiss }) {
  if (!error) return null
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
      <span className="flex-1">{error}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-300 flex-shrink-0">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

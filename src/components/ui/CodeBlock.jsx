import { useState, useEffect, useMemo, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, Maximize2, X, Download, Code2, Eye, Smartphone, Tablet, Monitor, ZoomIn, ZoomOut, GitBranch, AlertTriangle, ExternalLink } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.jsx'
import { useToast } from '../fx/Toast'
import { downloadText } from '../../lib/audio'

// ───────── Mermaid (chargé à la demande : ~0 Ko tant qu'aucun diagramme) ─────────
let mermaidPromise
const loadMermaid = () => (mermaidPromise ||= import('mermaid').then(m => m.default))
const readVar = (n, d) => (typeof document === 'undefined' ? d : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d)

async function renderMermaid(code, id, dark) {
  const mermaid = await loadMermaid()
  mermaid.initialize({
    startOnLoad: false, securityLevel: 'strict', theme: 'base', fontFamily: 'inherit',
    themeVariables: dark
      ? { background: 'transparent', primaryColor: '#12362a', primaryTextColor: '#e8f3ed', primaryBorderColor: '#38d39f', lineColor: '#7fae9a', secondaryColor: '#1d2a24', tertiaryColor: '#16201b', textColor: '#e8f3ed', noteBkgColor: '#2a2a14', noteTextColor: '#f5e9b8' }
      : { background: 'transparent', primaryColor: '#e3f3ec', primaryTextColor: '#0f1c16', primaryBorderColor: readVar('--accent', '#0e7a5c'), lineColor: '#5d7a6d', secondaryColor: '#fdf3d6', tertiaryColor: '#f3f6f4', textColor: '#0f1c16', noteBkgColor: '#fff6d8', noteTextColor: '#4a3b00' },
  })
  try {
    await mermaid.parse(code)
    return (await mermaid.render(id, code)).svg
  } finally { document.getElementById('d' + id)?.remove() }
}

export function Modal({ onClose, title, children, wide }) {
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [onClose])
  return createPortal(
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><span className="font-display font-semibold truncate">{title}</span><button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>, document.body)
}

function MermaidBlock({ code, dark }) {
  const uid = 'm' + useId().replace(/[^a-z0-9]/gi, '')
  const [state, setState] = useState({ svg: '', error: '' })
  const [full, setFull] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [view, setView] = useState('diagram')
  const toast = useToast()
  const n = useRef(0)

  // Pendant le streaming le code est incomplet : on attend qu'il se stabilise.
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      try { const svg = await renderMermaid(code, `${uid}-${++n.current}`, dark); if (!cancelled) setState({ svg, error: '' }) }
      catch (e) { if (!cancelled) setState(s => ({ ...s, error: String(e.message || e).split('\n')[0].slice(0, 160) })) }
    }, 450)
    return () => { cancelled = true; clearTimeout(t) }
  }, [code, dark, uid])

  const showCode = view === 'code' || (!state.svg && state.error)
  return (
    <div className="syntax-wrapper mermaid-wrap">
      <div className="syntax-header">
        <span className="flex items-center gap-1.5"><GitBranch size={13} /> Diagramme</span>
        <div className="flex items-center gap-0.5">
          <button className="copy-btn" onClick={() => setView(v => (v === 'code' ? 'diagram' : 'code'))} aria-pressed={view === 'code'}>{view === 'code' ? <Eye size={13} /> : <Code2 size={13} />}<span>{view === 'code' ? 'Diagramme' : 'Code'}</span></button>
          {state.svg && <>
            <button className="copy-btn" onClick={() => downloadText(state.svg, 'diagramme.svg', 'image/svg+xml')} aria-label="Télécharger en SVG"><Download size={13} /><span>SVG</span></button>
            <button className="copy-btn" onClick={() => { setZoom(1); setFull(true) }} aria-label="Plein écran"><Maximize2 size={13} /></button>
          </>}
          <button className="copy-btn" onClick={() => { navigator.clipboard?.writeText(code); toast('Code copié') }} aria-label="Copier le code Mermaid"><Copy size={13} /></button>
        </div>
      </div>
      {showCode ? (
        <>
          {state.error && !state.svg && <p className="mermaid-err"><AlertTriangle size={13} /> Diagramme invalide : {state.error}</p>}
          <pre className="pre-out !rounded-none !border-0">{code}</pre>
        </>
      ) : state.svg ? (
        <div className="mermaid-view" dangerouslySetInnerHTML={{ __html: state.svg }} />
      ) : <div className="mermaid-skel"><span className="skeleton-line" style={{ width: '60%' }} /><span className="skeleton-line" style={{ width: '40%' }} /></div>}
      {full && (
        <Modal onClose={() => setFull(false)} title="Diagramme" wide>
          <div className="flex items-center gap-1 mb-3">
            <button className="icon-btn" onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} aria-label="Dézoomer"><ZoomOut size={16} /></button>
            <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button className="icon-btn" onClick={() => setZoom(z => Math.min(4, z + 0.2))} aria-label="Zoomer"><ZoomIn size={16} /></button>
          </div>
          <div className="mermaid-full"><div style={{ width: `${zoom * 100}%`, minWidth: 'min-content' }} className="mermaid-view" dangerouslySetInnerHTML={{ __html: state.svg }} /></div>
        </Modal>
      )}
    </div>
  )
}

// ───────── Aperçu de rendu HTML / SVG (iframe isolée, sans accès à l'app) ─────────
const CSP = "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src data: blob: https:; style-src 'unsafe-inline' https:; font-src data: https:; script-src 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com; connect-src 'none'; form-action 'none'\">"
export function buildPreviewDoc(code, lang) {
  const isSvg = lang === 'svg' || /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(code)
  const base = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  if (isSvg) return `<!DOCTYPE html><html><head>${CSP}${base}<style>html,body{margin:0;height:100%;display:grid;place-items:center;background:#fff}svg{max-width:100%;max-height:100vh;height:auto}</style></head><body>${code}</body></html>`
  if (/<html[\s>]/i.test(code)) {
    if (/<head[\s>]/i.test(code)) return code.replace(/<head([^>]*)>/i, `<head$1>${CSP}${base}`)
    return code.replace(/<html([^>]*)>/i, `<html$1><head>${CSP}${base}</head>`)
  }
  return `<!DOCTYPE html><html><head>${CSP}${base}<style>body{font-family:system-ui,sans-serif;margin:1rem}</style></head><body>${code}</body></html>`
}
const SIZES = [{ id: 'm', w: 375, icon: Smartphone, label: 'Mobile' }, { id: 't', w: 768, icon: Tablet, label: 'Tablette' }, { id: 'd', w: 0, icon: Monitor, label: 'Bureau' }]

function PreviewFrame({ doc, size, tall }) {
  const w = SIZES.find(s => s.id === size)?.w
  return (
    <div className="preview-stage" style={{ height: tall ? '100%' : 320 }}>
      <iframe title="Aperçu du rendu" sandbox="allow-scripts" srcDoc={doc} className="preview-frame" style={{ width: w ? `${w}px` : '100%', maxWidth: '100%' }} />
    </div>
  )
}

export function isPreviewable(lang, code) {
  return ['html', 'svg'].includes(lang) || (!lang && /^\s*(<!DOCTYPE html|<html[\s>])/i.test(code)) || (lang === 'xml' && /^\s*<svg[\s>]/i.test(code))
}

// ───────── Bloc de code ─────────
export default function CodeBlock({ lang, code, htmlProps }) {
  const { theme } = useTheme()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState('code')
  const [size, setSize] = useState('d')
  const [full, setFull] = useState(false)
  const lines = code.split('\n').length
  const doc = useMemo(() => (view === 'preview' || full ? buildPreviewDoc(code, lang) : ''), [view, full, code, lang])

  if (lang === 'mermaid') return <MermaidBlock code={code} dark={theme === 'dark'} />
  const canPreview = isPreviewable(lang, code)
  return (
    <div className="syntax-wrapper">
      <div className="syntax-header">
        <span>{lang || 'code'} · {lines} ligne{lines > 1 ? 's' : ''}</span>
        <div className="flex items-center gap-0.5">
          {canPreview && (
            <button className="copy-btn" onClick={() => setView(v => (v === 'preview' ? 'code' : 'preview'))} aria-pressed={view === 'preview'}>
              {view === 'preview' ? <Code2 size={13} /> : <Eye size={13} />}<span>{view === 'preview' ? 'Code' : 'Aperçu'}</span>
            </button>
          )}
          {canPreview && view === 'preview' && <button className="copy-btn" onClick={() => setFull(true)} aria-label="Aperçu en plein écran"><Maximize2 size={13} /></button>}
          <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); toast('Code copié'); setTimeout(() => setCopied(false), 1800) }} aria-label={copied ? 'Code copié' : 'Copier le code'} className="copy-btn">
            {copied ? <Check size={13} /> : <Copy size={13} />}<span>{copied ? 'Copié' : 'Copier'}</span>
          </button>
        </div>
      </div>
      {view === 'preview' && canPreview ? (
        <div>
          <div className="preview-bar" role="group" aria-label="Taille de l'aperçu">
            {SIZES.map(({ id, icon: Icon, label }) => <button key={id} className="copy-btn" aria-pressed={size === id} onClick={() => setSize(id)} aria-label={label}><Icon size={13} /><span>{label}</span></button>)}
          </div>
          <PreviewFrame doc={doc} size={size} />
        </div>
      ) : (
        <SyntaxHighlighter style={theme === 'dark' ? oneDark : oneLight} language={lang || 'text'} PreTag="div"
          customStyle={{ margin: 0, borderRadius: 0, background: 'transparent', fontSize: '0.82rem', padding: '1rem' }} {...htmlProps}>{code}</SyntaxHighlighter>
      )}
      {full && (
        <Modal onClose={() => setFull(false)} title="Aperçu" wide>
          <div className="preview-bar !mb-2" role="group" aria-label="Taille de l'aperçu">
            {SIZES.map(({ id, icon: Icon, label }) => <button key={id} className="copy-btn" aria-pressed={size === id} onClick={() => setSize(id)} aria-label={label}><Icon size={13} /><span>{label}</span></button>)}
          </div>
          <div style={{ height: 'calc(100% - 44px)' }}><PreviewFrame doc={doc} size={size} tall /></div>
        </Modal>
      )}
    </div>
  )
}

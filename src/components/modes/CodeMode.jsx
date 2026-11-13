import { useState, useMemo } from 'react'
import { Code2, Send, Terminal, Download, Eye, EyeOff, Wand2, MessageCircleQuestion, Copy, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'
import { useToast } from '../fx/Toast'
import { useApiCall } from '../../hooks/useApiCall'

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'PHP', 'React JSX', 'HTML/CSS', 'SQL', 'Bash', 'C#', 'Flutter/Dart', 'Kotlin']
const EXAMPLES = [
  'Hook React pour fetcher une API avec loading/error/retry',
  "Function Python pour trier une liste d'objets par attribut",
  'Classe Java avec héritage et interface',
  'Composant Flutter avec ListView et pull-to-refresh',
  'API REST PHP avec authentification JWT',
]
const EXT_MAP = { 'JavaScript': 'js', 'TypeScript': 'ts', 'Python': 'py', 'Java': 'java', 'PHP': 'php', 'React JSX': 'jsx', 'HTML/CSS': 'html', 'SQL': 'sql', 'Bash': 'sh', 'C#': 'cs', 'Flutter/Dart': 'dart', 'Kotlin': 'kt' }

function extractFirstCodeBlock(text) {
  const match = text.match(/```[\w-]*\n([\s\S]*?)```/)
  return match ? match[1] : text
}

export default function CodeMode() {
  const [mode, setMode] = useState('generate') // 'generate' | 'explain'
  const [prompt, setPrompt] = useState('')
  const [language, setLanguage] = useState('JavaScript')
  const [context, setContext] = useState('')
  const [result, setResult] = useState(null)
  const [showCtx, setShowCtx] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const { loading, error, call, retry, clearError } = useApiCall()
  const toast = useToast()

  const generate = async () => {
    if (!prompt.trim() || loading) return
    setResult(null)
    setShowPreview(false)
    const body = mode === 'explain' ? { prompt, mode: 'explain' } : { prompt, language, context }
    const data = await call('/api/code', body)
    if (data) setResult(data.text)
  }

  const handleRetry = async () => { const data = await retry(); if (data) setResult(data.text) }

  const canPreview = mode === 'generate' && language === 'HTML/CSS' && !!result
  const previewDoc = useMemo(() => {
    if (!canPreview) return ''
    const code = extractFirstCodeBlock(result)
    return /<html[\s>]/i.test(code) ? code : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${code}</body></html>`
  }, [canPreview, result])

  const downloadCode = () => {
    const code = extractFirstCodeBlock(result)
    const ext = mode === 'explain' ? 'md' : (EXT_MAP[language] || 'txt')
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `obedgpt-code.${ext}`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  const MODES = [
    { id: 'generate', label: 'Générer du code', icon: Wand2 },
    { id: 'explain', label: 'Expliquer du code', icon: MessageCircleQuestion },
  ]

  return (
    <div className="page">
      <div className="page-inner space-y-5">
        <div>
          <h2 className="page-title">Code</h2>
          <p className="page-sub">Décris ce que tu veux, ou colle un extrait à comprendre. Le résultat est commenté et prêt à copier.</p>
        </div>

        <div className="segmented" role="group" aria-label="Type de tâche">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button key={id} aria-pressed={mode === id} onClick={() => { setMode(id); setResult(null) }}>
              {mode === id && <motion.span layoutId="code-seg" className="seg-pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
              <span><Icon size={14} /> {label}</span>
            </button>
          ))}
        </div>

        <div className="card p-4 space-y-4">
          {mode === 'generate' && (
            <>
              <div>
                <span className="field-label">Langage</span>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <button key={l} onClick={() => setLanguage(l)} aria-pressed={language === l} className={`tag ${language === l ? 'active-tag' : ''}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <button onClick={() => setShowCtx(!showCtx)} className="text-xs text-ink3 hover:text-accent transition-colors">
                  {showCtx ? 'Masquer le contexte du projet' : 'Ajouter le contexte du projet'}
                </button>
                <AnimatePresence initial={false}>
                  {showCtx && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <textarea value={context} onChange={e => setContext(e.target.value)} rows={2} aria-label="Contexte du projet"
                        placeholder="Ex : app React e-commerce avec Tailwind CSS, API Laravel..." className="input-field text-sm w-full mt-2" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          <div>
            <label className="field-label" htmlFor="code-prompt">{mode === 'explain' ? 'Code à expliquer' : 'Description'}</label>
            <div className="flex gap-2">
              <textarea id="code-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} rows={mode === 'explain' ? 7 : 3}
                placeholder={mode === 'explain' ? 'Colle le code à expliquer ici...' : `Décris le code ${language} à générer...`}
                className="input-field flex-1 resize-none font-mono text-[13px]"
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate() }} />
              <button onClick={generate} disabled={!prompt.trim() || loading} aria-label={mode === 'explain' ? 'Expliquer le code' : 'Générer le code'} className="btn-primary self-end"><Send size={15} /></button>
            </div>
            <p className="text-[11px] text-ink3 mt-1.5"><kbd className="fx-kbd">Ctrl</kbd> + <kbd className="fx-kbd">Entrée</kbd> pour {mode === 'explain' ? 'expliquer' : 'générer'}</p>
          </div>

          {mode === 'generate' && (
            <div className="pt-1">
              <span className="field-label">Exemples</span>
              <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => setPrompt(ex)} className="prompt-row !py-2.5">
                    <span className="p-title !font-medium !text-[.86rem] flex-1 truncate">{ex}</span>
                    <ArrowRight size={15} className="p-go flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <ErrorBanner error={error} onDismiss={clearError} onRetry={handleRetry} />
        {loading && <div className="card p-4"><LoadingDots label={mode === 'explain' ? 'Analyse du code...' : `Génération ${language}...`} /></div>}
        {result && !loading && (
          <motion.div className="card p-5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}>
            <div className="flex items-center justify-between gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-accent" />
                <span className="text-sm font-display font-semibold">{mode === 'explain' ? 'Explication' : `Code ${language}`}</span>
              </div>
              <div className="flex items-center gap-0.5">
                {canPreview && (
                  <button onClick={() => setShowPreview(p => !p)} aria-label={showPreview ? "Masquer l'aperçu" : "Afficher l'aperçu"} title="Aperçu HTML" className="icon-btn !w-8 !h-8">
                    {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
                <button onClick={() => { navigator.clipboard?.writeText(mode === 'explain' ? result : extractFirstCodeBlock(result)); toast(mode === 'explain' ? 'Explication copiée' : 'Code copié') }} aria-label="Copier" title="Copier" className="icon-btn !w-8 !h-8"><Copy size={15} /></button>
                {mode === 'generate' && (
                  <button onClick={downloadCode} aria-label="Télécharger le code" title="Télécharger" className="icon-btn !w-8 !h-8"><Download size={15} /></button>
                )}
              </div>
            </div>
            {showPreview && (
              <iframe title="Aperçu HTML" sandbox="allow-scripts" srcDoc={previewDoc} className="w-full h-72 rounded-xl bg-white mb-3" style={{ border: '1px solid var(--border-strong)' }} />
            )}
            <MarkdownRenderer content={result} />
          </motion.div>
        )}
        {!result && !loading && (
          <EmptyState icon={Code2} title={mode === 'explain' ? 'Colle du code pour le comprendre' : 'Rien de généré pour le moment'}
            description={mode === 'explain'
              ? "L'IA explique le fonctionnement étape par étape et signale les pièges."
              : 'Le code est généré par gpt-oss-120b (Groq), avec commentaires.'} />
        )}
      </div>
    </div>
  )
}

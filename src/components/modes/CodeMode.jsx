import { useState, useMemo } from 'react'
import { Code2, Send, Terminal, Download, Eye, EyeOff, Wand2, MessageCircleQuestion } from 'lucide-react'
import { LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'
import { useApiCall } from '../../hooks/useApiCall'

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'PHP', 'React JSX', 'HTML/CSS', 'SQL', 'Bash', 'C#', 'Flutter/Dart', 'Kotlin']
const EXAMPLES  = [
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
  const [mode, setMode]         = useState('generate') // 'generate' | 'explain'
  const [prompt, setPrompt]     = useState('')
  const [language, setLanguage] = useState('JavaScript')
  const [context, setContext]   = useState('')
  const [result, setResult]     = useState(null)
  const [showCtx, setShowCtx]   = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const { loading, error, call, retry, clearError } = useApiCall()

  const generate = async () => {
    if (!prompt.trim() || loading) return
    setResult(null)
    setShowPreview(false)
    const body = mode === 'explain'
      ? { prompt, mode: 'explain' }
      : { prompt, language, context }
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

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card p-4 space-y-3">
          {/* Générer vs Expliquer */}
          <div className="flex gap-2">
            <button onClick={() => { setMode('generate'); setResult(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-colors ${mode === 'generate' ? 'bg-orange-50 border-orange-300 text-orange-600' : 'border-orange-100 text-stone-500 hover:bg-orange-50/60'}`}>
              <Wand2 size={13} /> Générer du code
            </button>
            <button onClick={() => { setMode('explain'); setResult(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-colors ${mode === 'explain' ? 'bg-orange-50 border-orange-300 text-orange-600' : 'border-orange-100 text-stone-500 hover:bg-orange-50/60'}`}>
              <MessageCircleQuestion size={13} /> Expliquer du code
            </button>
          </div>

          {mode === 'generate' && (
            <>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(l => (
                  <button key={l} onClick={() => setLanguage(l)}
                    className={`tag text-xs ${language === l ? 'active-tag' : ''}`}>{l}</button>
                ))}
              </div>
              <div>
                <button onClick={() => setShowCtx(!showCtx)} className="text-xs text-stone-400 hover:text-orange-500 transition-colors mb-2">
                  {showCtx ? '← Masquer' : '+ Ajouter'} le contexte du projet
                </button>
                {showCtx && (
                  <textarea value={context} onChange={e => setContext(e.target.value)} rows={2}
                    placeholder="Ex: App React e-commerce Tailwind CSS, API Laravel..." className="input-field text-xs w-full" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-stone-400">Exemples :</p>
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => setPrompt(ex)}
                    className="block text-xs text-left text-stone-400 hover:text-orange-500 transition-colors px-1 w-full truncate">→ {ex}</button>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-2">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={mode === 'explain' ? 6 : 2}
              placeholder={mode === 'explain' ? 'Colle le code à expliquer ici...' : `Décris le code ${language} à générer...`}
              className="input-field flex-1 resize-none font-mono text-xs"
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) generate() }} />
            <button onClick={generate} disabled={!prompt.trim() || loading} aria-label={mode === 'explain' ? 'Expliquer le code' : 'Générer le code'} className="btn-primary self-end"><Send size={15} /></button>
          </div>
          <p className="text-[10px] text-stone-400">Ctrl+Entrée pour {mode === 'explain' ? 'expliquer' : 'générer'}</p>
        </div>

        <ErrorBanner error={error} onDismiss={clearError} onRetry={handleRetry} />
        {loading && <div className="card p-4"><LoadingDots label={mode === 'explain' ? 'Analyse du code...' : `Génération ${language}...`} /></div>}
        {result && !loading && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-orange-100">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-orange-500" />
                <span className="text-xs font-display font-semibold text-orange-500 uppercase tracking-wider">
                  {mode === 'explain' ? 'Explication' : `Code · ${language}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {canPreview && (
                  <button onClick={() => setShowPreview(p => !p)} aria-label={showPreview ? 'Masquer l\'aperçu' : 'Afficher l\'aperçu'} title="Aperçu HTML"
                    className="text-stone-400 hover:text-orange-500 transition-colors p-1">
                    {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
                {mode === 'generate' && (
                  <button onClick={downloadCode} aria-label="Télécharger le code" title="Télécharger" className="text-stone-400 hover:text-orange-500 transition-colors p-1">
                    <Download size={14} />
                  </button>
                )}
              </div>
            </div>
            {showPreview && (
              <iframe title="Aperçu HTML" sandbox="allow-scripts" srcDoc={previewDoc}
                className="w-full h-72 rounded-xl border border-orange-100 bg-white mb-3" />
            )}
            <MarkdownRenderer content={result} />
          </div>
        )}
        {!result && !loading && (
          <EmptyState icon={Code2} title="Mode Code"
            description={mode === 'explain'
              ? "Colle un extrait de code existant : l'IA t'explique son fonctionnement étape par étape."
              : "LLaMA 3.3 70B génère du code propre, commenté et production-ready dans le langage de ton choix."} />
        )}
      </div>
    </div>
  )
}

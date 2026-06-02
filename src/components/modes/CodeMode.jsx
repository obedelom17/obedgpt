import { useState } from 'react'
import { Code2, Send, Terminal } from 'lucide-react'
import { LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'
import { useApiCall } from '../../hooks/useApiCall'

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'PHP', 'React JSX', 'HTML/CSS', 'SQL', 'Bash', 'C#', 'Flutter/Dart', 'Kotlin']
const EXAMPLES  = [
  'Hook React pour fetcher une API avec loading/error/retry',
  'Function Python pour trier une liste d'objets par attribut',
  'Classe Java avec héritage et interface',
  'Composant Flutter avec ListView et pull-to-refresh',
  'API REST PHP avec authentification JWT',
]

export default function CodeMode() {
  const [prompt, setPrompt]     = useState('')
  const [language, setLanguage] = useState('JavaScript')
  const [context, setContext]   = useState('')
  const [result, setResult]     = useState(null)
  const [showCtx, setShowCtx]   = useState(false)
  const { loading, error, call, retry, clearError } = useApiCall()

  const generate = async () => {
    if (!prompt.trim() || loading) return
    setResult(null)
    const data = await call('/api/code', { prompt, language, context })
    if (data) setResult(data.text)
  }

  const handleRetry = async () => { const data = await retry(); if (data) setResult(data.text) }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card p-4 space-y-3">
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
          <div className="flex gap-2">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={2}
              placeholder={`Décris le code ${language} à générer...`}
              className="input-field flex-1 resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) generate() }} />
            <button onClick={generate} disabled={!prompt.trim() || loading} className="btn-primary self-end"><Send size={15} /></button>
          </div>
          <p className="text-[10px] text-stone-400">Ctrl+Entrée pour générer</p>
        </div>

        <ErrorBanner error={error} onDismiss={clearError} onRetry={handleRetry} />
        {loading && <div className="card p-4"><LoadingDots label={`Génération ${language}...`} /></div>}
        {result && !loading && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-orange-100 dark:border-orange-900/30">
              <Terminal size={14} className="text-orange-500" />
              <span className="text-xs font-display font-semibold text-orange-500 uppercase tracking-wider">Code · {language}</span>
            </div>
            <MarkdownRenderer content={result} />
          </div>
        )}
        {!result && !loading && <EmptyState icon={Code2} title="Générateur de Code" description="LLaMA 3.3 70B génère du code propre, commenté et production-ready dans le langage de ton choix." />}
      </div>
    </div>
  )
}

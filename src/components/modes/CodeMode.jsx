import { useState } from 'react'
import { Code2, Send, Terminal } from 'lucide-react'
import { LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'PHP', 'React JSX', 'HTML/CSS', 'SQL', 'Bash', 'C#', 'Flutter/Dart']

const EXAMPLES = [
  'Crée un hook React pour fetcher une API avec loading/error',
  'Écris une fonction Python pour trier une liste d\'objets',
  'Génère une classe Java avec héritage et polymorphisme',
  'Crée un composant Flutter avec un ListView stylisé',
  'Écris une API REST en PHP avec authentification JWT',
]

export default function CodeMode() {
  const [prompt, setPrompt] = useState('')
  const [language, setLanguage] = useState('JavaScript')
  const [context, setContext] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showContext, setShowContext] = useState(false)

  const generate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language, context }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.text)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card p-4 space-y-3">
          {/* Language selector */}
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button key={l} onClick={() => setLanguage(l)}
                className={`tag cursor-pointer text-xs transition-all ${language === l ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'hover:border-amber-500/30'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Context toggle */}
          <div>
            <button onClick={() => setShowContext(!showContext)}
              className="text-xs text-slate-500 hover:text-amber-400 transition-colors mb-2">
              {showContext ? '− Masquer' : '+ Ajouter'} le contexte du projet
            </button>
            {showContext && (
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                rows={2}
                placeholder="Ex: Application React e-commerce avec Tailwind CSS, API REST Laravel..."
                className="input-field text-xs w-full"
              />
            )}
          </div>

          {/* Examples */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-slate-600">Exemples :</p>
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setPrompt(ex)}
                className="text-xs text-left text-slate-500 hover:text-amber-400 transition-colors px-1 truncate">
                › {ex}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={2}
              placeholder={`Décris le code ${language} que tu veux générer...`}
              className="input-field flex-1 resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) generate() }}
            />
            <button onClick={generate} disabled={!prompt.trim() || loading} className="btn-primary self-end">
              <Send size={15} />
            </button>
          </div>
          <p className="text-[10px] text-slate-600">Ctrl+Entrée pour générer</p>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        {loading && (
          <div className="card p-4">
            <LoadingDots label={`Génération de code ${language}...`} />
          </div>
        )}

        {result && !loading && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-surface-border">
              <Terminal size={14} className="text-amber-400" />
              <span className="text-xs font-display font-semibold text-amber-400 uppercase tracking-wider">Code Généré · {language}</span>
            </div>
            <MarkdownRenderer content={result} />
          </div>
        )}

        {!result && !loading && (
          <EmptyState icon={Code2} title="Générateur de Code" description="Décris le code que tu veux. Gemini génère du code propre, commenté et production-ready dans le langage de ton choix." />
        )}
      </div>
    </div>
  )
}

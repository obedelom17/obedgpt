import { useState } from 'react'
import { Search, ExternalLink, Globe } from 'lucide-react'
import { LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'

const SUGGESTIONS = [
  'Dernières nouvelles en technologie',
  'Prix du Bitcoin aujourd\'hui',
  'Météo à Lomé Togo',
  'Actualités de l\'IA en 2025',
  'Cours de la CFA en EUR',
  'Top des frameworks JavaScript 2025',
]

export default function SearchMode() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const search = async (q) => {
    const searchQuery = q || query.trim()
    if (!searchQuery || loading) return
    setQuery(searchQuery)
    setLoading(true)
    setError(null)
    setResult(null)
    setSources([])
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.text)
      setSources(data.sources || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Search input */}
        <div className="card p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Recherche n'importe quoi sur le web..."
                className="input-field pl-9"
                onKeyDown={e => e.key === 'Enter' && search()}
              />
            </div>
            <button onClick={() => search()} disabled={!query.trim() || loading} className="btn-primary">
              <Search size={15} />
              Chercher
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => search(s)}
                className="tag cursor-pointer text-xs hover:border-amber-500/40 transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        {loading && (
          <div className="card p-4">
            <LoadingDots label="Recherche sur le web en cours..." />
          </div>
        )}

        {result && !loading && (
          <div className="card p-5 animate-slide-up space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
              <Globe size={14} className="text-amber-400" />
              <span className="text-xs font-display font-semibold text-amber-400 uppercase tracking-wider">Résultats Web</span>
              {sources.length > 0 && (
                <span className="ml-auto text-xs text-slate-500">{sources.length} source{sources.length > 1 ? 's' : ''}</span>
              )}
            </div>
            <MarkdownRenderer content={result} />
            {sources.length > 0 && (
              <div className="pt-3 border-t border-surface-border">
                <p className="text-xs font-display font-semibold text-slate-500 uppercase tracking-wider mb-2">Sources</p>
                <div className="space-y-1.5">
                  {sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-slate-400 hover:text-amber-400 transition-colors p-2 rounded-lg hover:bg-navy-700/40">
                      <ExternalLink size={11} className="flex-shrink-0" />
                      <span className="truncate">{s.title || s.uri}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <EmptyState icon={Search} title="Recherche Web avec Gemini" description="Gemini recherche sur Internet en temps réel et synthétise les informations avec les sources citées." />
        )}
      </div>
    </div>
  )
}

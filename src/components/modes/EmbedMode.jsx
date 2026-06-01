import { useState } from 'react'
import { BarChart2, Plus, X, Search } from 'lucide-react'
import { LoadingDots, ErrorBanner, EmptyState } from '../ui'

export default function EmbedMode() {
  const [texts, setTexts] = useState(['', ''])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const addText = () => setTexts(prev => [...prev, ''])
  const removeText = (i) => setTexts(prev => prev.filter((_, idx) => idx !== i))
  const updateText = (i, v) => setTexts(prev => prev.map((t, idx) => idx === i ? v : t))

  const search = async () => {
    const validTexts = texts.filter(t => t.trim())
    if (!query.trim() || validTexts.length === 0 || loading) return
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch('/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: validTexts, query }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data.results)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-display font-semibold text-stone-500 uppercase tracking-wider">Textes à comparer</p>
              <button onClick={addText} className="btn-ghost text-xs py-1 px-2 gap-1">
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {texts.map((t, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs text-amber-500/60 font-mono mt-3 w-5 flex-shrink-0">#{i+1}</span>
                  <textarea
                    value={t}
                    onChange={e => updateText(i, e.target.value)}
                    rows={2}
                    placeholder={`Texte ${i+1}...`}
                    className="input-field flex-1 resize-none text-xs"
                  />
                  {texts.length > 2 && (
                    <button onClick={() => removeText(i)} className="text-stone-300 hover:text-red-400 transition-colors mt-3">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Requête de recherche sémantique..."
                className="input-field pl-9"
                onKeyDown={e => e.key === 'Enter' && search()}
              />
            </div>
            <button onClick={search} disabled={!query.trim() || loading} className="btn-primary">
              Comparer
            </button>
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        {loading && <div className="card p-4"><LoadingDots label="Calcul des embeddings..." /></div>}

        {results && !loading && (
          <div className="card p-5 animate-slide-up space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
              <BarChart2 size={14} className="text-orange-500" />
              <span className="text-xs font-display font-semibold text-orange-500 uppercase tracking-wider">Similarité Sémantique</span>
              <span className="ml-auto text-xs text-stone-400 font-mono">requête: "{query}"</span>
            </div>
            {results.map((r, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-700 truncate flex-1 mr-4">{r.text}</span>
                  <span className={`font-mono font-bold flex-shrink-0 ${r.similarity > 0.7 ? 'text-emerald-400' : r.similarity > 0.4 ? 'text-orange-500' : 'text-stone-400'}`}>
                    {(r.similarity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(r.similarity * 100, 2)}%`,
                      background: r.similarity > 0.7 ? '#34D399' : r.similarity > 0.4 ? '#F59E0B' : '#475569'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {!results && !loading && (
          <EmptyState icon={BarChart2} title="Mode Embeddings" description="Compare la similarité sémantique entre textes. L'IA transforme le texte en vecteurs mathématiques et calcule leur proximité." />
        )}
      </div>
    </div>
  )
}

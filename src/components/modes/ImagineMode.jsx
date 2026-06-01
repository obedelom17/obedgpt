import { useState } from 'react'
import { Sparkles, Download } from 'lucide-react'
import { LoadingDots, ErrorBanner, EmptyState } from '../ui'

const STYLES = [
  'Photorealistic', 'Digital art', 'Oil painting', 'Watercolor',
  'Anime', 'Cinematic', '3D render', 'Illustration',
]

const EXAMPLES = [
  'A futuristic city in West Africa at sunset, cyberpunk style',
  'A traditional kente fabric pattern reimagined as digital art',
  'A lion wearing a business suit in a modern office',
  'Mountain landscape with golden hour lighting, photorealistic',
]

export default function ImagineMode() {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('Digital art')
  const [result, setResult] = useState(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const fullPrompt = `${prompt}. Style: ${style}. High quality, detailed.`
      const res = await fetch('/api/imagine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.imageBase64 ? { base64: data.imageBase64, mimeType: data.mimeType } : null)
      setText(data.text || '')
      if (!data.imageBase64 && !data.error) {
        setError("Gemini n'a pas pu générer l'image. Essaie un prompt différent.")
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = `data:${result.mimeType};base64,${result.base64}`
    a.download = `obedgpt-${Date.now()}.png`
    a.click()
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card p-4 space-y-3">
          {/* Style selector */}
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => (
              <button key={s} onClick={() => setStyle(s)}
                className={`tag cursor-pointer text-xs transition-all ${style === s ? 'bg-orange-100 border-orange-400 text-orange-400' : 'hover:border-amber-500/30'}`}>
                {s}
              </button>
            ))}
          </div>

          {/* Examples */}
          <div className="space-y-1">
            <p className="text-xs text-stone-300">Idées :</p>
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setPrompt(ex)}
                className="block text-xs text-left text-stone-400 hover:text-orange-500 transition-colors px-1 w-full truncate">
                › {ex}
              </button>
            ))}
          </div>

          {/* Prompt */}
          <div className="flex gap-2">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={2}
              placeholder="Décris l'image que tu veux créer..."
              className="input-field flex-1 resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) generate() }}
            />
            <button onClick={generate} disabled={!prompt.trim() || loading} className="btn-primary self-end">
              <Sparkles size={15} />
            </button>
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        {loading && (
          <div className="card p-4">
            <LoadingDots label="Génération d'image en cours..." />
          </div>
        )}

        {result && !loading && (
          <div className="card overflow-hidden animate-slide-up">
            <div className="relative group">
              <img
                src={`data:${result.mimeType};base64,${result.base64}`}
                alt="Image générée"
                className="w-full object-contain"
              />
              <div className="absolute inset-0 bg-navy-900/0 group-hover:bg-navy-900/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button onClick={download} className="btn-primary shadow-lg">
                  <Download size={15} />
                  Télécharger
                </button>
              </div>
            </div>
            {text && (
              <div className="p-3 border-t border-surface-border text-xs text-stone-500">{text}</div>
            )}
          </div>
        )}

        {!result && !loading && (
          <EmptyState icon={Sparkles} title="Mode Imagine" description="Génère des images avec Gemini 2.0 Flash Image Generation. Décris ta vision, choisis un style et laisse l'IA créer." />
        )}
      </div>
    </div>
  )
}

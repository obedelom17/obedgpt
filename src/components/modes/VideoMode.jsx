import { useState } from 'react'
import { Video, Send } from 'lucide-react'
import { FileUploadZone, LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'

const PROMPTS = [
  'Décris ce qui se passe',
  'Résume la vidéo',
  'Identifie les scènes clés',
  'Transcris les dialogues',
  'Analyse le contexte',
]

export default function VideoMode() {
  const [file, setFile] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const analyze = async () => {
    if (!file || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoBase64: file.base64,
          mimeType: file.mimeType,
          prompt: prompt || 'Analyse cette vidéo. Décris les scènes, les personnes et le contexte général.',
        }),
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
        <div className="card p-4 space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-300/70">
            ⚠️ Les vidéos volumineuses (&gt;5MB) peuvent dépasser la limite Vercel. Pour de meilleures performances, utilise des clips courts.
          </div>
          <FileUploadZone
            onFile={setFile}
            currentFile={file}
            accept="video/*"
            label="Déposer une vidéo"
            hint="MP4, MOV, AVI, WebM · Max 5MB recommandé"
            maxSizeMB={20}
          />
          {file && (
            <video controls className="w-full rounded-xl border border-surface-border max-h-60"
              src={`data:${file.mimeType};base64,${file.base64}`} />
          )}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {PROMPTS.map(p => (
                <button key={p} onClick={() => setPrompt(p)}
                  className={`tag cursor-pointer text-xs transition-all ${prompt === p ? 'bg-amber-500/20 border-amber-500/40' : 'hover:border-amber-500/30'}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="Question sur la vidéo..."
                className="input-field flex-1"
                onKeyDown={e => e.key === 'Enter' && analyze()} />
              <button onClick={analyze} disabled={!file || loading} className="btn-primary">
                <Send size={15} /> Analyser
              </button>
            </div>
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />
        {loading && <div className="card p-4"><LoadingDots label="Analyse vidéo en cours..." /></div>}
        {result && !loading && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-surface-border">
              <Video size={14} className="text-amber-400" />
              <span className="text-xs font-display font-semibold text-amber-400 uppercase tracking-wider">Analyse Vidéo</span>
            </div>
            <MarkdownRenderer content={result} />
          </div>
        )}
        {!file && !result && (
          <EmptyState icon={Video} title="Mode Vidéo" description="Charge une vidéo et Gemini analysera son contenu, décrira les scènes, et répondra à tes questions." />
        )}
      </div>
    </div>
  )
}

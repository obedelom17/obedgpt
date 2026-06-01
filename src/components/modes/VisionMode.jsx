import { useState } from 'react'
import { Eye, Send } from 'lucide-react'
import { FileUploadZone, LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'

const PROMPTS = [
  'Décris cette image en détail',
  'Que vois-tu dans cette image ?',
  'Extrais tout le texte visible',
  'Identifie les objets présents',
  'Analyse la composition artistique',
  'Quels problèmes ou anomalies vois-tu ?',
]

export default function VisionMode() {
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
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: file.base64,
          mimeType: file.mimeType,
          prompt: prompt || 'Décris cette image en détail.',
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
          <FileUploadZone
            onFile={setFile}
            currentFile={file}
            accept="image/*"
            label="Déposer une image"
            hint="JPG, PNG, WebP, GIF · Max 10MB"
          />

          {file && (
            <div className="rounded-xl overflow-hidden border border-surface-border max-h-72">
              <img
                src={`data:${file.mimeType};base64,${file.base64}`}
                alt="Aperçu"
                className="w-full h-full object-contain bg-navy-950"
              />
            </div>
          )}

          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className={`tag cursor-pointer transition-all text-xs ${prompt === p ? 'bg-amber-500/20 border-amber-500/40' : 'hover:border-amber-500/30'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Que veux-tu savoir sur cette image ?"
                className="input-field flex-1"
                onKeyDown={e => e.key === 'Enter' && analyze()}
              />
              <button onClick={analyze} disabled={!file || loading} className="btn-primary">
                <Send size={15} />
                Analyser
              </button>
            </div>
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        {loading && (
          <div className="card p-4">
            <LoadingDots label="Analyse de l'image en cours..." />
          </div>
        )}

        {result && !loading && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-surface-border">
              <Eye size={14} className="text-amber-400" />
              <span className="text-xs font-display font-semibold text-amber-400 uppercase tracking-wider">Analyse Vision</span>
            </div>
            <MarkdownRenderer content={result} />
          </div>
        )}

        {!file && !result && (
          <EmptyState icon={Eye} title="Mode Vision" description="Charge une image pour que Gemini l'analyse, décrive son contenu, extraie du texte, ou réponde à tes questions." />
        )}
      </div>
    </div>
  )
}

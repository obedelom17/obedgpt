import { useState } from 'react'
import { Mic, Send } from 'lucide-react'
import { FileUploadZone, LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'

const PROMPTS = [
  'Transcris cet audio',
  'Résume le contenu',
  'Qui parle ? De quoi ?',
  'Identifie les points clés',
  'Détecte la langue parlée',
]

export default function AudioMode() {
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
      const res = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: file.base64,
          mimeType: file.mimeType,
          prompt: prompt || 'Transcris cet audio et fais-en un résumé complet.',
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
            accept="audio/*"
            label="Déposer un fichier audio"
            hint="MP3, WAV, OGG, M4A, FLAC · Max 10MB"
          />
          {file && (
            <audio controls className="w-full rounded-lg" src={`data:${file.mimeType};base64,${file.base64}`} />
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
                placeholder="Que veux-tu faire avec cet audio ?"
                className="input-field flex-1"
                onKeyDown={e => e.key === 'Enter' && analyze()} />
              <button onClick={analyze} disabled={!file || loading} className="btn-primary">
                <Send size={15} /> Analyser
              </button>
            </div>
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />
        {loading && <div className="card p-4"><LoadingDots label="Analyse audio en cours..." /></div>}
        {result && !loading && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-surface-border">
              <Mic size={14} className="text-amber-400" />
              <span className="text-xs font-display font-semibold text-amber-400 uppercase tracking-wider">Analyse Audio</span>
            </div>
            <MarkdownRenderer content={result} />
          </div>
        )}
        {!file && !result && (
          <EmptyState icon={Mic} title="Mode Audio" description="Charge un fichier audio. Gemini peut transcrire, résumer, détecter la langue et analyser le contenu parlé." />
        )}
      </div>
    </div>
  )
}

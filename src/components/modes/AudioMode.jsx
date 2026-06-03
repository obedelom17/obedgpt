import { useState } from 'react'
import { Mic, Send } from 'lucide-react'
import { FileUploadZone, LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'
import { useApiCall } from '../../hooks/useApiCall'

const PROMPTS = ['Transcris cet audio', 'Résume le contenu', 'Identifie les points clés', 'Qui parle ? De quoi ?', 'Détecte la langue parlée']

export default function AudioMode() {
  const [file, setFile]     = useState(null)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState(null)
  const { loading, error, call, retry, clearError } = useApiCall()

  const analyze = async () => {
    if (!file || loading) return
    setResult(null)
    const data = await call('/api/audio', { audioBase64: file.base64, mimeType: file.mimeType, prompt: prompt })
    if (data) setResult(data.text)
  }

  const handleRetry = async () => { const data = await retry(); if (data) setResult(data.text) }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card p-4 space-y-4">
          <FileUploadZone onFile={f => { setFile(f); setResult(null) }} currentFile={file}
            accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/m4a,audio/flac,audio/webm"
            label="Déposer un fichier audio" hint="MP3, WAV, OGG, M4A, FLAC · Max 25MB" maxSizeMB={25} />
          {file && <audio controls className="w-full rounded-lg" src={`data:${file.mimeType};base64,${file.base64}`} />}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {PROMPTS.map(p => (
                <button key={p} onClick={() => setPrompt(p)} className={`tag text-xs ${prompt === p ? 'active-tag' : ''}`}>{p}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()}
                placeholder="Que veux-tu faire avec cet audio ?" className="input-field flex-1" />
              <button onClick={analyze} disabled={!file || loading} className="btn-primary"><Send size={15} /> Analyser</button>
            </div>
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={clearError} onRetry={handleRetry} />
        {loading && <div className="card p-4"><LoadingDots label="Transcription en cours..." /></div>}
        {result && !loading && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-orange-100">
              <Mic size={14} className="text-orange-500" />
              <span className="text-xs font-display font-semibold text-orange-500 uppercase tracking-wider">Transcription Audio</span>
            </div>
            <MarkdownRenderer content={result} />
          </div>
        )}
        {!file && !result && <EmptyState icon={Mic} title="Mode Audio" description="Charge un fichier audio. L'IA transcrit et analyse le contenu avec précision." />}
      </div>
    </div>
  )
}

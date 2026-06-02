import { useState } from 'react'
import { Eye, Send } from 'lucide-react'
import { FileUploadZone, LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'
import { useApiCall } from '../../hooks/useApiCall'

const PROMPTS = ['Décris cette image en détail', 'Extrais tout le texte visible', 'Identifie les objets présents', 'Analyse la composition', 'Quels problèmes vois-tu ?', 'Explique ce schéma']

export default function VisionMode() {
  const [file, setFile]     = useState(null)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState(null)
  const { loading, error, call, retry, clearError } = useApiCall()

  const analyze = async () => {
    if (!file || loading) return
    setResult(null)
    const data = await call('/api/vision', { imageBase64: file.base64, mimeType: file.mimeType, prompt: prompt || 'Décris cette image en détail.' })
    if (data) setResult(data.text)
  }

  const handleRetry = async () => { const data = await retry(); if (data) setResult(data.text) }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card p-4 space-y-4">
          <FileUploadZone onFile={f => { setFile(f); setResult(null) }} currentFile={file}
            accept="image/jpeg,image/png,image/webp,image/gif" label="Déposer une image" hint="JPG, PNG, WebP · Max 10MB" />
          {file && (
            <div className="rounded-xl overflow-hidden border border-orange-100 max-h-72">
              <img src={`data:${file.mimeType};base64,${file.base64}`} alt="Aperçu" className="w-full h-full object-contain bg-stone-50" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {PROMPTS.map(p => (
                <button key={p} onClick={() => setPrompt(p)} className={`tag text-xs ${prompt === p ? 'active-tag' : ''}`}>{p}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()}
                placeholder="Que veux-tu savoir sur cette image ?" className="input-field flex-1" />
              <button onClick={analyze} disabled={!file || loading} className="btn-primary"><Send size={15} /> Analyser</button>
            </div>
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={clearError} onRetry={handleRetry} />
        {loading && <div className="card p-4"><LoadingDots label="Analyse de l'image..." /></div>}
        {result && !loading && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-orange-100">
              <Eye size={14} className="text-orange-500" />
              <span className="text-xs font-display font-semibold text-orange-500 uppercase tracking-wider">Analyse Vision</span>
            </div>
            <MarkdownRenderer content={result} />
          </div>
        )}
        {!file && !result && <EmptyState icon={Eye} title="Mode Vision" description="Charge une image. L'IA peut décrire, extraire du texte, identifier des objets et analyser le contenu visuel." />}
      </div>
    </div>
  )
}

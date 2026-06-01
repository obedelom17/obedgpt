import { useState } from 'react'
import { FileText, Send } from 'lucide-react'
import { FileUploadZone, LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'

const PROMPTS = [
  'Résume ce document',
  'Quels sont les points clés ?',
  'Extrais les données importantes',
  'Fais une analyse critique',
  'Liste les actions à entreprendre',
  'Traduis en français',
]

export default function DocumentMode() {
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
      const res = await fetch('/api/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: file.base64,
          mimeType: file.mimeType,
          prompt: prompt || 'Analyse et résume ce document.',
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
            accept=".pdf,.txt,.md,.csv,.json,.html,.xml"
            label="Déposer un document"
            hint="PDF, TXT, MD, CSV, JSON · Max 10MB"
          />
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className={`tag cursor-pointer transition-all text-xs ${prompt === p ? 'bg-orange-100 border-orange-400' : 'hover:border-amber-500/30'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Que veux-tu faire avec ce document ?"
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
            <LoadingDots label="Lecture du document..." />
          </div>
        )}

        {result && !loading && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-surface-border">
              <FileText size={14} className="text-orange-500" />
              <span className="text-xs font-display font-semibold text-orange-500 uppercase tracking-wider">Analyse Document</span>
            </div>
            <MarkdownRenderer content={result} />
          </div>
        )}

        {!file && !result && (
          <EmptyState icon={FileText} title="Mode Documents" description="Charge un PDF, TXT, CSV ou tout document texte. Gemini peut résumer, extraire des données, traduire ou analyser ton fichier." />
        )}
      </div>
    </div>
  )
}

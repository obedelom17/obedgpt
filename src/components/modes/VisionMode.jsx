import { useState, useRef } from 'react'
import { Eye, Send, X, Upload, ImagePlus } from 'lucide-react'
import { LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'
import { useApiCall } from '../../hooks/useApiCall'

const PROMPTS = ['Décris cette image en détail', 'Extrais tout le texte visible', 'Identifie les objets présents', 'Analyse la composition', 'Quels problèmes vois-tu ?', 'Compare ces images']
const MAX_IMAGES = 4
const MAX_SIZE_MB = 10

// Redimensionne et recompresse côté navigateur (1568px = la taille max que
// Gemini exploite réellement ; au-delà, l'image est sous-échantillonnée côté
// serveur de toute façon). Ça réduit fortement le poids envoyé, donc la
// latence — important quand on attache plusieurs images à la fois.
function compressImage(file, maxSize = 1568) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("Fichier image invalide ou corrompu."))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve({ base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg' })
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function VisionMode() {
  const [images, setImages] = useState([])  // [{ name, base64, mimeType }]
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState(null)
  const [imgError, setImgError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const { loading, error, call, retry, clearError } = useApiCall()
  const fileInputRef = useRef(null)

  const addFiles = async (fileList) => {
    setImgError(null)
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    if (files.length === 0) return
    if (images.length + files.length > MAX_IMAGES) { setImgError(`Maximum ${MAX_IMAGES} images à la fois.`); return }
    const tooLarge = files.find(f => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (tooLarge) { setImgError(`${tooLarge.name} dépasse ${MAX_SIZE_MB}MB.`); return }

    try {
      const compressed = await Promise.all(files.map(async (f) => ({ name: f.name, ...(await compressImage(f)) })))
      setImages(prev => [...prev, ...compressed])
      setResult(null)
    } catch (err) {
      setImgError(err.message || "Impossible de traiter une des images.")
    }
  }

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i))

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files = Array.from(items).filter(it => it.type?.startsWith('image/')).map(it => it.getAsFile()).filter(Boolean)
    if (files.length > 0) { e.preventDefault(); addFiles(files) }
  }

  const analyze = async () => {
    if (images.length === 0 || loading) return
    setResult(null)
    const data = await call('/api/vision', { images: images.map(({ base64, mimeType }) => ({ base64, mimeType })), prompt: prompt || 'Décris cette image en détail.' })
    if (data) setResult(data.text)
  }

  const handleRetry = async () => { const data = await retry(); if (data) setResult(data.text) }

  return (
    <div className="h-full overflow-y-auto p-4" onPaste={handlePaste}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card p-4 space-y-4">
          {/* Zone de dépôt multi-images */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
            className={`drop-zone p-5 flex flex-col items-center gap-2 cursor-pointer text-center ${dragOver ? 'drag-over' : ''}`}
          >
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = '' }} aria-label="Choisir des images" />
            <Upload size={20} className="text-orange-400" />
            <p className="text-sm text-stone-600">Déposer jusqu'à {MAX_IMAGES} images (ou Ctrl+V)</p>
            <p className="text-xs text-stone-400">JPG, PNG, WebP · Max {MAX_SIZE_MB}MB chacune</p>
          </div>

          {imgError && <p className="text-xs text-red-500">{imgError}</p>}

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-orange-100 aspect-square group">
                  <img src={`data:${img.mimeType};base64,${img.base64}`} alt={img.name} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)} aria-label={`Retirer ${img.name}`}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button onClick={() => fileInputRef.current?.click()} aria-label="Ajouter une image"
                  className="aspect-square rounded-xl border-2 border-dashed border-orange-200 text-orange-400 hover:bg-orange-50 flex items-center justify-center transition-colors">
                  <ImagePlus size={18} />
                </button>
              )}
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
                placeholder="Que veux-tu savoir sur ces images ?" aria-label="Instruction pour l'analyse" className="input-field flex-1" />
              <button onClick={analyze} disabled={images.length === 0 || loading} className="btn-primary"><Send size={15} /> Analyser</button>
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
        {images.length === 0 && !result && <EmptyState icon={Eye} title="Mode Vision" description="Charge une ou plusieurs images (glisser-déposer, sélection ou Ctrl+V). L'IA peut décrire, extraire du texte, comparer et analyser le contenu visuel." />}
      </div>
    </div>
  )
}

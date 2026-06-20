import { useState, useRef, useEffect } from 'react'
import { Mic, Send, Square, Download } from 'lucide-react'
import { FileUploadZone, LoadingDots, MarkdownRenderer, ErrorBanner, EmptyState } from '../ui'
import { useApiCall } from '../../hooks/useApiCall'

const PROMPTS = ['Transcris cet audio', 'Résume le contenu', 'Identifie les points clés', 'Qui parle ? De quoi ?', 'Détecte la langue parlée']

// Ordre de préférence : audio/ogg (Opus) est explicitement listé dans les
// types audio supportés par l'API Gemini ; on s'en rapproche le plus
// possible selon ce que le navigateur sait réellement enregistrer.
const RECORDING_MIME_CANDIDATES = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

function pickRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  return RECORDING_MIME_CANDIDATES.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

export default function AudioMode() {
  const [file, setFile]     = useState(null)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [recordError, setRecordError] = useState(null)
  const { loading, error, call, retry, clearError } = useApiCall()

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const canvasRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const rafRef = useRef(null)

  const stopVisualizer = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    analyserRef.current = null
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close().catch(() => {})
    audioCtxRef.current = null
  }

  useEffect(() => () => {
    // Coupe le micro / le visualiseur si on quitte le mode en plein enregistrement.
    streamRef.current?.getTracks().forEach(t => t.stop())
    clearInterval(timerRef.current)
    stopVisualizer()
  }, [])

  // Petit visualiseur de forme d'onde en direct pendant l'enregistrement
  // (Web Audio API), purement cosmétique mais donne un retour visuel que le
  // micro capte bien du son.
  const startVisualizer = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioCtx()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioCtxRef.current = audioCtx
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.frequencyBinCount)
      const render = () => {
        const canvas = canvasRef.current
        if (!canvas || !analyserRef.current) return
        analyserRef.current.getByteTimeDomainData(data)
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.lineWidth = 2
        ctx.strokeStyle = '#F97316'
        ctx.beginPath()
        const slice = canvas.width / data.length
        let x = 0
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 128.0
          const y = (v * canvas.height) / 2
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          x += slice
        }
        ctx.stroke()
        rafRef.current = requestAnimationFrame(render)
      }
      render()
    } catch { /* visualiseur facultatif : on continue sans si indisponible */ }
  }

  const startRecording = async () => {
    setRecordError(null)
    const mimeType = pickRecordingMimeType()
    if (mimeType === null) { setRecordError("L'enregistrement audio n'est pas supporté par ce navigateur."); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      startVisualizer(stream)
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        clearInterval(timerRef.current)
        stopVisualizer()
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' })
        const cleanMimeType = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0]
        const reader = new FileReader()
        reader.onload = e => {
          setFile({ file: blob, base64: e.target.result.split(',')[1], mimeType: cleanMimeType, name: `enregistrement-${Date.now()}.${cleanMimeType.split('/')[1] || 'webm'}` })
          setResult(null)
        }
        reader.onerror = () => setRecordError("Impossible de traiter l'enregistrement.")
        reader.readAsDataURL(blob)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setRecordSeconds(0)
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000)
    } catch (err) {
      setRecordError(err.name === 'NotAllowedError'
        ? "Accès au micro refusé. Autorise le micro dans les réglages de ton navigateur."
        : "Impossible d'accéder au micro.")
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const analyze = async () => {
    if (!file || loading) return
    setResult(null)
    const data = await call('/api/audio', { audioBase64: file.base64, mimeType: file.mimeType, prompt: prompt })
    if (data) setResult(data.text)
  }

  const handleRetry = async () => { const data = await retry(); if (data) setResult(data.text) }

  const downloadTranscript = () => {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `obedgpt-transcription-${Date.now()}.txt`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card p-4 space-y-4">
          <FileUploadZone onFile={f => { setFile(f); setResult(null) }} currentFile={file}
            accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/m4a,audio/flac,audio/webm"
            label="Déposer un fichier audio" hint="MP3, WAV, OGG, M4A, FLAC · Max 25MB" maxSizeMB={25} />

          {/* Enregistrement micro en direct */}
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-stone-600">
                {recording ? (
                  <span className="flex items-center gap-2 text-red-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
                    Enregistrement… {formatTime(recordSeconds)}
                  </span>
                ) : (
                  <span>Ou enregistre directement depuis ton micro</span>
                )}
              </div>
              {!recording ? (
                <button onClick={startRecording} aria-label="Démarrer l'enregistrement micro" className="btn-primary flex-shrink-0">
                  <Mic size={15} /> Enregistrer
                </button>
              ) : (
                <button onClick={stopRecording} aria-label="Arrêter l'enregistrement" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors flex-shrink-0">
                  <Square size={13} /> Arrêter
                </button>
              )}
            </div>
            {recording && <canvas ref={canvasRef} width={600} height={48} className="w-full h-12 rounded-lg bg-white/60" aria-hidden="true" />}
          </div>
          {recordError && <p className="text-xs text-red-500 px-1">{recordError}</p>}

          {file && <audio controls className="w-full rounded-lg" src={`data:${file.mimeType};base64,${file.base64}`} />}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {PROMPTS.map(p => (
                <button key={p} onClick={() => setPrompt(p)} className={`tag text-xs ${prompt === p ? 'active-tag' : ''}`}>{p}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()}
                placeholder="Que veux-tu faire avec cet audio ?" aria-label="Instruction pour l'analyse audio" className="input-field flex-1" />
              <button onClick={analyze} disabled={!file || loading} className="btn-primary"><Send size={15} /> Analyser</button>
            </div>
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={clearError} onRetry={handleRetry} />
        {loading && <div className="card p-4"><LoadingDots label="Transcription en cours..." /></div>}
        {result && !loading && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-orange-100">
              <div className="flex items-center gap-2">
                <Mic size={14} className="text-orange-500" />
                <span className="text-xs font-display font-semibold text-orange-500 uppercase tracking-wider">Transcription Audio</span>
              </div>
              <button onClick={downloadTranscript} aria-label="Télécharger la transcription en .txt" title="Télécharger en .txt"
                className="text-stone-400 hover:text-orange-500 transition-colors"><Download size={14} /></button>
            </div>
            <MarkdownRenderer content={result} />
          </div>
        )}
        {!file && !result && <EmptyState icon={Mic} title="Mode Audio" description="Charge un fichier audio ou enregistre depuis ton micro. L'IA transcrit et analyse le contenu avec précision." />}
      </div>
    </div>
  )
}

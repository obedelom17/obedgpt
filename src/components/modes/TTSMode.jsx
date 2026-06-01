import { useState, useRef, useEffect } from 'react'
import { Volume2, Play, Pause, Square, Wand2 } from 'lucide-react'
import { LoadingDots, ErrorBanner, EmptyState } from '../ui'

const VOICES_PRESETS = [
  { label: 'Vitesse', key: 'rate', min: 0.5, max: 2, step: 0.1, default: 1 },
  { label: 'Tonalité', key: 'pitch', min: 0, max: 2, step: 0.1, default: 1 },
  { label: 'Volume', key: 'volume', min: 0, max: 1, step: 0.05, default: 1 },
]

export default function TTSMode() {
  const [text, setText] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [settings, setSettings] = useState({ rate: 1, pitch: 1, volume: 1 })
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const utteranceRef = useRef(null)

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices()
      setVoices(v)
      if (v.length > 0) {
        const fr = v.find(x => x.lang.startsWith('fr')) || v[0]
        setSelectedVoice(fr)
      }
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => { window.speechSynthesis.cancel() }
  }, [])

  const generateWithAI = async () => {
    if (!aiPrompt.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Génère un texte de haute qualité à lire à voix haute sur le sujet suivant: ${aiPrompt}. Le texte doit être fluide, naturel et engageant. Environ 150-200 mots.` }],
          systemPrompt: 'Tu génères des textes optimisés pour la lecture à voix haute. Évite les listes à puces, préfère des phrases bien construites.',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setText(data.text)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const speak = () => {
    if (!text.trim()) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.rate = settings.rate
    utterance.pitch = settings.pitch
    utterance.volume = settings.volume
    utterance.onstart = () => { setPlaying(true); setPaused(false) }
    utterance.onend = () => { setPlaying(false); setPaused(false) }
    utterance.onerror = () => { setPlaying(false); setPaused(false) }
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const pause = () => {
    if (playing && !paused) {
      window.speechSynthesis.pause()
      setPaused(true)
    } else if (paused) {
      window.speechSynthesis.resume()
      setPaused(false)
    }
  }

  const stop = () => {
    window.speechSynthesis.cancel()
    setPlaying(false)
    setPaused(false)
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* AI text generator */}
        <div className="card p-4 space-y-3">
          <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">Générer un texte avec Gemini</p>
          <div className="flex gap-2">
            <input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Sujet pour générer un texte... (ex: l'intelligence artificielle en Afrique)"
              className="input-field flex-1"
              onKeyDown={e => e.key === 'Enter' && generateWithAI()}
            />
            <button onClick={generateWithAI} disabled={!aiPrompt.trim() || loading} className="btn-primary">
              <Wand2 size={15} />
            </button>
          </div>
          {loading && <LoadingDots label="Génération du texte..." />}
        </div>

        {/* Text area */}
        <div className="card p-4 space-y-3">
          <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">Texte à lire</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            placeholder="Écris ou colle un texte à lire à voix haute..."
            className="input-field w-full resize-none"
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{text.length} caractères · ~{Math.ceil(text.split(' ').filter(Boolean).length / 150)} min</span>
          </div>
        </div>

        {/* Voice settings */}
        <div className="card p-4 space-y-4">
          <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">Paramètres voix</p>
          {voices.length > 0 && (
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">Voix</label>
              <select
                value={selectedVoice?.name || ''}
                onChange={e => setSelectedVoice(voices.find(v => v.name === e.target.value))}
                className="input-field text-xs"
              >
                {voices.map(v => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
          )}
          {VOICES_PRESETS.map(({ label, key, min, max, step, default: def }) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{label}</span>
                <span className="font-mono text-amber-400">{settings[key].toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={settings[key]}
                onChange={e => setSettings(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                className="w-full accent-amber-500 h-1"
              />
            </div>
          ))}
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={speak} disabled={!text.trim() || playing} className="btn-primary gap-2">
            <Play size={16} />
            Lire
          </button>
          {playing && (
            <>
              <button onClick={pause} className="btn-ghost">
                {paused ? <Play size={16} /> : <Pause size={16} />}
                {paused ? 'Reprendre' : 'Pause'}
              </button>
              <button onClick={stop} className="btn-ghost text-red-400 hover:text-red-300">
                <Square size={16} />
                Stop
              </button>
            </>
          )}
          {playing && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-amber-400 font-mono">{paused ? 'En pause' : 'Lecture...'}</span>
            </div>
          )}
        </div>

        {!text && (
          <EmptyState icon={Volume2} title="Mode Text-to-Speech" description="Génère un texte avec Gemini ou colle le tien, puis écoute-le avec les voix de ton navigateur." />
        )}
      </div>
    </div>
  )
}

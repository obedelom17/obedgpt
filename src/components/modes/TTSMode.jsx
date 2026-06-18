import { useState, useEffect } from 'react'
import { Volume2, Play, Pause, Square, Wand2, AlertTriangle } from 'lucide-react'
import { LoadingDots, ErrorBanner } from '../ui'
import { useApiCall } from '../../hooks/useApiCall'

const SLIDERS = [
  { label: 'Vitesse',  key: 'rate',   min: 0.5, max: 2,   step: 0.1,  default: 1 },
  { label: 'Tonalité', key: 'pitch',  min: 0,   max: 2,   step: 0.1,  default: 1 },
  { label: 'Volume',   key: 'volume', min: 0,   max: 1,   step: 0.05, default: 1 },
]

export default function TTSMode() {
  const [text, setText]         = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [voices, setVoices]     = useState([])
  const [voice, setVoice]       = useState(null)
  const [settings, setSettings] = useState({ rate: 1, pitch: 1, volume: 1 })
  const [playing, setPlaying]   = useState(false)
  const [paused, setPaused]     = useState(false)
  const [ttsSupported, setTtsSupported] = useState(true)
  const { loading, error, call, clearError } = useApiCall()

  useEffect(() => {
    if (!window.speechSynthesis) { setTtsSupported(false); return }
    const load = () => {
      const v = window.speechSynthesis.getVoices()
      setVoices(v)
      if (v.length > 0) setVoice(v.find(x => x.lang.startsWith('fr')) || v[0])
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => window.speechSynthesis.cancel()
  }, [])

  const generateText = async () => {
    if (!aiPrompt.trim() || loading) return
    const data = await call('/api/chat', {
      messages: [{ role: 'user', content: `Génère un texte fluide à lire à voix haute sur : ${aiPrompt}. Environ 150 mots, sans listes ni bulletins.` }],
      systemPrompt: 'Tu génères des textes optimisés pour la lecture à voix haute. Phrases bien construites, naturelles et engageantes.',
    })
    if (data) setText(data.text)
  }

  const speak = () => {
    if (!text.trim() || !ttsSupported) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    if (voice) utt.voice = voice
    utt.rate    = settings.rate
    utt.pitch   = settings.pitch
    utt.volume  = settings.volume
    utt.onstart = () => { setPlaying(true); setPaused(false) }
    utt.onend   = () => { setPlaying(false); setPaused(false) }
    utt.onerror = () => { setPlaying(false); setPaused(false) }
    window.speechSynthesis.speak(utt)
  }

  const togglePause = () => {
    if (paused) { window.speechSynthesis.resume(); setPaused(false) }
    else        { window.speechSynthesis.pause();  setPaused(true)  }
  }

  const stop = () => { window.speechSynthesis.cancel(); setPlaying(false); setPaused(false) }

  if (!ttsSupported) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="card p-8 text-center max-w-sm">
          <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3" />
          <h3 className="font-display font-semibold text-stone-800 mb-2">Navigateur non supporté</h3>
          <p className="text-sm text-stone-500">La synthèse vocale nécessite un navigateur moderne (Chrome, Edge, Safari, Firefox).</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* AI text generator */}
        <div className="card p-4 space-y-3">
          <p className="text-xs font-display font-semibold text-stone-500 uppercase tracking-wider">Générer un texte avec l'IA</p>
          <div className="flex gap-2">
            <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="Sujet... (ex: l'histoire de l'Afrique de l'Ouest)"
              className="input-field flex-1" onKeyDown={e => e.key === 'Enter' && generateText()} />
            <button onClick={generateText} disabled={!aiPrompt.trim() || loading} aria-label="Générer le texte avec l'IA" className="btn-primary"><Wand2 size={15} /></button>
          </div>
          {loading && <LoadingDots label="Génération du texte..." />}
        </div>

        <ErrorBanner error={error} onDismiss={clearError} />

        {/* Text area */}
        <div className="card p-4 space-y-3">
          <p className="text-xs font-display font-semibold text-stone-500 uppercase tracking-wider">Texte à lire</p>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
            placeholder="Écris ou génère un texte à lire à voix haute..."
            className="input-field w-full resize-none" />
          <p className="text-xs text-stone-400">{text.split(' ').filter(Boolean).length} mots · {Math.ceil(text.split(' ').filter(Boolean).length / 150)} min</p>
        </div>

        {/* Voice settings */}
        <div className="card p-4 space-y-4">
          <p className="text-xs font-display font-semibold text-stone-500 uppercase tracking-wider">Paramètres voix</p>
          {voices.length > 0 && (
            <div>
              <label className="text-xs text-stone-500 block mb-1.5">Voix</label>
              <select value={voice?.name || ''} onChange={e => setVoice(voices.find(v => v.name === e.target.value))}
                className="input-field text-xs">
                {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
              </select>
            </div>
          )}
          {SLIDERS.map(({ label, key, min, max, step }) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-stone-400 mb-1.5">
                <span>{label}</span>
                <span className="font-mono text-orange-500">{settings[key].toFixed(1)}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={settings[key]}
                onChange={e => setSettings(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                className="w-full accent-orange-500 h-1" />
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={speak} disabled={!text.trim() || playing} className="btn-primary">
            <Play size={16} /> Lire
          </button>
          {playing && (
            <>
              <button onClick={togglePause} className="btn-ghost">
                {paused ? <Play size={16} /> : <Pause size={16} />}
                {paused ? 'Reprendre' : 'Pause'}
              </button>
              <button onClick={stop} className="btn-ghost text-red-400 hover:text-red-500">
                <Square size={16} /> Stop
              </button>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs text-orange-500 font-mono">{paused ? 'En pause' : 'Lecture...'}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

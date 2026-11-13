import { useState, useEffect, useMemo } from 'react'
import { Play, Pause, Square, Wand2, AlertTriangle } from 'lucide-react'
import { LoadingDots, ErrorBanner } from '../ui'
import { useApiCall } from '../../hooks/useApiCall'

const SLIDERS = [
  { label: 'Vitesse',  key: 'rate',   min: 0.5, max: 2, step: 0.1 },
  { label: 'Tonalité', key: 'pitch',  min: 0,   max: 2, step: 0.1 },
  { label: 'Volume',   key: 'volume', min: 0,   max: 1, step: 0.05 },
]

export default function TTSMode() {
  const [text, setText] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [voices, setVoices] = useState([])
  const [voice, setVoice] = useState(null)
  const [settings, setSettings] = useState({ rate: 1, pitch: 1, volume: 1 })
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [ttsSupported, setTtsSupported] = useState(true)
  const [boundaryIndex, setBoundaryIndex] = useState(null) // position du mot en cours (karaoké)
  const { loading, error, call, clearError } = useApiCall()

  // Découpe le texte en segments mot/espace avec leur position, pour
  // surligner le mot prononcé via l'évènement `onboundary` (effet karaoké).
  const tokens = useMemo(() => {
    const list = []
    const re = /(\s+)|(\S+)/g
    let m
    while ((m = re.exec(text))) list.push({ text: m[0], start: m.index, isWord: !!m[2] })
    return list
  }, [text])

  const currentTokenIdx = useMemo(() => {
    if (boundaryIndex == null) return -1
    let idx = -1
    for (let i = 0; i < tokens.length; i++) if (tokens[i].isWord && tokens[i].start <= boundaryIndex) idx = i
    return idx
  }, [boundaryIndex, tokens])

  useEffect(() => {
    if (!window.speechSynthesis) { setTtsSupported(false); return }
    const load = () => {
      const v = window.speechSynthesis.getVoices()
      setVoices(v)
      if (v.length > 0) setVoice(prev => prev || v.find(x => x.lang.startsWith('fr')) || v[0])
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
    setBoundaryIndex(null)
    const utt = new SpeechSynthesisUtterance(text)
    if (voice) utt.voice = voice
    utt.rate = settings.rate
    utt.pitch = settings.pitch
    utt.volume = settings.volume
    utt.onstart = () => { setPlaying(true); setPaused(false) }
    utt.onend = () => { setPlaying(false); setPaused(false); setBoundaryIndex(null) }
    utt.onerror = () => { setPlaying(false); setPaused(false); setBoundaryIndex(null) }
    // Le karaoké mot par mot dépend du navigateur (solide sur Chrome/Edge,
    // plus limité sur Firefox/Safari) : affiché seulement si l'évènement part.
    utt.onboundary = (e) => { if (e.name === 'word' || e.name === undefined) setBoundaryIndex(e.charIndex) }
    window.speechSynthesis.speak(utt)
  }

  const togglePause = () => {
    if (paused) { window.speechSynthesis.resume(); setPaused(false) }
    else { window.speechSynthesis.pause(); setPaused(true) }
  }
  const stop = () => { window.speechSynthesis.cancel(); setPlaying(false); setPaused(false); setBoundaryIndex(null) }

  const words = text.split(/\s+/).filter(Boolean).length

  if (!ttsSupported) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="card p-8 text-center max-w-sm">
          <AlertTriangle size={28} className="text-warn mx-auto mb-3" />
          <h3 className="font-display font-semibold mb-2">Navigateur non supporté</h3>
          <p className="text-sm text-ink2">La synthèse vocale nécessite un navigateur récent (Chrome, Edge, Safari ou Firefox).</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-inner space-y-5">
        <div>
          <h2 className="page-title">Text-to-Speech</h2>
          <p className="page-sub">Écris un texte, ou demande à l'IA d'en écrire un, puis écoute-le avec la voix de ton choix.</p>
        </div>

        <div className="card p-4 space-y-3">
          <label htmlFor="tts-ai" className="field-label !mb-0">Générer un texte avec l'IA</label>
          <div className="flex gap-2">
            <input id="tts-ai" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Sujet, par exemple l'histoire de l'Afrique de l'Ouest"
              className="input-field flex-1" onKeyDown={e => e.key === 'Enter' && generateText()} />
            <button onClick={generateText} disabled={!aiPrompt.trim() || loading} aria-label="Générer le texte avec l'IA" className="btn-primary"><Wand2 size={15} /></button>
          </div>
          {loading && <LoadingDots label="Génération du texte..." />}
        </div>

        <ErrorBanner error={error} onDismiss={clearError} />

        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="field-label !mb-0">Texte à lire</span>
            {playing && <span className={`eq ${paused ? 'paused' : ''}`} aria-hidden="true"><i /><i /><i /><i /><i /></span>}
          </div>
          {playing ? (
            <div className="input-field w-full min-h-[150px] whitespace-pre-wrap text-sm leading-relaxed" aria-live="off">
              {tokens.map((t, i) => t.isWord
                ? <span key={i} className={i === currentTokenIdx ? 'karaoke' : ''}>{t.text}</span>
                : <span key={i}>{t.text}</span>
              )}
            </div>
          ) : (
            <textarea value={text} onChange={e => setText(e.target.value)} rows={7} placeholder="Écris ou génère un texte à lire à voix haute..."
              aria-label="Texte à lire à voix haute" className="input-field w-full resize-none" />
          )}
          <p className="text-xs text-ink3 font-mono">{words} mot{words !== 1 ? 's' : ''} · environ {Math.max(words ? 1 : 0, Math.ceil(words / 150))} min</p>
        </div>

        <div className="card p-4 space-y-4">
          <span className="field-label !mb-0">Voix</span>
          {voices.length > 0 && (
            <select value={voice?.name || ''} onChange={e => setVoice(voices.find(v => v.name === e.target.value))} className="input-field text-sm" aria-label="Choisir une voix">
              {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
            </select>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {SLIDERS.map(({ label, key, min, max, step }) => (
              <div key={key}>
                <div className="flex justify-between text-xs text-ink2 mb-2">
                  <label htmlFor={`rg-${key}`}>{label}</label>
                  <span className="font-mono text-accent">{settings[key].toFixed(1)}</span>
                </div>
                <input id={`rg-${key}`} type="range" min={min} max={max} step={step} value={settings[key]} className="range"
                  onChange={e => setSettings(p => ({ ...p, [key]: parseFloat(e.target.value) }))} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={speak} disabled={!text.trim() || playing} className="btn-primary"><Play size={16} /> Lire</button>
          {playing && (
            <>
              <button onClick={togglePause} className="btn-ghost">{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Reprendre' : 'Pause'}</button>
              <button onClick={stop} className="btn-ghost danger"><Square size={16} /> Stop</button>
              <span className="ml-auto text-xs text-accent font-mono">{paused ? 'En pause' : 'Lecture...'}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

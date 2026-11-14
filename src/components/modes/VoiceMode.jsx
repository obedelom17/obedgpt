import { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Upload, Copy, Download, FileText, Languages, Sparkles, Play, Pause, Volume2, MessageCircle, AudioLines, Loader2, Ear, Hand } from 'lucide-react'
import { Seg, Switch, Field, Chip } from '../ui/controls'
import { ErrorBanner } from '../ui'
import { useToast } from '../fx/Toast'
import { usePrefs } from '../../lib/prefs'
import { recordMic, toWavChunks, concatWav, splitForTts, toSrt, toVtt, fmtTime, downloadBlob, downloadText } from '../../lib/audio'
import { transcribeBlob, speakChunk, postJson } from '../../lib/api'
import { speakText } from '../../lib/speaker'
import { MarkdownRenderer } from '../ui'

const BrowserTTS = lazy(() => import('./TTSMode'))
const TABS = [{ id: 'stt', label: 'Transcrire', icon: Ear }, { id: 'tts', label: 'Parler', icon: Volume2 }, { id: 'talk', label: 'Conversation', icon: MessageCircle }]
const LANGS = [['auto', 'Détection automatique'], ['fr', 'Français'], ['en', 'Anglais'], ['es', 'Espagnol'], ['de', 'Allemand'], ['pt', 'Portugais'], ['it', 'Italien'], ['ar', 'Arabe'], ['sw', 'Swahili'], ['yo', 'Yoruba'], ['zh', 'Chinois'], ['ja', 'Japonais']]
const VOICES = {
  'canopylabs/orpheus-v1-english': { label: 'Anglais', voices: ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'] },
  'canopylabs/orpheus-arabic-saudi': { label: 'Arabe (Arabie saoudite)', voices: ['abdullah', 'fahad', 'sultan', 'lulwa', 'noura', 'aisha'] },
}
const DIRECTIONS = ['cheerful', 'friendly', 'warm', 'calm', 'whisper', 'dramatic']

// ───────────────────────── Transcrire (Whisper) ─────────────────────────
function Transcribe() {
  const toast = useToast()
  const [prefs, setPrefs] = usePrefs()
  const [translate, setTranslate] = useState(false)
  const [accurate, setAccurate] = useState(false)
  const [vocab, setVocab] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [summary, setSummary] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [over, setOver] = useState(false)
  const [recording, setRecording] = useState(false)
  const [level, setLevel] = useState(0)
  const recRef = useRef(null)
  const fileRef = useRef(null)

  const run = async (blob, name) => {
    setBusy(true); setError(null); setResult(null); setSummary('')
    try {
      if (blob.size > 120 * 1024 * 1024) throw new Error('Fichier trop volumineux (120 Mo max).')
      setProgress('Préparation de l\'audio…')
      const { chunks, duration } = await toWavChunks(blob, 100)
      let text = '', segments = [], language = ''
      for (let i = 0; i < chunks.length; i++) {
        setProgress(`Transcription ${i + 1}/${chunks.length}…`)
        const r = await transcribeBlob(chunks[i].blob, { language: prefs.sttLanguage, translate, prompt: vocab, model: accurate ? 'whisper-large-v3' : 'whisper-large-v3-turbo', filename: `part${i + 1}.wav` })
        text += (text ? ' ' : '') + r.text.trim()
        segments = segments.concat(r.segments.map(s => ({ ...s, start: s.start + chunks[i].offset, end: s.end + chunks[i].offset })))
        language = language || r.language
      }
      setResult({ text, segments, language, duration, name })
    } catch (e) { setError(e.message?.includes('decode') || e.name === 'EncodingError' ? "Format audio non reconnu par ce navigateur. Essaie MP3, WAV, M4A ou WebM." : e.message) }
    finally { setBusy(false); setProgress(null) }
  }

  const onFiles = files => { const f = files?.[0]; if (f) run(f, f.name.replace(/\.[^.]+$/, '')) }
  const toggleRec = async () => {
    if (recording) { recRef.current?.stop(); return }
    try {
      const rec = await recordMic({ vad: false, onLevel: setLevel, maxMs: 10 * 60_000 })
      recRef.current = rec; setRecording(true)
      const { blob } = await rec.done
      setRecording(false); setLevel(0)
      run(blob, 'enregistrement')
    } catch (e) { setRecording(false); setError(e.message) }
  }
  useEffect(() => () => recRef.current?.cancel(), [])

  const summarize = async () => {
    setSummarizing(true)
    try { const d = await postJson('/api/tools', { tool: 'summarize', text: result.text, options: { style: 'bullets', length: 'medium' } }); setSummary(d.text) }
    catch (e) { setError(e.message) } finally { setSummarizing(false) }
  }

  return (
    <div className="space-y-5">
      <div className="card p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <button className="drop" data-over={over} onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files) }} disabled={busy}>
            <Upload size={22} className="text-accent" />
            <span className="font-medium text-ink">Importer un fichier audio ou vidéo</span>
            <span className="text-xs text-ink3">MP3, WAV, M4A, WebM, MP4… les longs fichiers sont découpés automatiquement</span>
          </button>
          <input ref={fileRef} type="file" accept="audio/*,video/*" hidden onChange={e => { onFiles(e.target.files); e.target.value = '' }} />
          <div className="drop !cursor-default">
            <button className="rec-btn" data-on={recording} style={{ '--lv': level }} onClick={toggleRec} disabled={busy} aria-label={recording ? "Arrêter l'enregistrement" : 'Enregistrer au micro'}>
              {recording ? <Square size={26} fill="currentColor" /> : <Mic size={30} />}
            </button>
            <span className="font-medium text-ink">{recording ? 'Enregistrement… touche pour arrêter' : 'Enregistrer au micro'}</span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Langue parlée">
            <select className="input-field text-sm" value={prefs.sttLanguage} onChange={e => setPrefs({ sttLanguage: e.target.value })} aria-label="Langue parlée" disabled={translate}>
              {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Vocabulaire (optionnel)" hint="Noms propres, termes techniques à bien orthographier.">
            <input className="input-field text-sm" value={vocab} onChange={e => setVocab(e.target.value)} placeholder="Ex. IAI-Togo, Lomé, comptabilité OHADA" />
          </Field>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Switch icon={Languages} label="Traduire vers l'anglais" hint="Whisper traduit n'importe quelle langue en anglais." checked={translate} onChange={setTranslate} />
          <Switch icon={Sparkles} label="Précision maximale" hint="Modèle large-v3 (plus lent que turbo)." checked={accurate || translate} onChange={setAccurate} disabled={translate} />
        </div>
      </div>

      {busy && <div className="card p-4 flex items-center gap-3 text-sm"><Loader2 size={16} className="animate-spin text-accent" /> {progress}</div>}
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="card p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="field-label !mb-0">Transcription</span>
                {result.language && <Chip tone="accent">{result.language}</Chip>}
                <Chip>{fmtTime(result.duration)}</Chip>
                <Chip>{result.text.split(/\s+/).filter(Boolean).length} mots</Chip>
              </div>
              <p className="text-[.95rem] leading-relaxed whitespace-pre-wrap break-words">{result.text}</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={() => { navigator.clipboard?.writeText(result.text); toast('Texte copié') }}><Copy size={14} /> Copier</button>
                <button className="btn-ghost" onClick={() => downloadText(result.text, `${result.name}.txt`)}><FileText size={14} /> TXT</button>
                {result.segments.length > 0 && <>
                  <button className="btn-ghost" onClick={() => downloadText(toSrt(result.segments), `${result.name}.srt`)}><Download size={14} /> SRT</button>
                  <button className="btn-ghost" onClick={() => downloadText(toVtt(result.segments), `${result.name}.vtt`, 'text/vtt')}><Download size={14} /> VTT</button>
                  <button className="btn-ghost" onClick={() => downloadText(JSON.stringify(result, null, 2), `${result.name}.json`, 'application/json')}><Download size={14} /> JSON</button>
                </>}
                <button className="btn-primary" onClick={summarize} disabled={summarizing}>{summarizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Résumer</button>
              </div>
              {summary && <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}><MarkdownRenderer content={summary} /></div>}
            </div>
            {result.segments.length > 0 && (
              <div className="card p-2">
                <span className="field-label px-3 pt-2">Segments horodatés</span>
                <div className="max-h-[360px] overflow-y-auto">
                  {result.segments.map((s, i) => <div key={i} className="seg-row"><time>{fmtTime(s.start)}</time><span>{s.text.trim()}</span></div>)}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ───────────────────────── Parler (Orpheus) ─────────────────────────
function Speak() {
  const toast = useToast()
  const [prefs, setPrefs] = usePrefs()
  const [engine, setEngine] = useState('groq')
  const [model, setModel] = useState('canopylabs/orpheus-v1-english')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  const taRef = useRef(null)
  const stopRef = useRef(false)
  const audioRef = useRef(null)
  const voices = VOICES[model].voices
  const voice = voices.includes(prefs.voice) ? prefs.voice : voices[0]
  const parts = useMemo(() => splitForTts(text), [text])

  const insertDirection = d => {
    const el = taRef.current; const pos = el?.selectionStart ?? text.length
    setText(t => t.slice(0, pos) + `[${d}] ` + t.slice(pos)); setTimeout(() => el?.focus(), 0)
  }

  const generate = async () => {
    setBusy(true); setError(null); setDone(null); stopRef.current = false
    const blobs = []
    try {
      let next = speakChunk(parts[0], { voice, model, speed: prefs.speed })
      for (let i = 0; i < parts.length && !stopRef.current; i++) {
        setProgress(`${i + 1}/${parts.length}`)
        const b = await next; blobs.push(b)
        if (i + 1 < parts.length) next = speakChunk(parts[i + 1], { voice, model, speed: prefs.speed })
        const url = URL.createObjectURL(b); const a = new Audio(url); audioRef.current = a
        await new Promise(ok => { a.onended = ok; a.onerror = ok; a.play().catch(ok) }); URL.revokeObjectURL(url)
      }
      if (!stopRef.current && blobs.length) setDone(await concatWav(blobs))
    } catch (e) { setError(e.message) }
    finally { setBusy(false); setProgress(null) }
  }
  const stop = () => { stopRef.current = true; audioRef.current?.pause(); setBusy(false) }

  return (
    <div className="space-y-5">
      <Seg items={[{ id: 'groq', label: 'Groq Orpheus', icon: AudioLines }, { id: 'browser', label: 'Navigateur', icon: Volume2 }]} value={engine} onChange={setEngine} label="Moteur de voix" />
      {engine === 'browser' ? (
        <Suspense fallback={null}><BrowserTTS embedded /></Suspense>
      ) : (
        <>
          <div className="card p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Langue du modèle" hint="Orpheus lit l'anglais et l'arabe. Pour le français, utilise « Navigateur ».">
                <select className="input-field text-sm" value={model} onChange={e => { setModel(e.target.value); setPrefs({ voice: VOICES[e.target.value].voices[0] }) }} aria-label="Modèle">
                  {Object.entries(VOICES).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Voix">
                <div className="flex flex-wrap gap-2">{voices.map(v => <button key={v} className={`tag ${v === voice ? 'active-tag' : ''}`} aria-pressed={v === voice} onClick={() => setPrefs({ voice: v })}>{v}</button>)}</div>
              </Field>
            </div>
            <Field label={`Vitesse : ${prefs.speed.toFixed(1)}×`}>
              <input type="range" className="range" min="0.5" max="2" step="0.1" value={prefs.speed} onChange={e => setPrefs({ speed: parseFloat(e.target.value) })} aria-label="Vitesse" />
            </Field>
          </div>
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="field-label !mb-0">Texte à lire</span>
              <span className="text-xs text-ink3 font-mono">{text.length} car. · {parts.length} requête{parts.length > 1 ? 's' : ''}</span>
            </div>
            <textarea ref={taRef} value={text} onChange={e => setText(e.target.value.slice(0, 6000))} rows={7} className="input-field w-full resize-none" aria-label="Texte à lire" placeholder="Write something to be spoken. Try: [cheerful] Welcome to ObedGPT!" />
            <div className="flex flex-wrap gap-1.5" aria-label="Directions vocales">
              <span className="text-xs text-ink3 self-center mr-1">Direction :</span>
              {DIRECTIONS.map(d => <button key={d} className="tag" onClick={() => insertDirection(d)}>[{d}]</button>)}
            </div>
          </div>
          <ErrorBanner error={error} onDismiss={() => setError(null)} />
          <div className="flex items-center gap-3 flex-wrap">
            {busy
              ? <button className="btn-ghost danger" onClick={stop}><Square size={15} /> Stop {progress && <span className="font-mono text-xs">{progress}</span>}</button>
              : <button className="btn-primary" onClick={generate} disabled={!parts.length}><Play size={16} /> Lire</button>}
            {done && <button className="btn-ghost" onClick={() => downloadBlob(done, 'obedgpt-voix.wav')}><Download size={15} /> Télécharger WAV</button>}
          </div>
        </>
      )}
    </div>
  )
}

// ───────────────────────── Conversation vocale ─────────────────────────
const VOICE_SYSTEM = "Tu es ObedGPT, assistant vocal créé par Obed Elom AGBEBAVI. Réponds en 1 à 3 phrases courtes, naturelles, sans Markdown ni listes, dans la langue de l'utilisateur."
function Talk() {
  const [prefs] = usePrefs()
  const [state, setState] = useState('idle') // idle | listening | transcribing | thinking | speaking
  const [turns, setTurns] = useState([])
  const [error, setError] = useState(null)
  const [hands, setHandsState] = useState(true)
  const handsRef = useRef(true)
  const setHands = v => { handsRef.current = v; setHandsState(v) }
  const [level, setLevel] = useState(0)
  const ref = useRef({ rec: null, speaker: null, active: false, turns: [] })
  const listRef = useRef(null)
  useEffect(() => { listRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }) }, [turns, state])
  useEffect(() => () => { ref.current.active = false; ref.current.rec?.cancel(); ref.current.speaker?.stop() }, [])

  const listen = async () => {
    const r = ref.current
    try {
      setError(null); setState('listening')
      const rec = await recordMic({ vad: true, onLevel: setLevel }); r.rec = rec
      const { blob, heard } = await rec.done; setLevel(0)
      if (!r.active) return
      if (!heard) { if (handsRef.current) return listen(); setState('idle'); return }
      setState('transcribing')
      const { chunks } = await toWavChunks(blob, 100)
      let text = ''
      for (const c of chunks) text += ' ' + (await transcribeBlob(c.blob, { language: prefs.sttLanguage })).text
      text = text.trim()
      if (!text || !r.active) { if (r.active && handsRef.current) return listen(); setState('idle'); return }
      const history = [...r.turns, { role: 'user', content: text }]
      r.turns = history; setTurns(history); setState('thinking')
      const d = await postJson('/api/chat', { messages: history.slice(-10), systemPrompt: VOICE_SYSTEM, maxTokens: 400, temperature: 0.7 })
      if (!r.active) return
      r.turns = [...history, { role: 'assistant', content: d.text }]; setTurns(r.turns); setState('speaking')
      r.speaker = speakText(d.text, prefs, st => { if (st === 'end' && r.active) { handsRef.current ? listen() : setState('idle') } })
    } catch (e) { setError(e.message); r.active = false; setState('idle') }
  }
  const start = () => { ref.current.active = true; listen() }
  const stop = () => { const r = ref.current; r.active = false; r.rec?.cancel(); r.speaker?.stop(); window.speechSynthesis?.cancel(); setState('idle'); setLevel(0) }
  const LABEL = { idle: 'Touche pour parler', listening: "Je t'écoute…", transcribing: 'Transcription…', thinking: 'Je réfléchis…', speaking: 'Je réponds…' }
  const on = state !== 'idle'

  return (
    <div className="space-y-5">
      <div className="card p-5 flex flex-col items-center gap-4 text-center">
        <button className="rec-btn" data-on={state === 'listening'} style={{ '--lv': level }} onClick={on ? stop : start} aria-label={on ? 'Arrêter la conversation' : 'Démarrer la conversation vocale'}>
          {on ? <Square size={26} fill="currentColor" /> : <Mic size={30} />}
        </button>
        <div aria-live="polite"><p className="font-display font-semibold">{LABEL[state]}</p><p className="text-xs text-ink3 mt-1">Whisper écoute, ObedGPT répond, la voix lit la réponse.</p></div>
        <div className="w-full max-w-sm"><Switch icon={Hand} label="Mains libres" hint="Relance l'écoute après chaque réponse." checked={hands} onChange={setHands} /></div>
      </div>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      {turns.length > 0 && (
        <div className="card p-3 max-h-[46dvh] overflow-y-auto space-y-3" ref={listRef}>
          {turns.map((t, i) => <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : ''}`}><div className={t.role === 'user' ? 'message-user max-w-[88%]' : 'max-w-[92%] px-1 text-[.95rem] leading-relaxed'}>{t.content}</div></div>)}
        </div>
      )}
    </div>
  )
}

export default function VoiceMode() {
  const [tab, setTab] = useState('stt')
  return (
    <div className="page">
      <div className="page-inner space-y-5">
        <div>
          <h2 className="page-title">Voix</h2>
          <p className="page-sub">Whisper transcrit et traduit, Orpheus parle, et tu peux discuter à voix haute.</p>
        </div>
        <Seg items={TABS} value={tab} onChange={setTab} label="Fonction vocale" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}>
            {tab === 'stt' ? <Transcribe /> : tab === 'tts' ? <Speak /> : <Talk />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

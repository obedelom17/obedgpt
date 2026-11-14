import { speakChunk, guessLang } from './api'
import { splitForTts } from './audio'

// Lecture à voix haute : Orpheus (Groq, anglais / arabe) ou voix du navigateur
// (toutes langues). En mode « auto », Orpheus n'est utilisé que pour l'anglais.
export function speakText(text, prefs, onState) {
  const lang = guessLang(text)
  const wantGroq = prefs.ttsEngine === 'groq' || (prefs.ttsEngine === 'auto' && lang === 'en')
  let stopped = false, audio = null, ctrl = new AbortController()
  const urls = []
  const stop = () => { stopped = true; ctrl.abort(); audio?.pause(); window.speechSynthesis?.cancel(); urls.forEach(URL.revokeObjectURL); onState?.('end') }

  const browser = () => {
    const synth = window.speechSynthesis
    if (!synth) { onState?.('error', "Synthèse vocale indisponible sur ce navigateur."); return }
    const clean = splitForTts(text, 4000).join(' ')
    const u = new SpeechSynthesisUtterance(clean)
    const code = lang === 'en' ? 'en' : lang === 'ar' ? 'ar' : 'fr'
    const v = synth.getVoices().find(x => x.lang.toLowerCase().startsWith(code))
    if (v) u.voice = v
    u.lang = v?.lang || (code === 'fr' ? 'fr-FR' : code === 'ar' ? 'ar-SA' : 'en-US'); u.rate = prefs.speed || 1
    u.onend = () => onState?.('end'); u.onerror = () => onState?.('end')
    synth.cancel(); onState?.('playing'); synth.speak(u)
  }

  if (!wantGroq) { browser(); return { stop } }
  ;(async () => {
    const model = lang === 'ar' ? 'canopylabs/orpheus-arabic-saudi' : 'canopylabs/orpheus-v1-english'
    const voice = lang === 'ar' ? 'abdullah' : (prefs.voice || 'autumn')
    const parts = splitForTts(text)
    if (!parts.length) return onState?.('end')
    onState?.('loading')
    try {
      const fetchAt = i => speakChunk(parts[i], { voice, model, speed: prefs.speed, signal: ctrl.signal })
      let next = fetchAt(0)
      for (let i = 0; i < parts.length && !stopped; i++) {
        const blob = await next
        if (i + 1 < parts.length) next = fetchAt(i + 1)
        if (stopped) return
        const url = URL.createObjectURL(blob); urls.push(url)
        audio = new Audio(url)
        onState?.('playing')
        await new Promise((ok, ko) => { audio.onended = ok; audio.onerror = () => ko(new Error('Lecture impossible')); audio.play().catch(ko) })
      }
      if (!stopped) { urls.forEach(URL.revokeObjectURL); onState?.('end') }
    } catch (e) {
      if (stopped || e.name === 'AbortError') return
      onState?.('fallback', e.message)
      browser()
    }
  })()
  return { stop }
}

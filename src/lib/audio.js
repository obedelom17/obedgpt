// Utilitaires audio : enregistrement micro avec détection de silence,
// découpage en morceaux WAV 16 kHz mono (pour Whisper), assemblage de WAV,
// sous-titres SRT / VTT.

const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => window.MediaRecorder?.isTypeSupported?.(t)) || ''

// Enregistre le micro. `vad` : s'arrête seul après ~1,4 s de silence suivant la parole.
export async function recordMic({ vad = true, onLevel, maxMs = 180000 } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Le micro n'est pas disponible sur ce navigateur (HTTPS requis).")
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const mime = pickMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks = []
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx(); const src = ctx.createMediaStreamSource(stream)
  const an = ctx.createAnalyser(); an.fftSize = 1024; src.connect(an)
  const buf = new Float32Array(an.fftSize)
  let heard = false, silentSince = 0, raf = 0, stopped = false
  const t0 = performance.now()
  let finish
  const done = new Promise(r => { finish = r })
  const cleanup = () => { cancelAnimationFrame(raf); stream.getTracks().forEach(t => t.stop()); ctx.close().catch(() => {}) }
  const stop = () => { if (stopped) return; stopped = true; if (rec.state !== 'inactive') rec.stop() }
  rec.onstop = () => { cleanup(); finish({ blob: new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }), heard }) }
  const tick = () => {
    an.getFloatTimeDomainData(buf)
    let s = 0; for (const v of buf) s += v * v
    const rms = Math.sqrt(s / buf.length)
    onLevel?.(Math.min(1, rms * 9))
    const now = performance.now()
    if (rms > 0.02) { heard = true; silentSince = 0 }
    else if (heard && vad) { silentSince = silentSince || now; if (now - silentSince > 1400) return stop() }
    if (now - t0 > maxMs) return stop()
    if (!stopped) raf = requestAnimationFrame(tick)
  }
  rec.start(250); tick()
  return { stop, done, cancel() { stopped = true; if (rec.state !== 'inactive') { rec.onstop = null; rec.stop() } cleanup() } }
}

export function encodeWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2); const v = new DataView(buf)
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) { const s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true) }
  return new Blob([buf], { type: 'audio/wav' })
}

async function decode(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx()
  try { return await ctx.decodeAudioData(await blob.arrayBuffer()) } finally { ctx.close().catch(() => {}) }
}

// Décode n'importe quel audio, le ramène en 16 kHz mono et le découpe en
// morceaux WAV d'environ `chunkSec` secondes (≈ 3,2 Mo pour 100 s).
export async function toWavChunks(blob, chunkSec = 100) {
  const audio = await decode(blob)
  const rate = 16000
  const off = new OfflineAudioContext(1, Math.ceil(audio.duration * rate), rate)
  const s = off.createBufferSource(); s.buffer = audio; s.connect(off.destination); s.start()
  const data = (await off.startRendering()).getChannelData(0)
  const size = chunkSec * rate; const out = []
  for (let i = 0; i < data.length; i += size) out.push({ blob: encodeWav(data.subarray(i, i + size), rate), offset: i / rate })
  return { chunks: out, duration: audio.duration }
}

export async function concatWav(blobs) {
  const parts = []; let rate = 24000
  for (const b of blobs) { const a = await decode(b); rate = a.sampleRate; parts.push(a.getChannelData(0).slice()) }
  const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0
  for (const p of parts) { all.set(p, o); o += p.length }
  return encodeWav(all, rate)
}

const pad = (n, l = 2) => String(Math.floor(n)).padStart(l, '0')
const ts = (t, comma) => { const h = t / 3600, m = (t % 3600) / 60, s = t % 60, ms = Math.round((t % 1) * 1000); return `${pad(h)}:${pad(m)}:${pad(s)}${comma ? ',' : '.'}${pad(ms, 3)}` }
export const toSrt = segs => segs.map((s, i) => `${i + 1}\n${ts(s.start, true)} --> ${ts(s.end, true)}\n${s.text.trim()}\n`).join('\n')
export const toVtt = segs => 'WEBVTT\n\n' + segs.map(s => `${ts(s.start)} --> ${ts(s.end)}\n${s.text.trim()}\n`).join('\n')
export const fmtTime = t => `${pad(t / 60)}:${pad(t % 60)}`

// Découpe un texte en phrases de ≤ max caractères (limite Orpheus : 200).
export function splitForTts(text, max = 190) {
  const clean = text.replace(/```[\s\S]*?```/g, ' ').replace(/[`*_#>|~]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim()
  const sentences = clean.match(/[^.!?…;:\n]+[.!?…;:]*/g) || [clean]
  const out = []; let cur = ''
  const push = s => { if (s.trim()) out.push(s.trim()) }
  for (const raw of sentences) {
    let s = raw.trim(); if (!s) continue
    while (s.length > max) { let cut = s.lastIndexOf(' ', max); if (cut < 40) cut = max; if (cur) { push(cur); cur = '' } push(s.slice(0, cut)); s = s.slice(cut).trim() }
    if ((cur + ' ' + s).trim().length > max) { push(cur); cur = s } else cur = (cur + ' ' + s).trim()
  }
  push(cur)
  return out
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000)
}
export const downloadText = (text, name, type = 'text/plain') => downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), name)

// Image → JPEG redimensionné (≤ maxSide px) + miniature, pour la vision.
export function imageToDataUrls(file, maxSide = 1280) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const img = new Image()
    img.onload = () => {
      const draw = side => {
        const k = Math.min(1, side / Math.max(img.width, img.height)); const c = document.createElement('canvas')
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height)
        return c.toDataURL('image/jpeg', side > 400 ? 0.82 : 0.7)
      }
      const full = draw(maxSide), thumb = draw(220); URL.revokeObjectURL(url); resolve({ full, thumb })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible.')) }
    img.src = url
  })
}

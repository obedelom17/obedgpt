import { postJson } from '../api'
import { renderPdfPages } from './extract'
import { imageToDataUrls } from '../audio'

// OCR par le modèle vision Groq (même clé). PDF scannés et photos de documents :
// les pages sont rendues en images puis transcrites par lots de 3.
const sleep = ms => new Promise(r => setTimeout(r, ms))
const MAX_OCR_PAGES = 45

async function ocrBatch(images, firstPage, signal) {
  const prompt = images.length === 1 ? 'Transcris tout le texte de cette page.'
    : `Ces ${images.length} images sont des pages consécutives. Transcris chacune dans l'ordre et commence chaque page par une ligne exacte « === PAGE k === » (k = 1 à ${images.length}).`
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return (await postJson('/api/tools', { tool: 'vision', mode: 'ocr', prompt, images }, signal)).text }
    catch (e) {
      if (e.name === 'AbortError') throw e
      if (/trop de requêtes|rate|quota|429/i.test(e.message) && attempt < 3) { await sleep(8000 * (attempt + 1)); continue }
      throw e
    }
  }
}
const splitPages = (text, n) => {
  if (n === 1) return [text.trim()]
  const parts = text.split(/^\s*={2,}\s*PAGE\s*(\d+)\s*={2,}\s*$/im); const out = Array(n).fill('')
  if (parts.length < 3) { out[0] = text.trim(); return out }
  for (let i = 1; i < parts.length; i += 2) { const k = parseInt(parts[i]) - 1; if (k >= 0 && k < n) out[k] = (parts[i + 1] || '').trim() }
  return out
}

// `doc.pages` est complété en place. onProgress(texte).
export async function ocrDocument(file, doc, { onProgress, signal } = {}) {
  if (doc.image) {
    onProgress?.('Analyse de l\'image…')
    const { full } = await imageToDataUrls(file, 1800)
    doc.pages = [{ n: 1, label: 'image', text: (await ocrBatch([full], 1, signal)).trim() }]
  } else {
    const total = Math.min(doc.pages.length, MAX_OCR_PAGES)
    for (let i = 0; i < total; i += 3) {
      const nums = [...Array(Math.min(3, total - i))].map((_, k) => i + k + 1)
      onProgress?.(`OCR : pages ${nums[0]}-${nums[nums.length - 1]} sur ${total}`)
      const imgs = await renderPdfPages(file, nums)
      const texts = splitPages(await ocrBatch(imgs, nums[0], signal), nums.length)
      nums.forEach((n, k) => { doc.pages[n - 1] = { n, text: texts[k] } })
    }
    if (doc.pages.length > total) doc.truncated = true
    doc.pages = doc.pages.slice(0, total)
  }
  doc.chars = doc.pages.reduce((n, p) => n + p.text.length, 0)
  doc.scanned = false; doc.ocr = true
  if (doc.chars < 20) throw new Error('Le modèle n\'a pas réussi à lire ce document.')
  return doc
}

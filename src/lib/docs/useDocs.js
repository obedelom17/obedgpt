import { useSyncExternalStore } from 'react'
import { listDocs, putDoc, deleteDoc } from './store'
import { extractFile } from './extract'
import { ocrDocument } from './ocr'

// Bibliothèque partagée par le chat et la fenêtre « Documents ».
let state = { docs: [], ready: false }
const subs = new Set()
const emit = patch => { state = { ...state, ...patch }; subs.forEach(f => f()) }
let loading
const load = () => (loading ||= listDocs().then(docs => emit({ docs, ready: true })))

export function useDocs() {
  load()
  return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => state, () => state)
}

export async function removeDoc(id) { await deleteDoc(id); emit({ docs: state.docs.filter(d => d.id !== id) }) }

// Importe des fichiers : extraction locale, OCR vision pour les scans, indexation.
// Retourne { added: [doc], errors: [texte] } ; `onStatus` reçoit l'avancement.
export async function importDocs(files, { onStatus, signal } = {}) {
  const added = [], errors = []
  for (const file of files) {
    try {
      const dup = state.docs.find(d => d.name === file.name && d.size === file.size)
      if (dup) { added.push(dup); continue }
      const ex = await extractFile(file, onStatus)
      const doc = { id: crypto.randomUUID(), createdAt: Date.now(), ...ex }
      if (doc.scanned) {
        onStatus?.(`« ${file.name} » est un scan : lecture par le modèle vision…`)
        await ocrDocument(file, doc, { onProgress: onStatus, signal })
      }
      delete doc.scanned; delete doc.image; delete doc.totalPages
      await putDoc(doc); emit({ docs: [doc, ...state.docs] }); added.push(doc)
    } catch (e) { if (e.name === 'AbortError') break; errors.push(e.message || `Échec : ${file.name}`) }
  }
  return { added, errors }
}

// Bibliothèque de documents : IndexedDB (gros volumes, hors quota localStorage).
// Repli en mémoire si IndexedDB est indisponible (navigation privée Firefox, etc.).
const DB = 'obedgpt-docs', STORE = 'docs'
const mem = new Map()
let dbp
const open = () => (dbp ||= new Promise((res, rej) => {
  if (typeof indexedDB === 'undefined') return rej(new Error('no idb'))
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' })
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
}))
const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction(STORE, mode); const out = fn(t.objectStore(STORE)); t.oncomplete = () => res(out.result); t.onerror = () => rej(t.error) }) }

export async function listDocs() {
  try { return ((await tx('readonly', s => s.getAll())) || []).sort((a, b) => b.createdAt - a.createdAt) }
  catch { return [...mem.values()].sort((a, b) => b.createdAt - a.createdAt) }
}
export async function putDoc(doc) { try { await tx('readwrite', s => s.put(doc)) } catch { mem.set(doc.id, doc) } }
export async function deleteDoc(id) { try { await tx('readwrite', s => s.delete(id)) } catch { mem.delete(id) } }

// Documents actifs pour chaque conversation.
const key = chatId => `obedgpt-chatdocs-${chatId}`
export const getActiveIds = chatId => { try { return JSON.parse(localStorage.getItem(key(chatId)) || '[]') } catch { return [] } }
export const setActiveIds = (chatId, ids) => { try { ids.length ? localStorage.setItem(key(chatId), JSON.stringify(ids)) : localStorage.removeItem(key(chatId)) } catch {} }

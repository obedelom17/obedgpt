// Galerie d'images générées : IndexedDB (le localStorage est trop petit pour des images).
const DB = 'obedgpt-gallery', STORE = 'images', MAX = 60
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' })
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
})
const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction(STORE, mode); const out = fn(t.objectStore(STORE)); t.oncomplete = () => res(out.result ?? out); t.onerror = () => rej(t.error) }) }

export const newImageId = () => 'img' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
export async function saveImage({ id, prompt, data }) {
  try {
    await tx('readwrite', s => s.put({ id, prompt, data, createdAt: Date.now() }))
    const all = await listImages()
    for (const old of all.slice(MAX)) await deleteImage(old.id)
  } catch {}
}
export const getImage = id => tx('readonly', s => s.get(id)).catch(() => null)
export const deleteImage = id => tx('readwrite', s => s.delete(id)).catch(() => {})
export const listImages = () => tx('readonly', s => s.getAll()).then(a => (a || []).sort((x, y) => y.createdAt - x.createdAt)).catch(() => [])

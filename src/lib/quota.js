import { useSyncExternalStore } from 'react'

// Dernier état des quotas Groq (en-têtes x-ratelimit-*), mis à jour à chaque appel.
let q = null
const subs = new Set()
export function setQuota(v) {
  if (!v || (v.reqRemaining == null && v.tokRemaining == null)) return
  q = { ...v, at: Date.now() }; subs.forEach(f => f())
}
export const useQuota = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => q, () => q)

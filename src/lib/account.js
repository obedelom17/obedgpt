import { useSyncExternalStore } from 'react'

const TK = 'obedgpt-token', UK = 'obedgpt-user', DK = 'obedgpt-deleted'
const subs = new Set()
const read = k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
let state = { token: localStorage.getItem(TK) || '', user: read(UK) }
const emit = () => subs.forEach(f => f())
export const useAccount = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => state)
export const getToken = () => state.token

export const getDeleted = () => read(DK) || {}
export const markDeleted = id => { const d = getDeleted(); d[id] = Date.now(); try { localStorage.setItem(DK, JSON.stringify(d)) } catch {} }
export const setDeleted = d => { try { localStorage.setItem(DK, JSON.stringify(d)) } catch {} }

async function call(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && state.token) logout()
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export async function authenticate(action, email, password) {
  const data = await call('/api/auth', { method: 'POST', body: JSON.stringify({ action, email, password }) })
  state = { token: data.token, user: data.user }
  localStorage.setItem(TK, data.token); localStorage.setItem(UK, JSON.stringify(data.user))
  emit()
  return data.user
}
export function logout() {
  state = { token: '', user: null }
  localStorage.removeItem(TK); localStorage.removeItem(UK); emit()
}
export const pullHistory = () => call('/api/sync')
export const pushHistory = (conversations, deleted) => call('/api/sync', { method: 'PUT', body: JSON.stringify({ conversations, deleted }) })

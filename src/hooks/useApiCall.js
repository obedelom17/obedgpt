import { useState, useCallback, useRef } from 'react'
import { classifyError } from '../components/ui'
import { streamChat } from '../lib/api'

export function useApiCall() {
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const lastRef = useRef(null)

  const call = useCallback(async (url, body) => {
    setLoading(true)
    setError(null)
    lastRef.current = { url, body }
    try {
      const res  = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      let data
      try { data = await res.json() } catch { throw new Error('Réponse serveur invalide (JSON attendu)') }
      if (data.error) throw new Error(data.error)
      if (!res.ok)    throw new Error(`HTTP ${res.status}`)
      setLoading(false)
      return data
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return null
    }
  }, [])

  const retry     = useCallback(() => lastRef.current ? call(lastRef.current.url, lastRef.current.body) : null, [call])
  const clearError = useCallback(() => setError(null), [])

  return { loading, error, call, retry, clearError }
}

// Variante streaming (mode Chat) : flux NDJSON {texte, raisonnement, outils, usage}.
// `handlers` : fonction (onChunk) ou objet { onChunk, onReasoning, onMeta, onTools, onUsage }.
export function useStreamingChat() {
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const lastRef = useRef(null)
  const controllerRef = useRef(null)

  const call = useCallback(async (url, body, handlers) => {
    setLoading(true)
    setError(null)
    lastRef.current = { url, body, handlers }
    const h = typeof handlers === 'function' ? { onChunk: handlers } : (handlers || {})
    const controller = new AbortController()
    controllerRef.current = controller
    let full = ''
    try {
      full = await streamChat(body, { ...h, onChunk: d => { full += d; h.onChunk?.(d) } }, controller.signal)
      setLoading(false)
      return { text: full }
    } catch (err) {
      setLoading(false)
      if (err.name === 'AbortError') return { text: full, aborted: true }
      setError(err.message)
      return null
    }
  }, [])

  const abort = useCallback(() => { controllerRef.current?.abort() }, [])
  const retry = useCallback((handlers) => lastRef.current ? call(lastRef.current.url, lastRef.current.body, handlers || lastRef.current.handlers) : null, [call])
  const clearError = useCallback(() => setError(null), [])

  return { loading, error, call, retry, clearError, abort }
}

import { useState, useCallback, useRef } from 'react'
import { classifyError } from '../components/ui'

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

// Variante streaming, utilisée uniquement par le mode Chat : lit la réponse
// morceau par morceau et appelle onChunk(delta) à chaque fragment reçu, pour
// afficher le texte au fur et à mesure plutôt que d'attendre la réponse
// complète.
export function useStreamingChat() {
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const lastRef = useRef(null)
  const controllerRef = useRef(null)

  const call = useCallback(async (url, body, onChunk) => {
    setLoading(true)
    setError(null)
    lastRef.current = { url, body, onChunk }
    const controller = new AbortController()
    controllerRef.current = controller
    let full = ''
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, stream: true }),
        signal: controller.signal,
      })

      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        // Le serveur n'a pas pu ouvrir de flux (rate limit, service down...)
        // et a répondu directement en JSON, sans rien streamer.
        let data
        try { data = await res.json() } catch { throw new Error('Réponse serveur invalide (JSON attendu)') }
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (chunk) { full += chunk; onChunk?.(chunk) }
      }
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
  const retry = useCallback((onChunk) => lastRef.current ? call(lastRef.current.url, lastRef.current.body, onChunk) : null, [call])
  const clearError = useCallback(() => setError(null), [])

  return { loading, error, call, retry, clearError, abort }
}

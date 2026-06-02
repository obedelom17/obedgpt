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

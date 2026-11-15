import { useEffect, useRef, useState } from 'react'
import { useAccount, getDeleted, setDeleted, pullHistory, pushHistory } from '../lib/account'
import { mergeHistories } from '../lib/merge'

// Synchronise l'historique avec le compte : fusion à la connexion, puis envoi (3 s après le dernier changement).
export function useSync(history, replaceHistory) {
  const { token } = useAccount()
  const [status, setStatus] = useState('off') // off | syncing | ok | error
  const first = useRef(true), histRef = useRef(history), timer = useRef(null)
  histRef.current = history

  useEffect(() => {
    if (!token) { setStatus('off'); first.current = true; return }
    let dead = false
    ;(async () => {
      setStatus('syncing')
      try {
        const remote = await pullHistory()
        const m = mergeHistories(histRef.current, remote.conversations, getDeleted(), remote.deleted)
        if (dead) return
        setDeleted(m.deleted); replaceHistory(m.conversations)
        await pushHistory(m.conversations, m.deleted)
        first.current = false; setStatus('ok')
      } catch { if (!dead) setStatus('error') }
    })()
    return () => { dead = true }
  }, [token, replaceHistory])

  useEffect(() => {
    if (!token || first.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setStatus('syncing')
      try { await pushHistory(histRef.current, getDeleted()); setStatus('ok') } catch { setStatus('error') }
    }, 3000)
    return () => clearTimeout(timer.current)
  }, [history, token])

  return status
}

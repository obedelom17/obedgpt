import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'obedgpt-chat-history'
const MAX_STORED_CONVERSATIONS = 100

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function getTimestamp() {
  return new Date().toISOString()
}

export function useChatHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  // Si le navigateur manque de place, on retire les conversations les plus anciennes non épinglées
  // du stockage (jamais de perte silencieuse de la conversation en cours).
  useEffect(() => {
    let list = history
    for (let i = 0; i < 80; i++) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); return } catch {}
      const idx = list.map((c, k) => [c, k]).filter(([c]) => !c.pinned).pop()?.[1]
      if (idx == null) return
      list = list.filter((_, k) => k !== idx)
    }
  }, [history])

  const saveConversation = useCallback((id, title, messages) => {
    setHistory(prev => {
      const existing = prev.find(c => c.id === id)
      if (existing) {
        return prev.map(c => c.id === id ? { ...c, title, messages, updatedAt: getTimestamp() } : c)
      }
      const next = [{ id, title, messages, createdAt: getTimestamp(), updatedAt: getTimestamp() }, ...prev]
      return next.slice(0, MAX_STORED_CONVERSATIONS)
    })
  }, [])

  const deleteConversation = useCallback((id) => {
    setHistory(prev => prev.filter(c => c.id !== id))
  }, [])

  const renameConversation = useCallback((id, title) => {
    setHistory(prev => prev.map(c => c.id === id ? { ...c, title } : c))
  }, [])

  const togglePin = useCallback((id) => {
    setHistory(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  // Fusionne un historique importé (export JSON précédent) avec l'existant :
  // les conversations dont l'id existe déjà ne sont pas dupliquées.
  const importHistory = useCallback((imported) => {
    if (!Array.isArray(imported)) throw new Error('Format invalide : un tableau de conversations était attendu.')
    setHistory(prev => {
      const existingIds = new Set(prev.map(c => c.id))
      const additions = imported.filter(c => c && c.id && Array.isArray(c.messages) && !existingIds.has(c.id))
      const merged = [...additions, ...prev]
      merged.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      return merged.slice(0, MAX_STORED_CONVERSATIONS)
    })
  }, [])

  const replaceHistory = useCallback(list => setHistory(list), [])

  const createNewId = useCallback(() => generateId(), [])

  return { history, saveConversation, deleteConversation, renameConversation, togglePin, clearHistory, importHistory, replaceHistory, createNewId }
}

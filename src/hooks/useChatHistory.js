import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'obedgpt-chat-history'
const MAX_STORED_CONVERSATIONS = 50

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
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

  const createNewId = useCallback(() => generateId(), [])

  return { history, saveConversation, deleteConversation, renameConversation, clearHistory, importHistory, createNewId }
}

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

  const createNewId = useCallback(() => generateId(), [])

  return { history, saveConversation, deleteConversation, renameConversation, clearHistory, createNewId }
}

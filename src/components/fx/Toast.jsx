import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Check } from 'lucide-react'

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const id = useRef(0)

  const push = useCallback((message) => {
    const n = ++id.current
    setToasts(t => [...t.slice(-2), { id: n, message, out: false }])
    setTimeout(() => setToasts(t => t.map(x => x.id === n ? { ...x, out: true } : x)), 2200)
    setTimeout(() => setToasts(t => t.filter(x => x.id !== n)), 2600)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.out ? 'out' : ''}`}>
            <Check size={14} className="text-orange-400" /> {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

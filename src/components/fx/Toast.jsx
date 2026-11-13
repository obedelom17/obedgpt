import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const id = useRef(0)
  const push = useCallback((message) => {
    const n = ++id.current
    setToasts(t => [...t.slice(-2), { id: n, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== n)), 2200)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} layout className="toast" initial={{ opacity: 0, y: 20, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 440, damping: 28 }}>
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.08, type: 'spring', stiffness: 500, damping: 15 }} className="grid place-items-center w-4 h-4 rounded-full" style={{ background: 'var(--accent)' }}>
                <Check size={10} strokeWidth={3.5} color="var(--accent-ink)" />
              </motion.span>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

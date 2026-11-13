import { Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme.jsx'

// Bascule clair/sombre : l'icône pivote, et le nouveau thème se révèle en
// cercle depuis le point de clic (View Transitions API, repli sans animation).
export default function ThemeToggle() {
  const { theme, setThemePref } = useTheme()
  const dark = theme === 'dark'
  return (
    <button onClick={e => setThemePref(dark ? 'light' : 'dark', { x: e.clientX, y: e.clientY })} className="icon-btn" title={dark ? 'Thème clair' : 'Thème sombre'}
      aria-label={dark ? 'Passer en thème clair' : 'Passer en thème sombre'}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={dark ? 'sun' : 'moon'} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }} className="grid place-items-center">
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

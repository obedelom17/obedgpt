import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext(null)
const THEME_KEY = 'obedgpt-theme-pref'   // 'auto' | 'light' | 'dark'
const FONT_KEY  = 'obedgpt-font-size'    // 'sm' | 'md' | 'lg'

const FONT_SIZES = { sm: '15px', md: '16px', lg: '18px' }

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Détecte le thème du système (clair/sombre) ET garde la possibilité pour
// l'utilisateur de forcer un thème dans Paramètres ('auto' suit l'OS comme
// avant, 'light'/'dark' l'imposent quel que soit le thème du système).
export function ThemeProvider({ children }) {
  const [themePref, setThemePrefState] = useState(() => localStorage.getItem(THEME_KEY) || 'auto')
  const [theme, setTheme] = useState(getSystemTheme)
  const [fontSize, setFontSizeState] = useState(() => localStorage.getItem(FONT_KEY) || 'md')

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const pref = localStorage.getItem(THEME_KEY) || 'auto'
      const isDark = pref === 'auto' ? mql.matches : pref === 'dark'
      setTheme(isDark ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', isDark)
    }
    apply()
    if (mql.addEventListener) mql.addEventListener('change', apply)
    else mql.addListener(apply)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', apply)
      else mql.removeListener(apply)
    }
  }, [themePref])

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZES[fontSize] || FONT_SIZES.md
  }, [fontSize])

  // `origin` (optionnel, {x,y}) : point de départ de la révélation circulaire
  // via la View Transitions API. Sans support navigateur (ou en mode
  // « réduire les animations »), on bascule simplement sans animation.
  const setThemePref = useCallback((pref, origin) => {
    const commit = () => {
      localStorage.setItem(THEME_KEY, pref)
      const isDark = pref === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches : pref === 'dark'
      document.documentElement.classList.toggle('dark', isDark)
      setTheme(isDark ? 'dark' : 'light')
      setThemePrefState(pref)
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduce) { commit(); return }
    const x = origin?.x ?? window.innerWidth / 2
    const y = origin?.y ?? window.innerHeight / 2
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const t = document.startViewTransition(commit)
    t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
      )
    }).catch(() => {})
  }, [])

  const setFontSize = useCallback((size) => {
    localStorage.setItem(FONT_KEY, size)
    setFontSizeState(size)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, themePref, setThemePref, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}

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

  const setThemePref = useCallback((pref) => {
    localStorage.setItem(THEME_KEY, pref)
    setThemePrefState(pref)
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

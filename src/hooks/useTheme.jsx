import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

// Détecte le thème du système (clair/sombre) et le garde synchronisé en
// direct : si l'utilisateur change le thème de son OS/navigateur pendant
// qu'ObedGPT est ouvert, l'app bascule automatiquement, sans rechargement
// et sans réglage manuel à gérer.
function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getSystemTheme)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (isDark) => {
      setTheme(isDark ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', isDark)
    }
    apply(mql.matches)

    // addEventListener('change', ...) est la bonne API moderne ; on garde
    // un repli sur l'ancienne addListener pour Safari/WebKit plus anciens.
    if (mql.addEventListener) mql.addEventListener('change', e => apply(e.matches))
    else mql.addListener(e => apply(e.matches))

    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', e => apply(e.matches))
      else mql.removeListener(e => apply(e.matches))
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}

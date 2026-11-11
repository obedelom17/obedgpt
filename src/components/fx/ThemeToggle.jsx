import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.jsx'

export default function ThemeToggle() {
  const { theme, setThemePref } = useTheme()
  const dark = theme === 'dark'
  return (
    <button onClick={() => setThemePref(dark ? 'light' : 'dark')} className="icon-btn theme-toggle" title={dark ? 'Thème clair' : 'Thème sombre'}
      aria-label={dark ? 'Passer en thème clair' : 'Passer en thème sombre'}>
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}

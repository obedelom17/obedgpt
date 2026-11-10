import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.jsx'

export default function ThemeToggle() {
  const { theme, setThemePref } = useTheme()
  return (
    <button
      onClick={e => setThemePref(theme === 'dark' ? 'light' : 'dark', { x: e.clientX, y: e.clientY })}
      className="pill-btn theme-toggle"
      title="Changer de thème"
      aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
      data-magnetic
    >
      <Sun size={16} className="sun" />
      <Moon size={16} className="moon" />
    </button>
  )
}

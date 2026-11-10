import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.jsx'

// Bascule clair/sombre : icônes qui pivotent + révélation circulaire du
// nouveau thème depuis le point de clic.
export default function ThemeToggle() {
  const { theme, setThemePref } = useTheme()
  return (
    <button
      onClick={e => setThemePref(theme === 'dark' ? 'light' : 'dark', { x: e.clientX, y: e.clientY })}
      className="theme-toggle btn-ghost p-0"
      title="Changer de thème"
      aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
      data-magnetic
    >
      <Sun size={17} className="sun" />
      <Moon size={17} className="moon" />
    </button>
  )
}

import { Globe } from 'lucide-react'
import { useLang } from '../../i18n'

// Bascule FR / EN. L'interface est remontée à chaque changement (voir App.jsx).
export default function LangToggle({ className = '' }) {
  const [lang, setLang] = useLang()
  const next = lang === 'en' ? 'fr' : 'en'
  return (
    <button onClick={() => setLang(next)} className={`icon-btn lang-btn ${className}`} aria-label={lang === 'en' ? 'FR : Passer en français' : 'EN : Switch to English'} title={lang === 'en' ? 'Français' : 'English'}>
      <Globe size={16} /><span className="lang-code">{next.toUpperCase()}</span>
    </button>
  )
}

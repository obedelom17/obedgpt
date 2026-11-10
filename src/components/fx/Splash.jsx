import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'

const SEEN_KEY = 'obedgpt-splash-seen'

// Intro cinématique, une seule fois par session.
export default function Splash() {
  const [phase, setPhase] = useState(() => {
    try { return sessionStorage.getItem(SEEN_KEY) ? 'gone' : 'in' } catch { return 'in' }
  })

  useEffect(() => {
    if (phase === 'gone') return
    const t1 = setTimeout(() => setPhase('out'), 1750)
    const t2 = setTimeout(() => { setPhase('gone'); try { sessionStorage.setItem(SEEN_KEY, '1') } catch {} }, 2600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase])

  if (phase === 'gone') return null
  return (
    <div className={`splash ${phase === 'out' ? 'out' : ''}`} aria-hidden="true">
      <div className="splash-logo"><Zap size={40} strokeWidth={2.4} /></div>
      <div className="splash-title">
        {'ObedGPT'.split('').map((c, i) => <span key={i} style={{ animationDelay: `${0.35 + i * 0.07}s` }}>{c}</span>)}
      </div>
      <div className="splash-bar" />
    </div>
  )
}

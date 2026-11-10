import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { useScramble } from '../../hooks/useScramble'

const SEEN_KEY = 'obedgpt-splash-seen-v2'

// Séquence d'allumage : ondes de choc, noyau lumineux, titre « décrypté ».
export default function Splash() {
  const [phase, setPhase] = useState(() => {
    try { return sessionStorage.getItem(SEEN_KEY) ? 'gone' : 'in' } catch { return 'in' }
  })
  const title = useScramble('OBEDGPT', { delay: 700, duration: 900 })

  useEffect(() => {
    if (phase === 'gone') return
    const t1 = setTimeout(() => setPhase('out'), 2300)
    const t2 = setTimeout(() => { setPhase('gone'); try { sessionStorage.setItem(SEEN_KEY, '1') } catch {} }, 3300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase])

  if (phase === 'gone') return null
  return (
    <div className={`splash ${phase === 'out' ? 'out' : ''}`} aria-hidden="true">
      <div className="splash-ring" /><div className="splash-ring" /><div className="splash-ring" />
      <div className="splash-core"><Zap size={36} strokeWidth={2.4} color="#fff" /></div>
      <div className="splash-text">{title}</div>
      <div className="splash-sub">Système en ligne</div>
    </div>
  )
}

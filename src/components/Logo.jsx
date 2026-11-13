import { useId } from 'react'
import { motion } from 'framer-motion'

// Logo ObedGPT : un « G » géométrique (arc ouvert + barre) qui se lit aussi
// comme un « O » de Obed. L'arc est vert, la barre jaune : clin d'œil au
// drapeau togolais. Même dessin que public/favicon.svg et les icônes PWA.
// `animated` : l'arc se trace une fois. `thinking` : la barre pulse.
const ARC = 'M72.9 33.9A28 28 0 1 0 78 50'
const BAR = 'M78 50H55'

export default function Logo({ size = 28, className = '', animated = false, thinking = false, tile = false }) {
  const uid = useId().replace(/:/g, '')
  const arcStroke = tile ? '#fff' : `url(#g${uid})`
  return (
    <svg className={`logo-mark ${className}`} width={size} height={size} viewBox="0 0 100 100" fill="none" role="img" aria-label="ObedGPT">
      <defs>
        <linearGradient id={`g${uid}`} x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-deep, var(--accent))" />
        </linearGradient>
      </defs>
      {tile && <rect width="100" height="100" rx="26" fill="var(--accent-deep, var(--accent))" />}
      {animated ? (
        <motion.path d={ARC} stroke={arcStroke} strokeWidth="11" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: [0.65, 0, 0.35, 1], delay: 0.1 }} />
      ) : (
        <path d={ARC} stroke={arcStroke} strokeWidth="11" strokeLinecap="round" />
      )}
      <motion.path d={BAR} stroke="var(--signal)" strokeWidth="11" strokeLinecap="round"
        initial={animated ? { pathLength: 0 } : false}
        animate={thinking ? { opacity: [1, 0.35, 1] } : { pathLength: 1, opacity: 1 }}
        transition={thinking ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.35, delay: animated ? 0.95 : 0 }} />
    </svg>
  )
}

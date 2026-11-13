import { motion } from 'framer-motion'

// Logo ObedGPT : une bulle de dialogue en forme de « O » (Obed) avec un point
// jaune (le curseur qui attend votre question). Vert et jaune : clin d'œil au
// drapeau togolais. Même dessin que public/favicon.svg et les icônes PWA.
// `animated` : la bulle se trace une fois. `thinking` : le point rebondit.
const BUBBLE = 'M32.3 65.7A25 25 0 1 1 45.7 72.6L26 80Z'

export default function Logo({ size = 28, className = '', animated = false, thinking = false, tile = false }) {
  const stroke = tile ? '#fff' : 'var(--accent)'
  return (
    <svg className={`logo-mark ${className}`} width={size} height={size} viewBox="0 0 100 100" fill="none" role="img" aria-label="ObedGPT">
      {tile && <rect width="100" height="100" rx="24" fill="var(--accent)" />}
      {animated ? (
        <motion.path d={BUBBLE} stroke={stroke} strokeWidth="9" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.1 }} />
      ) : (
        <path d={BUBBLE} stroke={stroke} strokeWidth="9" strokeLinejoin="round" />
      )}
      <motion.circle cx="50" cy="48" r="7" fill="var(--signal)"
        initial={animated ? { scale: 0 } : false}
        animate={thinking ? { y: [0, -6, 0], scale: [1, 1.12, 1] } : { y: 0, scale: 1 }}
        transition={thinking ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { type: 'spring', stiffness: 300, damping: 16, delay: animated ? 0.85 : 0 }}
        style={{ transformOrigin: '50px 48px' }} />
    </svg>
  )
}

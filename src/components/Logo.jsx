import { motion } from 'framer-motion'

// Logo ObedGPT : une bulle de dialogue (le chat) qui renferme une étincelle
// (l'IA), sur une tuile cobalt. Même dessin que public/favicon.svg et les
// icônes PWA. `animated` : la bulle se trace puis l'étincelle apparaît.
const BUBBLE = 'M32.3 65.7A25 25 0 1 1 45.7 72.6L26 80Z'
const SPARK = 'M50 35.5C51.4 42.6 54.4 45.6 61.5 48C54.4 50.4 51.4 53.4 50 60.5C48.6 53.4 45.6 50.4 38.5 48C45.6 45.6 48.6 42.6 50 35.5Z'

export default function Logo({ size = 28, className = '', animated = false, thinking = false }) {
  const id = `lg${size}${animated ? 'a' : ''}`
  return (
    <svg className={`logo-mark ${className}`} width={size} height={size} viewBox="0 0 100 100" fill="none" role="img" aria-label="ObedGPT">
      <defs>
        <linearGradient id={`${id}t`} x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#5a7dff" /><stop offset="1" stopColor="#1c3bb8" /></linearGradient>
        <linearGradient id={`${id}h`} x1="50" y1="0" x2="50" y2="55" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity=".22" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="100" height="100" rx="23" fill={`url(#${id}t)`} />
      <rect width="100" height="55" rx="23" fill={`url(#${id}h)`} />
      {animated ? (
        <>
          <motion.path d={BUBBLE} stroke="#fff" strokeWidth="6.5" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1], delay: 0.15 }} />
          <motion.path d={SPARK} fill="#fff" style={{ transformOrigin: '50px 48px' }} initial={{ scale: 0, rotate: -90, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.95 }} />
        </>
      ) : (
        <>
          <path d={BUBBLE} stroke="#fff" strokeWidth="6.5" strokeLinejoin="round" />
          <motion.path d={SPARK} fill="#fff" style={{ transformOrigin: '50px 48px' }} animate={thinking ? { scale: [1, 1.28, 1], rotate: [0, 45, 90] } : { scale: 1, rotate: 0 }} transition={thinking ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }} />
        </>
      )}
    </svg>
  )
}

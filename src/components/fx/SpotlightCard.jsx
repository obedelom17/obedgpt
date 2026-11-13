import { forwardRef } from 'react'
import { motion } from 'framer-motion'

// Carte dont la bordure et le fond s'éclairent là où se trouve le curseur.
// Les coordonnées passent par des variables CSS : aucun re-render React.
const SpotlightCard = forwardRef(function SpotlightCard({ children, className = '', ...rest }, ref) {
  const onMove = e => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <motion.button ref={ref} onPointerMove={onMove} whileHover={{ y: -2 }} whileTap={{ scale: 0.985 }} transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className={`spot-card ${className}`} {...rest}>
      {children}
    </motion.button>
  )
})
export default SpotlightCard

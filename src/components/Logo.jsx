// Logo ObedGPT : monogramme « G » géométrique blanc sur carré arrondi cobalt.
// Même dessin que public/favicon.svg et les icônes PWA.
export default function Logo({ size = 28, className = '' }) {
  return (
    <svg className={`logo-mark ${className}`} width={size} height={size} viewBox="0 0 100 100" fill="none" role="img" aria-label="ObedGPT">
      <rect width="100" height="100" rx="22" fill="#2a4fd6" />
      <path d="M66.09 36.5A21 21 0 1 0 71 50H52" stroke="#fff" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

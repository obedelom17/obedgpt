import { useRef } from 'react'

// Carte 3D : s'incline vers le curseur, avec un halo lumineux qui suit le
// pointeur. Mis à jour via rAF + variables CSS (aucun re-render React).
export default function Tilt({ as: Tag = 'div', max = 9, className = '', children, ...rest }) {
  const ref = useRef(null)
  const raf = useRef(0)

  const onMove = e => {
    if (e.pointerType === 'touch') return
    const el = ref.current
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      el.classList.add('tilting')
      el.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`)
      el.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`)
      el.style.setProperty('--mx', `${px * 100}%`)
      el.style.setProperty('--my', `${py * 100}%`)
    })
  }
  const onLeave = () => {
    const el = ref.current
    cancelAnimationFrame(raf.current)
    el.classList.remove('tilting')
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg')
  }
  return <Tag ref={ref} className={`tilt ${className}`} onPointerMove={onMove} onPointerLeave={onLeave} {...rest}>{children}</Tag>
}

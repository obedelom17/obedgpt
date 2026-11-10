import { useEffect, useRef } from 'react'

// Spotlight orange qui suit le curseur avec inertie + point magnétique qui
// grossit au survol des éléments cliquables. Désactivé sur tactile (CSS).
export default function CursorGlow() {
  const glow = useRef(null)
  const dot = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2
    let gx = tx, gy = ty, dx = tx, dy = ty, raf = 0
    const g = glow.current, d = dot.current

    const loop = () => {
      gx += (tx - gx) * 0.08; gy += (ty - gy) * 0.08
      dx += (tx - dx) * 0.35; dy += (ty - dy) * 0.35
      g.style.transform = `translate3d(${gx}px, ${gy}px, 0)`
      d.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    const move = e => {
      tx = e.clientX; ty = e.clientY
      g.classList.add('on'); d.classList.add('on')
      const hot = e.target.closest?.('button, a, [role="button"], input, textarea, select, label, .tilt')
      d.classList.toggle('hot', !!hot)
    }
    const leave = () => { g.classList.remove('on'); d.classList.remove('on') }
    raf = requestAnimationFrame(loop)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (<><div ref={glow} className="cursor-glow" aria-hidden="true" /><div ref={dot} className="cursor-dot" aria-hidden="true" /></>)
}

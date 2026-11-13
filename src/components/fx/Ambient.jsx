import { useEffect, useRef } from 'react'

// Fond en couches : nébuleuses douces qui dérivent lentement, trame de points
// masquée, grain fin, et un halo discret qui suit le pointeur (avec inertie).
// Quand l'IA génère une réponse (`busy`), une lueur respire en bas de l'écran.
export default function Ambient({ busy }) {
  const spot = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const el = spot.current
    let tx = window.innerWidth * 0.6, ty = window.innerHeight * 0.35, x = tx, y = ty, raf = 0, active = false
    const loop = () => {
      x += (tx - x) * 0.07; y += (ty - y) * 0.07
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    const move = e => { tx = e.clientX; ty = e.clientY; if (!active) { active = true; el.classList.add('on') } }
    const leave = () => { active = false; el.classList.remove('on') }
    const vis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0 } else if (!raf) raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    document.addEventListener('visibilitychange', vis)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])

  return (
    <div className="ambient" aria-hidden="true">
      <div className="blob a" /><div className="blob b" /><div className="blob c" />
      <div className="dots" />
      <div ref={spot} className="spot" />
      <div className={`busy-glow ${busy ? 'on' : ''}`} />
      <div className="grain" />
    </div>
  )
}

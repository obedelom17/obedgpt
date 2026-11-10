import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

// Fond vivant : aurores en dégradés (transform GPU uniquement) + réseau de
// particules canvas qui réagit au curseur / au doigt et s'accélère quand
// l'IA génère une réponse (prop `busy`). Se met en pause quand l'onglet est
// caché pour ne rien consommer en arrière-plan.
export default function Background({ busy }) {
  const canvasRef = useRef(null)
  const busyRef = useRef(false)
  const reduced = useReducedMotion()
  busyRef.current = busy

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w = 0, h = 0, raf = 0, running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const pointer = { x: -9999, y: -9999, active: false }
    let particles = []
    let energy = 1

    const isDark = () => document.documentElement.classList.contains('dark')

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(w < 768 ? 30 : 68, Math.floor((w * h) / 20000))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6, hue: Math.random() < 0.7 ? 24 : 345,
      }))
    }

    const LINK = w => (w < 768 ? 105 : 140)

    const frame = () => {
      if (!running) return
      const dark = isDark()
      energy += ((busyRef.current ? 2.6 : 1) - energy) * 0.04
      ctx.clearRect(0, 0, w, h)
      const link = LINK(w)
      const base = dark ? 0.55 : 0.4

      for (const p of particles) {
        p.x += p.vx * energy; p.y += p.vy * energy
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20
        if (pointer.active) {
          const dx = p.x - pointer.x, dy = p.y - pointer.y
          const d2 = dx * dx + dy * dy
          if (d2 < 22000) { const f = (1 - d2 / 22000) * 0.9; p.x += (dx / Math.sqrt(d2 + 1)) * f * 2.2; p.y += (dy / Math.sqrt(d2 + 1)) * f * 2.2 }
        }
        ctx.beginPath()
        ctx.fillStyle = `hsla(${p.hue}, 95%, ${dark ? 62 : 52}%, ${base + 0.2})`
        ctx.arc(p.x, p.y, p.r, 0, 6.2832)
        ctx.fill()
      }

      ctx.lineWidth = 1
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < link * link) {
            ctx.strokeStyle = `hsla(${a.hue}, 90%, ${dark ? 60 : 50}%, ${(1 - d2 / (link * link)) * base * 0.55})`
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
        }
        if (pointer.active) {
          const dx = a.x - pointer.x, dy = a.y - pointer.y
          const d2 = dx * dx + dy * dy
          if (d2 < 24000) {
            ctx.strokeStyle = `hsla(30, 100%, 60%, ${(1 - d2 / 24000) * 0.6})`
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(frame)
    }

    const onMove = e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true }
    const onLeave = () => { pointer.active = false }
    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf) }
      else if (!running) { running = true; raf = requestAnimationFrame(frame) }
    }

    resize()
    if (reduced) {
      frame(); running = false; cancelAnimationFrame(raf)
    } else {
      raf = requestAnimationFrame(frame)
    }
    let rt
    const onResize = () => { clearTimeout(rt); rt = setTimeout(resize, 150) }
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    window.addEventListener('touchend', onLeave, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    return () => {
      running = false; cancelAnimationFrame(raf); clearTimeout(rt)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('touchend', onLeave)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reduced])

  return (
    <div className="fx-bg" aria-hidden="true">
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />
      <canvas ref={canvasRef} />
      <div className="fx-grain" />
      <div className="fx-vignette" />
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

// Fond « espace profond » : nébuleuses CSS + champ d'étoiles 3D en canvas.
// Les étoiles avancent vers toi ; pendant que l'IA génère (`busy`) on passe
// en hyper-vitesse avec traînées lumineuses. Parallaxe au curseur, étoiles
// filantes, pause automatique quand l'onglet est caché.
export default function Background({ busy }) {
  const canvasRef = useRef(null)
  const busyRef = useRef(false)
  const reduced = useReducedMotion()
  busyRef.current = busy

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const Z = 1000
    let w = 0, h = 0, raf = 0, running = true, speed = 1.2
    let stars = [], shooters = [], shootTimer = 0
    const par = { x: 0, y: 0, tx: 0, ty: 0 }
    const isDark = () => document.documentElement.classList.contains('dark')

    const spawn = (z) => ({ x: (Math.random() * 2 - 1) * w, y: (Math.random() * 2 - 1) * h, z: z ?? Math.random() * Z, hue: [265, 190, 295, 0][(Math.random() * 4) | 0] })
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = Array.from({ length: w < 768 ? 110 : 240 }, () => spawn())
    }

    const frame = () => {
      if (!running) return
      const dark = isDark()
      const target = busyRef.current ? 16 : 1.1
      speed += (target - speed) * 0.05
      par.x += (par.tx - par.x) * 0.05; par.y += (par.ty - par.y) * 0.05
      ctx.clearRect(0, 0, w, h)
      const cx = w / 2 + par.x, cy = h / 2 + par.y, F = Math.min(w, h) * 0.55

      for (const s of stars) {
        const pz = s.z
        s.z -= speed
        if (s.z < 1) { Object.assign(s, spawn(Z)); continue }
        const k = F / s.z, x = cx + s.x * k * 0.55, y = cy + s.y * k * 0.55
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) { Object.assign(s, spawn(Z)); continue }
        const depth = 1 - s.z / Z
        const size = depth * 2.4 + 0.3
        const sat = s.hue === 0 ? '0%' : '95%'
        const light = dark ? 78 : 48
        ctx.fillStyle = `hsla(${s.hue}, ${sat}, ${light}%, ${(dark ? 0.35 : 0.3) + depth * 0.65})`
        if (speed > 4) {
          const k2 = F / (pz + speed * 2.2)
          ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = size * 0.8
          ctx.beginPath(); ctx.moveTo(cx + s.x * k2 * 0.55, cy + s.y * k2 * 0.55); ctx.lineTo(x, y); ctx.stroke()
        } else {
          ctx.beginPath(); ctx.arc(x, y, size, 0, 6.2832); ctx.fill()
        }
      }

      // Étoiles filantes
      if (dark && !busyRef.current && ++shootTimer > 260 && Math.random() < 0.02) {
        shootTimer = 0
        shooters.push({ x: Math.random() * w, y: Math.random() * h * 0.5, vx: 9 + Math.random() * 6, vy: 4 + Math.random() * 3, life: 38 })
      }
      shooters = shooters.filter(s => s.life > 0)
      for (const s of shooters) {
        s.x += s.vx; s.y += s.vy; s.life--
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 9, s.y - s.vy * 9)
        g.addColorStop(0, `rgba(255,255,255,${s.life / 38})`); g.addColorStop(1, 'rgba(139,92,246,0)')
        ctx.strokeStyle = g; ctx.lineWidth = 1.6
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 9, s.y - s.vy * 9); ctx.stroke()
      }
      raf = requestAnimationFrame(frame)
    }

    const onMove = e => { par.tx = (e.clientX / w - 0.5) * -46; par.ty = (e.clientY / h - 0.5) * -46 }
    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf) }
      else if (!running && !reduced) { running = true; raf = requestAnimationFrame(frame) }
    }
    resize()
    if (reduced) { frame(); running = false; cancelAnimationFrame(raf) } else raf = requestAnimationFrame(frame)
    let rt
    const onResize = () => { clearTimeout(rt); rt = setTimeout(resize, 150) }
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    return () => {
      running = false; cancelAnimationFrame(raf); clearTimeout(rt)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reduced])

  return (
    <div className="fx-bg" aria-hidden="true">
      <div className="nebula nebula-1" /><div className="nebula nebula-2" /><div className="nebula nebula-3" />
      <div className="fx-grid" />
      <canvas ref={canvasRef} />
      <div className="fx-grain" /><div className="fx-vignette" />
    </div>
  )
}

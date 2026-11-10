// Explosion de particules (confettis/étincelles) sur un canvas plein écran
// unique, créé à la demande. La boucle rAF ne tourne que tant qu'il reste
// des particules vivantes : zéro coût au repos.
let canvas, ctx, parts = [], raf = 0

const COLORS = ['#8b5cf6', '#a78bfa', '#22d3ee', '#67e8f9', '#e879f9', '#ffffff']

function ensure() {
  if (canvas) return
  canvas = document.createElement('canvas')
  canvas.className = 'fx-burst'
  document.body.appendChild(canvas)
  ctx = canvas.getContext('2d')
  const size = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
  size(); window.addEventListener('resize', size)
}

function tick() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  parts = parts.filter(p => p.life > 0)
  for (const p of parts) {
    p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 30))
    ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c
    if (p.shape === 0) ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2)
    else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.4, 0, 6.2832); ctx.fill() }
    ctx.restore()
  }
  if (parts.length) raf = requestAnimationFrame(tick)
  else { cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, canvas.width, canvas.height) }
}

export function burst(x, y, { count = 26, power = 7, gravity = 0.22 } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  ensure()
  for (let i = 0; i < count; i++) {
    const a = Math.random() * 6.2832
    const v = power * (0.35 + Math.random() * 0.8)
    parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.3, g: gravity,
      s: 5 + Math.random() * 6, c: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * 6.2832, vr: (Math.random() - 0.5) * 0.4,
      life: 55 + Math.random() * 35, shape: Math.random() < 0.55 ? 0 : 1,
    })
  }
  if (!raf) raf = requestAnimationFrame(tick)
}

// Feu d'artifice plein écran (easter egg)
export function fireworks() {
  const w = window.innerWidth, h = window.innerHeight
  for (let i = 0; i < 7; i++) {
    setTimeout(() => burst(w * (0.15 + Math.random() * 0.7), h * (0.2 + Math.random() * 0.35), { count: 60, power: 11, gravity: 0.16 }), i * 230)
  }
}

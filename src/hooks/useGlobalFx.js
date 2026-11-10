import { useEffect } from 'react'
import { fireworks } from '../components/fx/burst'

// Effets globaux par délégation d'évènements (un seul listener pour toute
// l'app) : ripple au clic, boutons magnétiques, easter egg Konami.
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

export function useGlobalFx() {
  useEffect(() => {
    const onDown = e => {
      const el = e.target.closest?.('.btn-primary, .btn-ghost, .mode-btn')
      if (!el || el.disabled) return
      const r = el.getBoundingClientRect()
      const size = Math.max(r.width, r.height) * 2
      const s = document.createElement('span')
      s.className = 'fx-ripple'
      s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`
      el.appendChild(s)
      setTimeout(() => s.remove(), 700)
    }

    let mag = null
    const onMove = e => {
      if (e.pointerType === 'touch') return
      const el = e.target.closest?.('[data-magnetic]')
      if (mag && mag !== el) { mag.style.transform = ''; mag = null }
      if (!el) return
      mag = el
      const r = el.getBoundingClientRect()
      const x = (e.clientX - (r.left + r.width / 2)) * 0.28
      const y = (e.clientY - (r.top + r.height / 2)) * 0.28
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
    const onLeaveDoc = () => { if (mag) { mag.style.transform = ''; mag = null } }

    let seq = 0
    const onKey = e => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      seq = k === KONAMI[seq] ? seq + 1 : (k === KONAMI[0] ? 1 : 0)
      if (seq === KONAMI.length) {
        seq = 0
        fireworks()
        document.documentElement.classList.add('rainbow-mode')
        setTimeout(() => document.documentElement.classList.remove('rainbow-mode'), 8000)
      }
    }

    document.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeaveDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeaveDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [])
}

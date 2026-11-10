import { useEffect, useState } from 'react'

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$<>/\\=+*'

// Effet « décryptage » : les lettres défilent au hasard puis se fixent une à une.
export function useScramble(text, { delay = 0, duration = 700 } = {}) {
  const [out, setOut] = useState(text)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setOut(text); return }
    let raf = 0, start = 0
    const t = setTimeout(() => {
      const step = (now) => {
        if (!start) start = now
        const p = Math.min(1, (now - start) / duration)
        const fixed = Math.floor(p * text.length)
        let s = ''
        for (let i = 0; i < text.length; i++) {
          s += i < fixed || text[i] === ' ' ? text[i] : POOL[(Math.random() * POOL.length) | 0]
        }
        setOut(s)
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay)
    setOut(delay ? text.replace(/[^ ]/g, '·') : text)
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [text, delay, duration])
  return out
}

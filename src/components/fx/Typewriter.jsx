import { useEffect, useState } from 'react'

// Machine à écrire qui tape, marque une pause, efface puis passe à la phrase suivante.
export default function Typewriter({ phrases, speed = 42, pause = 1700 }) {
  const [text, setText] = useState('')
  const [i, setI] = useState(0)
  const [del, setDel] = useState(false)

  useEffect(() => {
    const full = phrases[i % phrases.length]
    let t
    if (!del && text === full) t = setTimeout(() => setDel(true), pause)
    else if (del && text === '') { setDel(false); setI(n => n + 1) }
    else t = setTimeout(() => setText(full.slice(0, text.length + (del ? -1 : 1))), del ? speed / 2 : speed)
    return () => clearTimeout(t)
  }, [text, del, i, phrases, speed, pause])

  return <span>{text}<span className="typewriter-caret" aria-hidden="true" /></span>
}

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Mic, Command, ArrowRight } from 'lucide-react'
import Logo from '../Logo'

const KEY = 'obedgpt-onboarded'
const STEPS = [
  { icon: MessageSquare, title: 'Pose tes questions', text: 'Texte, images, documents PDF, Word et Excel. Réponses en streaming, avec sources.' },
  { icon: Mic, title: 'Parle ou écoute', text: 'Dictée vocale, lecture à voix haute, conversation vocale en direct.' },
  { icon: Command, title: 'Va plus vite', text: 'Ctrl K ouvre la palette. Ctrl / liste tous les raccourcis. Tape / pour les commandes rapides.' },
]

export default function Onboarding() {
  const [open, setOpen] = useState(() => { try { return !localStorage.getItem(KEY) } catch { return false } })
  const [i, setI] = useState(0)
  const done = () => { try { localStorage.setItem(KEY, '1') } catch {} ; setOpen(false) }
  if (!open) return null
  const S = STEPS[i], Icon = S.icon, last = i === STEPS.length - 1
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Bienvenue">
      <div className="modal" style={{ width: 'min(440px,100%)' }}>
        <div className="modal-body text-center !py-8">
          <div className="flex justify-center mb-5"><Logo size={48} animated /></div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <span className="b-ico mx-auto mb-3 inline-grid"><Icon size={18} /></span>
              <h2 className="text-xl font-display font-semibold mb-2">{S.title}</h2>
              <p className="text-sm text-ink2 leading-relaxed">{S.text}</p>
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-center gap-1.5 my-6" aria-hidden="true">{STEPS.map((_, k) => <span key={k} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 6, background: k === i ? 'var(--accent)' : 'var(--border-strong)', transition: 'width .25s' }} />)}</div>
          <div className="flex items-center justify-between">
            <button onClick={done} className="text-xs text-ink2 hover:text-ink">Passer</button>
            <button onClick={() => (last ? done() : setI(i + 1))} className="btn-primary">{last ? 'Commencer' : 'Suivant'} <ArrowRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

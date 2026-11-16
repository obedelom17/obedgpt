import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Share, SquarePlus, Download } from 'lucide-react'
import Logo from '../Logo'
import { useInstall, promptInstall, dismissInstall, recentlyDismissed } from '../../lib/install'

// Propose l'installation peu après l'arrivée, une fois l'accueil guidé terminé.
// Android / PC : bouton « Installer » (invite native). iPhone / iPad (Safari) : mode d'emploi en 2 gestes.
export default function InstallPrompt() {
  const { canPrompt, iosHelp, standalone } = useInstall()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (standalone || (!canPrompt && !iosHelp) || recentlyDismissed()) { setShow(false); return }
    let t
    const tryShow = () => {
      const onboarded = (() => { try { return !!localStorage.getItem('obedgpt-onboarded') } catch { return true } })()
      if (onboarded) t = setTimeout(() => setShow(true), 2500)
      else t = setTimeout(tryShow, 3000)
    }
    tryShow()
    return () => clearTimeout(t)
  }, [canPrompt, iosHelp, standalone])

  const close = () => { dismissInstall(); setShow(false) }
  const install = async () => { setShow(false); await promptInstall() }

  return (
    <AnimatePresence>
      {show && (
        <motion.aside role="dialog" aria-label="Installer l'application" className="install-card"
          initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
          <button className="install-x" onClick={close} aria-label="Fermer"><X size={15} /></button>
          <div className="flex items-start gap-3">
            <img src="/icon-192.png?v=2" alt="" width="48" height="48" style={{ borderRadius: 12, flexShrink: 0 }} />
            <div className="min-w-0">
              <p className="font-display font-semibold text-[15px] leading-tight">Installer ObedGPT</p>
              {canPrompt
                ? <p className="text-xs text-ink2 mt-1 leading-relaxed">Lance-le comme une application, avec son icône, en plein écran et plus rapidement.</p>
                : <p className="text-xs text-ink2 mt-1 leading-relaxed">Touche <Share size={12} className="inline -mt-0.5" /> Partager, puis <b>Sur l'écran d'accueil</b> <SquarePlus size={12} className="inline -mt-0.5" />.</p>}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button onClick={close} className="text-xs text-ink2 hover:text-ink px-2 py-1.5">Plus tard</button>
            {canPrompt && <button onClick={install} className="btn-primary"><Download size={14} /> Installer</button>}
            {!canPrompt && <button onClick={close} className="btn-primary">Compris</button>}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

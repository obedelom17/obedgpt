import { motion } from 'framer-motion'
import { ArrowRight, MessageSquarePlus, Link2 } from 'lucide-react'
import Logo from './Logo'
import { MarkdownRenderer } from './ui'
import ThemeToggle from './fx/ThemeToggle'
import LangToggle from './fx/LangToggle'

// Vue en lecture seule d'une conversation ouverte depuis un lien de partage.
export default function SharedView({ data, error, onContinue, onClose }) {
  const date = data?.date ? new Date(data.date).toLocaleDateString(undefined, { dateStyle: 'long' }) : ''
  return (
    <div className="shell !block overflow-y-auto" style={{ height: '100dvh' }}>
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div><div className="grain" aria-hidden="true" />
      <header className="shared-bar">
        <button className="flex items-center gap-2.5 min-w-0" onClick={onClose} aria-label="ObedGPT"><Logo size={30} tile /><span className="brand-name">ObedGPT</span></button>
        <div className="flex items-center gap-1.5"><LangToggle /><ThemeToggle /></div>
      </header>
      <main className="chat-col px-4 md:px-6 pt-6 pb-28">
        {error ? (
          <div className="card p-8 text-center space-y-4 max-w-md mx-auto mt-10">
            <Link2 size={28} className="mx-auto text-ink3" /><h1 className="font-display text-xl font-semibold">Lien invalide</h1>
            <p className="text-sm text-ink2">{error}</p><button className="btn-primary" onClick={onClose}>Ouvrir ObedGPT <ArrowRight size={15} /></button>
          </div>
        ) : (
          <>
            <div className="mb-8"><p className="text-xs font-mono text-accent mb-2">Conversation partagée{date ? ` · ${date}` : ''}</p><h1 className="page-title !text-[1.6rem] md:!text-[2rem]">{data.title || 'Conversation'}</h1></div>
            <div className="space-y-7">
              {data.messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.4) }} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role !== 'user' && <div className="avatar-wrap mt-0.5"><Logo size={28} /></div>}
                  <div className={`min-w-0 ${m.role === 'user' ? 'max-w-[86%]' : 'flex-1'}`}>
                    {m.role === 'user' ? <div className="message-user"><p className="text-[.95rem] break-words whitespace-pre-wrap">{m.content}</p></div> : <MarkdownRenderer content={m.content} />}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>
      {!error && (
        <div className="shared-cta">
          <button className="btn-primary" onClick={onContinue}><MessageSquarePlus size={16} /> Continuer dans ObedGPT</button>
        </div>
      )}
    </div>
  )
}

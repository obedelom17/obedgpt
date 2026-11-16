import { useEffect, useState } from 'react'
import { Copy, Share2, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Seg } from '../ui/controls'
import { encodeShare, shareUrl, createShortLink } from '../../lib/share'
import { useToast } from '../fx/Toast'

// Deux types de liens :
//  - court (/s/xxxxxxxxxx) : conversation hébergée 30 jours (si Upstash est configuré côté serveur) ;
//  - intégré (#s=…) : toute la conversation est dans l'URL, rien n'est stocké, mais le lien peut être long.
export default function ShareDialog({ title, messages, initialScope = 'all', onClose }) {
  const toast = useToast()
  const [scope, setScope] = useState(initialScope)
  const [kind, setKind] = useState('short')
  const [links, setLinks] = useState({ embedded: '', short: undefined }) // short: undefined = en cours, null = indisponible
  const [err, setErr] = useState('')
  const lastPair = (() => { let i = messages.length - 1; while (i > 0 && messages[i].role !== 'assistant') i--; return messages.slice(Math.max(0, i - 1), i + 1) })()
  const picked = scope === 'all' ? messages : lastPair

  useEffect(() => {
    let off = false; setLinks({ embedded: '', short: undefined }); setErr('')
    encodeShare({ title, messages: picked }).then(async code => {
      if (off) return
      setLinks({ embedded: shareUrl(code), short: undefined })
      const short = await createShortLink(code)
      if (!off) setLinks({ embedded: shareUrl(code), short })
    }).catch(e => !off && setErr(e.message))
    return () => { off = true }
  }, [scope]) // eslint-disable-line

  const hasShort = !!links.short
  const active = kind === 'short' && hasShort ? 'short' : 'embedded'
  const url = active === 'short' ? links.short : links.embedded
  const long = active === 'embedded' && url.length > 2000
  const loadingShort = links.embedded && links.short === undefined
  const copy = () => { navigator.clipboard?.writeText(url).then(() => toast('Lien copié')) }

  return (
    <Modal onClose={onClose} title="Partager par lien">
      <div className="space-y-4">
        {initialScope !== 'one' && messages.length > 2 && <Seg items={[{ id: 'all', label: 'Toute la conversation' }, { id: 'last', label: 'Dernier échange' }]} value={scope} onChange={setScope} label="Contenu à partager" />}
        {hasShort && <Seg items={[{ id: 'short', label: 'Lien court' }, { id: 'embedded', label: 'Sans serveur' }]} value={kind} onChange={setKind} label="Type de lien" />}
        {err ? <p className="text-sm text-danger">{err}</p> : !links.embedded ? <div className="flex items-center gap-2 text-sm"><Loader2 size={15} className="animate-spin text-accent" /> Création du lien…</div> : (
          <>
            <textarea readOnly rows={active === 'short' ? 1 : 4} value={url} className="input-field share-link resize-none" onFocus={e => e.target.select()} aria-label="Lien de partage" />
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={copy}><Copy size={15} /> Copier le lien</button>
              {navigator.share && <button className="btn-ghost" onClick={() => navigator.share({ title: title || 'ObedGPT', url }).catch(() => {})}><Share2 size={15} /> Partager…</button>}
              {loadingShort && <span className="inline-flex items-center gap-1.5 text-xs text-ink3"><Loader2 size={12} className="animate-spin" /> Lien court…</span>}
            </div>
            <p className="text-xs text-ink3 font-mono">{url.length.toLocaleString('fr-FR')} caractères · {picked.length} message{picked.length > 1 ? 's' : ''}</p>
            {long && <p className="flex gap-2 text-xs text-warn"><AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> Lien long : certaines messageries le coupent. Choisis « Dernier échange », ou configure les liens courts (Upstash) côté serveur.</p>}
            <p className="flex gap-2 text-xs text-ink3"><ShieldCheck size={14} className="flex-shrink-0 mt-0.5 text-accent" />
              {active === 'short' ? 'Le lien court conserve la conversation 30 jours sur le serveur de l\'application, puis la supprime. Les images et le raisonnement ne sont pas inclus. Toute personne qui a le lien peut lire.'
                : 'La conversation est contenue dans le lien lui-même : rien n\'est enregistré sur un serveur. Les images et le raisonnement ne sont pas inclus. Toute personne qui a le lien peut lire.'}</p>
          </>
        )}
      </div>
    </Modal>
  )
}

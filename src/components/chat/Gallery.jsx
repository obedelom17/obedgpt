import { useEffect, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { EmptyState } from '../ui'
import { Image as ImageIcon } from 'lucide-react'
import { listImages, deleteImage } from '../../lib/gallery'

export default function Gallery({ open, onClose }) {
  const [items, setItems] = useState(null)
  useEffect(() => { if (open) listImages().then(setItems) }, [open])
  if (!open) return null
  const remove = async id => { await deleteImage(id); setItems(l => l.filter(i => i.id !== id)) }
  return (
    <Modal title="Galerie d'images" onClose={onClose} wide>
      {items && items.length === 0 && <EmptyState icon={ImageIcon} title="Aucune image" description="Génère-en une avec /image dans le chat." />}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))' }}>
        {(items || []).map(i => (
          <figure key={i.id} className="m-0">
            <img src={i.data} alt={i.prompt} loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border-strong)' }} />
            <figcaption className="text-xs text-ink3 mt-1 line-clamp-2">{i.prompt}</figcaption>
            <div className="flex gap-1 mt-1">
              <a href={i.data} download={`${i.id}.jpg`} className="mini-action" aria-label="Télécharger"><Download size={12} /> Télécharger</a>
              <button onClick={() => remove(i.id)} className="mini-action" aria-label="Supprimer"><Trash2 size={12} /> Supprimer</button>
            </div>
          </figure>
        ))}
      </div>
    </Modal>
  )
}

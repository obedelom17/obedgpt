import { useRef, useState } from 'react'
import { FileText, FileSpreadsheet, Presentation, Image as ImageIcon, Upload, Trash2, Loader2, ShieldCheck } from 'lucide-react'
import { Modal } from '../ui/CodeBlock'
import { Seg, Switch } from '../ui/controls'
import { DOC_ACCEPT } from '../../lib/docs/extract'
import { docChars } from '../../lib/docs/rag'
import { DEPTH } from '../../lib/docs/query'

const ICON = { pdf: FileText, docx: FileText, xlsx: FileSpreadsheet, xls: FileSpreadsheet, csv: FileSpreadsheet, pptx: Presentation, png: ImageIcon, jpg: ImageIcon, jpeg: ImageIcon, webp: ImageIcon }
const unit = (n, one, many) => `${n} ${n > 1 ? many : one}`
const docHint = d => `${d.kind === 'pptx' ? unit(d.pages.length, 'diapositive', 'diapositives') : ['xlsx', 'xls'].includes(d.kind) ? unit(d.pages.length, 'bloc', 'blocs') : unit(d.pages.length, 'page', 'pages')} · ${d.chars < 1000 ? d.chars : (d.chars / 1000).toFixed(d.chars > 9999 ? 0 : 1) + 'k'} caractères · ${fmtSize(d.size)}${d.ocr ? ' · OCR' : ''}${d.truncated ? ' · tronqué' : ''}`
const fmtSize = n => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`)

export default function DocsDialog({ docs, activeIds, onToggle, onImport, onDelete, depth, onDepth, status, errors, onClose }) {
  const fileRef = useRef(null)
  const [over, setOver] = useState(false)
  const busy = !!status
  const activeDocs = docs.filter(d => activeIds.includes(d.id))
  const total = docChars(activeDocs)
  return (
    <Modal onClose={onClose} title="Documents">
      <div className="space-y-4">
        <p className="text-sm text-ink2">Importe des PDF, Word, Excel, PowerPoint, textes ou photos. Le texte est lu dans ton navigateur ; seuls les passages utiles sont envoyés à Groq avec ta question.</p>
        <button className="drop w-full" data-over={over} disabled={busy} onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); onImport([...e.dataTransfer.files]) }}>
          {busy ? <Loader2 size={22} className="animate-spin text-accent" /> : <Upload size={22} className="text-accent" />}
          <span className="font-medium text-ink">{busy ? status : 'Importer des documents'}</span>
          {!busy && <span className="text-xs text-ink3">PDF, DOCX, XLSX, CSV, PPTX, TXT, MD, JSON, HTML, images · 40 Mo max</span>}
        </button>
        <input ref={fileRef} type="file" multiple accept={DOC_ACCEPT} hidden onChange={e => { onImport([...e.target.files]); e.target.value = '' }} />
        {errors?.length > 0 && <div className="space-y-1">{errors.map((e, i) => <p key={i} className="text-xs text-danger">{e}</p>)}</div>}

        {docs.length === 0 ? <p className="text-sm text-ink3 text-center py-2">Aucun document pour l'instant.</p> : (
          <div className="space-y-2">
            {docs.map(d => {
              const Icon = ICON[d.kind] || FileText
              return (
                <div key={d.id} className="doc-row">
                  <Switch icon={Icon} checked={activeIds.includes(d.id)} onChange={() => onToggle(d.id)} label={d.name}
                    hint={docHint(d)} />
                  <button className="icon-btn" onClick={() => onDelete(d.id)} aria-label={`Supprimer ${d.name}`}><Trash2 size={15} /></button>
                </div>
              )
            })}
          </div>
        )}

        <div className="space-y-2">
          <span className="field-label">Profondeur de lecture</span>
          <Seg items={[{ id: 'short', label: 'Courte' }, { id: 'normal', label: 'Normale' }, { id: 'large', label: 'Large' }]} value={depth} onChange={onDepth} label="Profondeur de lecture" />
          <p className="text-xs text-ink3">{total > 0 && total <= DEPTH[depth] ? 'Les documents actifs tiennent en entier dans chaque question.' : 'Pour un gros document, chaque question reçoit les meilleurs passages (recherche par mots-clés), pas tout le texte.'} « Large » envoie plus de contexte mais peut dépasser le quota gratuit de Groq.</p>
        </div>
        <p className="flex gap-2 text-xs text-ink3"><ShieldCheck size={14} className="flex-shrink-0 mt-0.5 text-accent" /> Les fichiers restent dans ce navigateur (IndexedDB). Les PDF scannés et les photos sont lus par le modèle vision de Groq, page par page.</p>
      </div>
    </Modal>
  )
}

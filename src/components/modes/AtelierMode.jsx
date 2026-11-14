import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, AlignLeft, PenLine, SpellCheck, Mail, Braces, GraduationCap, ScanEye, ShieldCheck, ShieldAlert, Terminal, Upload, Copy, Download, Loader2, Play, RotateCcw, Check, X, Layers } from 'lucide-react'
import { Seg, Field, Chip } from '../ui/controls'
import { ErrorBanner, MarkdownRenderer } from '../ui'
import { useToast } from '../fx/Toast'
import { postJson } from '../../lib/api'
import { imageToDataUrls, downloadText } from '../../lib/audio'

const LANG_OPTS = [['en', 'Anglais'], ['fr', 'Français'], ['es', 'Espagnol'], ['de', 'Allemand'], ['pt', 'Portugais'], ['it', 'Italien'], ['ar', 'Arabe'], ['sw', 'Swahili'], ['ee', 'Éwé'], ['yo', 'Yoruba'], ['zh', 'Chinois'], ['ja', 'Japonais']]
const TONES = ['professionnel', 'amical', 'persuasif', 'simple', 'soutenu', 'concis', 'enthousiaste']

const TOOLS = [
  { id: 'translate', label: 'Traduire', icon: Languages, desc: 'Traduction fidèle vers 12 langues.', ph: 'Colle le texte à traduire…', opts: { target: 'en' } },
  { id: 'summarize', label: 'Résumer', icon: AlignLeft, desc: 'Points clés, TL;DR ou paragraphes.', ph: 'Colle un article, un cours, un compte rendu…', opts: { length: 'medium', style: 'bullets' } },
  { id: 'rewrite', label: 'Reformuler', icon: PenLine, desc: 'Change le ton sans changer le sens.', ph: 'Colle le texte à reformuler…', opts: { tone: 'professionnel' } },
  { id: 'correct', label: 'Corriger', icon: SpellCheck, desc: 'Orthographe, grammaire, ponctuation.', ph: 'Colle le texte à corriger…', opts: {} },
  { id: 'email', label: 'E-mail', icon: Mail, desc: 'Un e-mail prêt à envoyer.', ph: "Décris l'objectif : relancer un client, demander un stage…", opts: { tone: 'professionnel', language: 'fr' } },
  { id: 'extract_json', label: 'JSON', icon: Braces, desc: 'Extrait des données structurées.', ph: 'Colle un texte (facture, annonce, CV, e-mail)…', opts: { fields: '' } },
  { id: 'quiz', label: 'Quiz', icon: GraduationCap, desc: 'Quiz interactif et cartes de révision.', ph: 'Colle ton cours, ou écris un sujet…', opts: { count: 6, level: 'intermédiaire' } },
  { id: 'vision', label: 'Image', icon: ScanEye, desc: 'Décrire, lire (OCR), expliquer.', ph: 'Question sur l\'image (optionnel)…', opts: { mode: 'describe' } },
  { id: 'moderate', label: 'Modération', icon: ShieldCheck, desc: 'Vérifie un texte selon ta politique.', ph: 'Colle le contenu à vérifier…', opts: { policy: '' } },
  { id: 'injection', label: 'Anti-injection', icon: ShieldAlert, desc: 'Détecte jailbreak et injection de prompt.', ph: 'Colle un prompt suspect…', opts: {} },
  { id: 'run_code', label: 'Exécuter', icon: Terminal, desc: 'Python exécuté côté Groq.', ph: 'Ex. Calcule les 20 premiers nombres premiers et leur somme.', opts: {} },
]

function Quiz({ data }) {
  const cards = data?.cards || []
  const [mode, setMode] = useState('quiz')
  const [i, setI] = useState(0)
  const [pick, setPick] = useState(null)
  const [score, setScore] = useState(0)
  const [flip, setFlip] = useState(false)
  const [finished, setFinished] = useState(false)
  if (!cards.length) return <p className="text-sm text-ink2">Le modèle n'a pas renvoyé de questions exploitables. Réessaie avec un texte plus long.</p>
  const c = cards[i]
  const reset = () => { setI(0); setPick(null); setScore(0); setFlip(false); setFinished(false) }
  const next = () => { setPick(null); setFlip(false); if (i + 1 >= cards.length) setFinished(true); else setI(i + 1) }
  const choose = k => { if (pick != null) return; setPick(k); if (k === c.answer) setScore(s => s + 1) }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-display font-semibold">{data.title || 'Quiz'}</h3>
        <Seg items={[{ id: 'quiz', label: 'Quiz' }, { id: 'cards', label: 'Cartes', icon: Layers }]} value={mode} onChange={m => { setMode(m); reset() }} label="Mode de révision" />
      </div>
      <div className="meter" aria-hidden="true"><i style={{ width: `${((finished ? cards.length : i) / cards.length) * 100}%` }} /></div>
      {finished ? (
        <div className="card p-6 text-center space-y-3">
          <p className="font-display text-3xl font-semibold">{mode === 'quiz' ? `${score} / ${cards.length}` : 'Terminé'}</p>
          <p className="text-ink2 text-sm">{mode === 'quiz' ? (score === cards.length ? 'Sans faute.' : score >= cards.length / 2 ? 'Bon résultat, révise les erreurs.' : 'Relis le cours puis recommence.') : 'Tu as parcouru toutes les cartes.'}</p>
          <button className="btn-primary" onClick={reset}><RotateCcw size={15} /> Recommencer</button>
        </div>
      ) : mode === 'quiz' ? (
        <div className="space-y-3">
          <p className="text-xs text-ink3 font-mono">Question {i + 1}/{cards.length}</p>
          <p className="font-medium text-[1.02rem] leading-snug">{c.q}</p>
          <div className="space-y-2">
            {(c.choices || []).map((ch, k) => (
              <button key={k} className="choice" disabled={pick != null} data-state={pick == null ? '' : k === c.answer ? 'ok' : k === pick ? 'bad' : ''} onClick={() => choose(k)}>
                <span className="flex items-center gap-2"><span className="font-mono text-xs text-ink3">{'ABCD'[k]}</span><span className="flex-1">{ch}</span>{pick != null && k === c.answer && <Check size={15} />}{pick === k && k !== c.answer && <X size={15} />}</span>
              </button>
            ))}
          </div>
          {pick != null && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3"><p className="text-sm text-ink2">{c.explanation}</p><button className="btn-primary" onClick={next}>{i + 1 >= cards.length ? 'Voir le score' : 'Suivante'}</button></motion.div>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flip" data-flip={flip} onClick={() => setFlip(f => !f)} role="button" tabIndex={0} aria-label="Retourner la carte" onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setFlip(f => !f))}>
            <div className="flip-in">
              <div className="flip-face"><span className="text-xs text-ink3 font-mono">Question {i + 1}/{cards.length}</span><p className="font-medium text-[1.05rem]">{c.q}</p><span className="text-xs text-ink3">Touche pour retourner</span></div>
              <div className="flip-face back"><p className="font-semibold">{c.choices?.[c.answer]}</p><p className="text-sm text-ink2">{c.explanation}</p></div>
            </div>
          </div>
          <button className="btn-primary" onClick={next}>{i + 1 >= cards.length ? 'Terminer' : 'Carte suivante'}</button>
        </div>
      )}
    </div>
  )
}

export default function AtelierMode() {
  const toast = useToast()
  const [toolId, setToolId] = useState('translate')
  const tool = TOOLS.find(t => t.id === toolId)
  const [opts, setOpts] = useState({})
  const [text, setText] = useState('')
  const [images, setImages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [out, setOut] = useState(null)
  const fileRef = useRef(null)
  const imgRef = useRef(null)
  const o = { ...tool.opts, ...opts }
  const set = patch => setOpts(p => ({ ...p, ...patch }))
  const pickTool = id => { setToolId(id); setOpts({}); setOut(null); setError(null) }

  const loadFile = async f => { if (!f) return; if (f.size > 2_000_000) return setError('Fichier trop lourd (2 Mo max).'); setText((await f.text()).slice(0, 24000)) }
  const addImages = async files => {
    try { const done = await Promise.all([...files].filter(f => f.type.startsWith('image/')).slice(0, 4).map(f => imageToDataUrls(f, 1600))); setImages(done) } catch (e) { setError(e.message) }
  }

  const run = async () => {
    setBusy(true); setError(null); setOut(null)
    try {
      const body = toolId === 'vision' ? { tool: 'vision', prompt: text, mode: o.mode, images: images.map(i => i.full) } : { tool: toolId, text, options: o }
      setOut({ ...(await postJson('/api/tools', body)), tool: toolId })
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const canRun = toolId === 'vision' ? images.length > 0 : text.trim().length > 0
  const copy = t => { navigator.clipboard?.writeText(t); toast('Copié') }
  const verdict = out?.tool === 'moderate' ? out.json : null

  return (
    <div className="page">
      <div className="page-inner space-y-5">
        <div>
          <h2 className="page-title">Atelier</h2>
          <p className="page-sub">Des outils rapides propulsés par Groq : texte, JSON structuré, quiz, vision, sécurité et code exécuté.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Outils">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={id === toolId} className={`tag !py-1.5 !px-3 gap-1.5 ${id === toolId ? 'active-tag' : ''}`} onClick={() => pickTool(id)}><Icon size={13} /> {label}</button>
          ))}
        </div>

        <div className="card p-4 space-y-4">
          <p className="text-sm text-ink2">{tool.desc}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {toolId === 'translate' && <Field label="Langue cible"><select className="input-field text-sm" value={o.target} onChange={e => set({ target: e.target.value })} aria-label="Langue cible">{LANG_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>}
            {toolId === 'summarize' && <>
              <Field label="Longueur"><Seg items={[{ id: 'short', label: 'Court' }, { id: 'medium', label: 'Moyen' }, { id: 'long', label: 'Long' }]} value={o.length} onChange={v => set({ length: v })} label="Longueur" /></Field>
              <Field label="Format"><Seg items={[{ id: 'bullets', label: 'Points' }, { id: 'paragraph', label: 'Texte' }, { id: 'tldr', label: 'TL;DR' }]} value={o.style} onChange={v => set({ style: v })} label="Format" /></Field>
            </>}
            {(toolId === 'rewrite' || toolId === 'email') && <Field label="Ton"><select className="input-field text-sm" value={o.tone} onChange={e => set({ tone: e.target.value })} aria-label="Ton">{TONES.map(t => <option key={t}>{t}</option>)}</select></Field>}
            {toolId === 'email' && <Field label="Langue"><select className="input-field text-sm" value={o.language} onChange={e => set({ language: e.target.value })} aria-label="Langue">{LANG_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>}
            {toolId === 'extract_json' && <div className="sm:col-span-2"><Field label="Champs à extraire" hint="Sépare par des virgules. Laisse vide pour laisser le modèle choisir."><input className="input-field text-sm" value={o.fields} onChange={e => set({ fields: e.target.value })} placeholder="nom, date, montant, adresse" /></Field></div>}
            {toolId === 'quiz' && <>
              <Field label={`Nombre de questions : ${o.count}`}><input type="range" className="range" min="3" max="15" value={o.count} onChange={e => set({ count: +e.target.value })} aria-label="Nombre de questions" /></Field>
              <Field label="Niveau"><Seg items={[{ id: 'débutant', label: 'Facile' }, { id: 'intermédiaire', label: 'Moyen' }, { id: 'avancé', label: 'Difficile' }]} value={o.level} onChange={v => set({ level: v })} label="Niveau" /></Field>
            </>}
            {toolId === 'vision' && <div className="sm:col-span-2"><Field label="Mode"><Seg items={[{ id: 'describe', label: 'Décrire' }, { id: 'ocr', label: 'Lire (OCR)' }, { id: 'explain', label: 'Expliquer' }, { id: 'table', label: 'Tableau' }]} value={o.mode} onChange={v => set({ mode: v })} label="Mode d'analyse" /></Field></div>}
            {toolId === 'moderate' && <div className="sm:col-span-2"><Field label="Politique (optionnel)" hint="Décris ce qui est interdit ou autorisé. Modèle gpt-oss-safeguard."><textarea className="input-field w-full resize-none text-sm" rows={3} value={o.policy} onChange={e => set({ policy: e.target.value })} placeholder="Par défaut : violence, haine, contenu sexuel explicite, données personnelles…" /></Field></div>}
          </div>

          {toolId === 'vision' && (
            <div className="space-y-3">
              <button className="drop w-full" onClick={() => imgRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addImages(e.dataTransfer.files) }}>
                <Upload size={20} className="text-accent" /><span className="font-medium text-ink">Importer jusqu'à 4 images</span><span className="text-xs text-ink3">Photo d'exercice, capture d'écran, schéma, facture…</span>
              </button>
              <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={e => { addImages(e.target.files); e.target.value = '' }} />
              {images.length > 0 && <div className="attach-strip !p-0">{images.map((im, k) => <div key={k} className="attach !w-20 !h-20"><img src={im.thumb} alt={`Image ${k + 1}`} /><button onClick={() => setImages(l => l.filter((_, j) => j !== k))} aria-label="Retirer">×</button></div>)}</div>}
            </div>
          )}

          <div>
            <textarea className="input-field w-full resize-y min-h-[120px] text-[.95rem]" rows={toolId === 'vision' ? 2 : 7} value={text} onChange={e => setText(e.target.value.slice(0, 24000))} placeholder={tool.ph} aria-label="Contenu" />
            <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
              <span className="text-xs text-ink3 font-mono">{text.length.toLocaleString('fr-FR')} car.</span>
              {toolId !== 'vision' && <>
                <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json,.log,.html,.xml,text/*" hidden onChange={e => { loadFile(e.target.files[0]); e.target.value = '' }} />
                <button className="btn-ghost !py-1 text-xs" onClick={() => fileRef.current?.click()}><Upload size={13} /> Importer un fichier texte</button>
              </>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn-primary" onClick={run} disabled={!canRun || busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Lancer</button>
            {(text || out) && <button className="btn-ghost" onClick={() => { setText(''); setOut(null); setImages([]) }}><RotateCcw size={14} /> Effacer</button>}
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        <AnimatePresence>
          {out && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card p-4 space-y-4">
              {out.tool === 'quiz' ? <Quiz data={out.json} /> :
               out.tool === 'moderate' ? (
                 <div className="space-y-3">
                   <div className="flex items-center gap-2 flex-wrap"><span className="field-label !mb-0">Verdict</span>{verdict ? <Chip tone={verdict.violation ? 'signal' : 'accent'}>{verdict.violation ? 'Violation' : 'Conforme'}</Chip> : null}{verdict?.category && <Chip>{verdict.category}</Chip>}{verdict?.confidence && <Chip>confiance {verdict.confidence}</Chip>}</div>
                   <p className="text-[.95rem]">{verdict?.rationale || out.text}</p>
                 </div>
               ) : out.tool === 'injection' ? (
                 <div className="space-y-3">
                   <div className="flex items-center gap-2"><span className="field-label !mb-0">Analyse</span><Chip tone={out.label === 'risque' ? 'signal' : 'accent'}>{out.label}</Chip></div>
                   {out.score != null && <><div className="meter" aria-hidden="true"><i style={{ width: `${Math.round(out.score * 100)}%` }} /></div><p className="text-xs text-ink3 font-mono">Probabilité d'attaque : {(out.score * 100).toFixed(1)} %</p></>}
                 </div>
               ) : out.json ? (
                 <div className="space-y-3"><span className="field-label">JSON</span><pre className="pre-out">{JSON.stringify(out.json, null, 2)}</pre>
                   <div className="flex gap-2 flex-wrap"><button className="btn-ghost" onClick={() => copy(JSON.stringify(out.json, null, 2))}><Copy size={14} /> Copier</button><button className="btn-ghost" onClick={() => downloadText(JSON.stringify(out.json, null, 2), 'obedgpt.json', 'application/json')}><Download size={14} /> Télécharger</button></div></div>
               ) : (
                 <div className="space-y-3">
                   <MarkdownRenderer content={out.text} />
                   {out.tools?.filter(t => t.code).map((t, k) => <details key={k} className="reasoning"><summary><Terminal size={14} /> Code exécuté</summary><div className="px-3 pb-3 pt-2"><MarkdownRenderer content={'```python\n' + t.code + '\n```' + (t.output ? '\n```text\n' + t.output + '\n```' : '')} /></div></details>)}
                   <div className="flex gap-2 flex-wrap"><button className="btn-ghost" onClick={() => copy(out.text)}><Copy size={14} /> Copier</button></div>
                 </div>
               )}
              <p className="text-xs text-ink3 font-mono">{out.model}{out.usage?.total_tokens ? ` · ${out.usage.total_tokens} tokens` : ''}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

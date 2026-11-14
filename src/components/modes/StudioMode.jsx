import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, Layers, Plug, Gauge, RefreshCw, Plus, Trash2, Play, Download, Loader2, Search, Eye, Brain, Mic, Volume2, ShieldCheck, Sparkles, Wrench, Check } from 'lucide-react'
import { Seg, Switch, Field, Chip } from '../ui/controls'
import { ErrorBanner } from '../ui'
import { useToast } from '../fx/Toast'
import { fetchModels, postJson } from '../../lib/api'
import { usePrefs } from '../../lib/prefs'
import { useQuota } from '../../lib/quota'
import { downloadText } from '../../lib/audio'

const TABS = [{ id: 'models', label: 'Modèles', icon: Cpu }, { id: 'batch', label: 'Lots', icon: Layers }, { id: 'mcp', label: 'Agent', icon: Plug }, { id: 'quota', label: 'Quota', icon: Gauge }]
const KIND = { chat: ['Chat', Sparkles], compound: ['Compound · web et code', Sparkles], stt: ['Parole vers texte', Mic], tts: ['Texte vers parole', Volume2], guard: ['Sécurité', ShieldCheck] }

function Models() {
  const [prefs, setPrefs] = usePrefs()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')
  const load = useCallback((force) => { setErr(null); fetchModels(force).then(setData).catch(e => setErr(e.message)) }, [])
  useEffect(() => { load() }, [load])
  const groups = useMemo(() => {
    const list = (data?.models || []).filter(m => m.id.toLowerCase().includes(q.toLowerCase()))
    return Object.keys(KIND).map(k => [k, list.filter(m => m.kind === k)]).filter(([, l]) => l.length)
  }, [data, q])
  return (
    <div className="space-y-4">
      <ErrorBanner error={err} onDismiss={() => setErr(null)} />
      {data && (
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={data.live ? 'accent' : 'signal'}>{data.live ? 'Liste en direct de Groq' : 'Liste de secours'}</Chip>
          <Chip>{data.models.length} modèles</Chip>
          <Chip>{data.keys} clé{data.keys > 1 ? 's' : ''} configurée{data.keys > 1 ? 's' : ''}</Chip>
          <button className="icon-btn ml-auto" onClick={() => load(true)} aria-label="Actualiser"><RefreshCw size={15} /></button>
        </div>
      )}
      <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none" /><input className="input-field !pl-9 text-sm" value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrer les modèles" aria-label="Filtrer les modèles" /></div>
      {!data && !err && <div className="card p-4 flex items-center gap-2 text-sm"><Loader2 size={15} className="animate-spin text-accent" /> Chargement…</div>}
      {groups.map(([k, list]) => {
        const [label, Icon] = KIND[k]
        return (
          <section key={k} className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink2"><Icon size={14} /> {label}</h3>
            {list.map(m => (
              <div key={m.id} className="model-row">
                <div className="min-w-0 space-y-1.5">
                  <code>{m.id}</code>
                  <div className="flex flex-wrap gap-1.5">
                    {m.vision && <Chip tone="accent"><Eye size={10} /> vision</Chip>}
                    {m.reasoning && <Chip><Brain size={10} /> raisonnement</Chip>}
                    {m.ctx && <Chip>{(m.ctx / 1000).toFixed(0)}k contexte</Chip>}
                  </div>
                </div>
                {(m.kind === 'chat') && (prefs.model === m.id
                  ? <Chip tone="accent"><Check size={11} /> défaut</Chip>
                  : <button className="btn-ghost !py-1 text-xs flex-shrink-0" onClick={() => setPrefs({ model: m.id })}>Utiliser</button>)}
              </div>
            ))}
          </section>
        )
      })}
      {prefs.model !== 'auto' && <button className="btn-ghost" onClick={() => setPrefs({ model: 'auto' })}>Revenir au modèle automatique</button>}
    </div>
  )
}

const JOBS_KEY = 'obedgpt-batches'
const loadJobs = () => { try { return JSON.parse(localStorage.getItem(JOBS_KEY) || '[]') } catch { return [] } }
const STATUS = { validating: 'Validation', in_progress: 'En cours', finalizing: 'Finalisation', completed: 'Terminé', failed: 'Échec', expired: 'Expiré', cancelling: 'Annulation', cancelled: 'Annulé' }

function Batch() {
  const [prefs] = usePrefs()
  const toast = useToast()
  const [prompts, setPrompts] = useState('')
  const [system, setSystem] = useState('')
  const [jobs, setJobs] = useState(loadJobs)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const save = list => { setJobs(list); localStorage.setItem(JOBS_KEY, JSON.stringify(list.slice(0, 20))) }
  const lines = prompts.split('\n').map(l => l.trim()).filter(Boolean)

  const create = async () => {
    setBusy(true); setError(null)
    try {
      const j = await postJson('/api/batch', { action: 'create', prompts: lines, system, model: prefs.model === 'auto' ? undefined : prefs.model })
      save([{ id: j.id, key: j.key, status: j.status, count: j.count, model: j.model, at: Date.now() }, ...jobs]); setPrompts(''); toast('Lot envoyé')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const refresh = async job => {
    try { const s = await postJson('/api/batch', { action: 'status', id: job.id, key: job.key }); save(jobs.map(j => j.id === job.id ? { ...j, status: s.status, counts: s.counts, outputFileId: s.outputFileId } : j)) }
    catch (e) { setError(e.message) }
  }
  const cancel = async job => { try { await postJson('/api/batch', { action: 'cancel', id: job.id, key: job.key }); refresh(job) } catch (e) { setError(e.message) } }
  const fetchResults = async job => {
    try { const r = await postJson('/api/batch', { action: 'results', id: job.id, key: job.key, fileId: job.outputFileId }); setResults({ job, items: r.items }) } catch (e) { setError(e.message) }
  }

  return (
    <div className="space-y-5">
      <div className="card p-4 space-y-4">
        <p className="text-sm text-ink2">Envoie jusqu'à 200 prompts en une seule fois : Groq les traite en arrière-plan, avec son propre quota. Idéal pour traduire, classer ou résumer beaucoup de textes.</p>
        <Field label={`Prompts (un par ligne) · ${lines.length}/200`}><textarea className="input-field w-full resize-y text-sm" rows={6} value={prompts} onChange={e => setPrompts(e.target.value)} placeholder={"Traduis « bonjour » en anglais\nRésume l'histoire du Togo en 2 phrases"} aria-label="Prompts" /></Field>
        <Field label="Instruction commune (optionnel)"><input className="input-field text-sm" value={system} onChange={e => setSystem(e.target.value)} placeholder="Réponds en une phrase." /></Field>
        <button className="btn-primary" onClick={create} disabled={!lines.length || busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Créer le lot</button>
        <p className="text-xs text-ink3">L'API Batch peut être réservée aux comptes Groq avec facturation activée : l'erreur de Groq s'affiche telle quelle si c'est le cas.</p>
      </div>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      {jobs.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-ink2">Mes lots</h3>
          {jobs.map(j => (
            <div key={j.id} className="model-row !items-start flex-wrap">
              <div className="min-w-0 space-y-1.5">
                <code>{j.id}</code>
                <div className="flex flex-wrap gap-1.5"><Chip tone={j.status === 'completed' ? 'accent' : undefined}>{STATUS[j.status] || j.status}</Chip><Chip>{j.count} prompts</Chip>{j.counts && <Chip>{j.counts.completed}/{j.counts.total} faits</Chip>}</div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button className="btn-ghost !py-1 text-xs" onClick={() => refresh(j)}><RefreshCw size={12} /> Statut</button>
                {j.status === 'completed' && j.outputFileId && <button className="btn-primary !py-1 text-xs" onClick={() => fetchResults(j)}><Download size={12} /> Résultats</button>}
                {['validating', 'in_progress'].includes(j.status) && <button className="btn-ghost danger !py-1 text-xs" onClick={() => cancel(j)}>Annuler</button>}
                <button className="icon-btn" aria-label="Oublier ce lot" onClick={() => save(jobs.filter(x => x.id !== j.id))}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </section>
      )}
      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap"><span className="field-label !mb-0">Résultats · {results.items.length}</span>
              <div className="flex gap-2"><button className="btn-ghost !py-1 text-xs" onClick={() => downloadText(JSON.stringify(results.items, null, 2), 'lot-resultats.json', 'application/json')}><Download size={12} /> JSON</button>
                <button className="btn-ghost !py-1 text-xs" onClick={() => downloadText('id,reponse\n' + results.items.map(i => `${i.id},"${(i.text || i.error).replace(/"/g, '""')}"`).join('\n'), 'lot-resultats.csv', 'text/csv')}><Download size={12} /> CSV</button></div></div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">{results.items.map(i => <div key={i.id} className="seg-row"><time>{i.id}</time><span className="whitespace-pre-wrap break-words min-w-0">{i.text || i.error}</span></div>)}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Agent() {
  const [prefs, setPrefs] = usePrefs()
  const [test, setTest] = useState({ busy: false, out: null, err: null })
  const servers = prefs.mcpServers
  const upd = (i, patch) => setPrefs({ mcpServers: servers.map((s, j) => j === i ? { ...s, ...patch } : s) })
  const runTest = async s => {
    setTest({ busy: true, out: null, err: null })
    try { setTest({ busy: false, err: null, out: await postJson('/api/agent', { messages: [{ role: 'user', content: 'Liste brièvement les outils que ce serveur MCP te donne.' }], mcpServers: [s] }) }) }
    catch (e) { setTest({ busy: false, out: null, err: e.message }) }
  }
  return (
    <div className="space-y-5">
      <div className="card p-4 space-y-3">
        <Switch icon={Wrench} label="Mode agent dans le chat" hint="Le modèle appelle des outils : calculatrice exacte, date et heure, conversions, statistiques de texte, nombre aléatoire." checked={prefs.agent} onChange={v => setPrefs({ agent: v, webSearch: v ? false : prefs.webSearch, codeExec: v ? false : prefs.codeExec })} />
        <div className="flex flex-wrap gap-1.5">{['calculate', 'get_datetime', 'convert_units', 'text_stats', 'random_number'].map(t => <Chip key={t}>{t}</Chip>)}</div>
      </div>
      <div className="card p-4 space-y-4">
        <div><h3 className="font-display font-semibold">Serveurs MCP distants</h3><p className="text-sm text-ink2 mt-1">Groq se connecte lui-même à ces serveurs (HTTPS) et appelle leurs outils. Quand au moins un serveur est renseigné, le mode agent utilise l'API Responses de Groq.</p></div>
        {servers.map((s, i) => (
          <div key={i} className="space-y-2 p-3 rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="input-field text-sm" value={s.label || ''} onChange={e => upd(i, { label: e.target.value })} placeholder="Nom (ex. docs)" aria-label="Nom du serveur" />
              <input className="input-field text-sm" value={s.url || ''} onChange={e => upd(i, { url: e.target.value })} placeholder="https://serveur.exemple.com/mcp" inputMode="url" aria-label="URL du serveur MCP" />
            </div>
            <input className="input-field text-sm" type="password" value={s.token || ''} onChange={e => upd(i, { token: e.target.value })} placeholder="Jeton d'accès (optionnel)" aria-label="Jeton d'accès" autoComplete="off" />
            <div className="flex gap-2"><button className="btn-ghost !py-1 text-xs" disabled={!s.url || test.busy} onClick={() => runTest(s)}>{test.busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Tester</button><button className="btn-ghost danger !py-1 text-xs" onClick={() => setPrefs({ mcpServers: servers.filter((_, j) => j !== i) })}><Trash2 size={12} /> Retirer</button></div>
          </div>
        ))}
        {servers.length < 3 && <button className="btn-ghost" onClick={() => setPrefs({ mcpServers: [...servers, { label: '', url: '', token: '' }] })}><Plus size={14} /> Ajouter un serveur</button>}
        <p className="text-xs text-ink3">Les jetons restent dans ce navigateur et ne sont envoyés qu'à Groq pour la requête en cours. N'ajoute que des serveurs de confiance.</p>
        <ErrorBanner error={test.err} onDismiss={() => setTest(t => ({ ...t, err: null }))} />
        {test.out && <div className="pre-out">{test.out.text}{test.out.steps?.length ? '\n\n' + test.out.steps.map(s => `• ${s.name}`).join('\n') : ''}</div>}
      </div>
    </div>
  )
}

function Meter({ label, remaining, limit, reset }) {
  if (remaining == null) return null
  const pct = limit ? Math.max(0, Math.min(100, (remaining / limit) * 100)) : 0
  return (
    <div className="card p-4 space-y-2.5">
      <div className="flex items-baseline justify-between gap-2"><span className="field-label !mb-0">{label}</span><span className="font-mono text-sm">{remaining.toLocaleString('fr-FR')}{limit ? ` / ${limit.toLocaleString('fr-FR')}` : ''}</span></div>
      <div className="meter"><i style={{ width: `${pct}%` }} /></div>
      {reset && <p className="text-xs text-ink3">Se réinitialise dans {reset}</p>}
    </div>
  )
}
function Quota() {
  const q = useQuota()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const measure = async () => { setBusy(true); setErr(null); try { await postJson('/api/chat', { messages: [{ role: 'user', content: 'ok' }], maxTokens: 64 }) } catch (e) { setErr(e.message) } finally { setBusy(false) } }
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink2">Limites de ton compte Groq (gratuit ou payant), lues dans les en-têtes de la dernière requête.</p>
      <ErrorBanner error={err} onDismiss={() => setErr(null)} />
      {q ? <div className="grid gap-3 sm:grid-cols-2"><Meter label="Requêtes restantes (jour)" remaining={q.reqRemaining} limit={q.reqLimit} reset={q.reqReset} /><Meter label="Tokens restants (minute)" remaining={q.tokRemaining} limit={q.tokLimit} reset={q.tokReset} /></div>
        : <div className="card p-4 text-sm text-ink2">Aucune mesure pour l'instant. Envoie un message dans le chat ou mesure maintenant.</div>}
      <button className="btn-primary" onClick={measure} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Gauge size={15} />} Mesurer maintenant</button>
    </div>
  )
}

export default function StudioMode() {
  const [tab, setTab] = useState('models')
  return (
    <div className="page">
      <div className="page-inner space-y-5">
        <div><h2 className="page-title">Studio Groq</h2><p className="page-sub">Modèles disponibles, lots, agent avec outils et MCP, quotas en direct.</p></div>
        <Seg items={TABS} value={tab} onChange={setTab} label="Sections du Studio" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}>
            {tab === 'models' ? <Models /> : tab === 'batch' ? <Batch /> : tab === 'mcp' ? <Agent /> : <Quota />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

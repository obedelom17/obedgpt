import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Globe, Terminal, Wrench, Braces, Volume2, Brain, X } from 'lucide-react'
import { usePrefs } from '../../lib/prefs'
import { fetchModels } from '../../lib/api'
import { Seg, Switch, Field } from '../ui/controls'

const EFFORTS = [{ id: 'off', label: 'Auto' }, { id: 'low', label: 'Faible' }, { id: 'medium', label: 'Moyen' }, { id: 'high', label: 'Élevé' }]

// Panneau de réglages de génération : modèle, raisonnement, recherche web,
// exécution de code, agent (outils + MCP), mode JSON, lecture automatique.
// Sur mobile le panneau est une feuille plein bas : on le sort du composer
// (dont le flou crée un contexte qui piégerait position: fixed).
const useMobile = () => {
  const q = '(max-width: 767px)'
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => { const mq = window.matchMedia(q); const f = () => setM(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f) }, [])
  return m
}

export default function GenerationPanel({ onClose }) {
  const mobile = useMobile()
  const [p, set] = usePrefs()
  const [models, setModels] = useState([])
  useEffect(() => { fetchModels().then(d => setModels(d.models.filter(m => m.kind === 'chat'))).catch(() => {}) }, [])
  const tools = p.webSearch || p.codeExec
  const gptOss = /gpt-oss|qwen3/i.test(p.model === 'auto' ? 'gpt-oss' : p.model)

  const content = (
    <>
      <div className="gen-scrim" onClick={onClose} />
      <motion.div className="gen-panel" role="dialog" aria-label="Réglages de génération" initial={{ opacity: 0, y: 10, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: .18 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-[1.05rem] font-semibold">Réglages Groq</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>
        <div className="gen-body space-y-4">
          <Field label="Modèle" hint={tools ? 'Recherche web ou code actifs : le modèle Compound est utilisé.' : p.model === 'auto' ? 'Auto : modèle par défaut du serveur.' : undefined}>
            <select className="input-field text-sm" value={p.model} disabled={tools} onChange={e => set({ model: e.target.value })} aria-label="Modèle">
              <option value="auto">Auto (recommandé)</option>
              {models.map(m => <option key={m.id} value={m.id}>{m.id}{m.vision ? ' · vision' : ''}{m.reasoning ? ' · raisonnement' : ''}</option>)}
            </select>
          </Field>
          <Switch icon={Globe} label="Recherche web" hint="Compound cherche et lit des pages en direct, avec sources." checked={p.webSearch} onChange={v => set({ webSearch: v, agent: v ? false : p.agent })} />
          <Switch icon={Terminal} label="Exécuter du code" hint="Python exécuté côté Groq pour calculer et vérifier." checked={p.codeExec} onChange={v => set({ codeExec: v, agent: v ? false : p.agent })} />
          <Switch icon={Wrench} label="Agent : outils et MCP" hint="Calculatrice, dates, conversions, serveurs MCP (Studio)." checked={p.agent} onChange={v => set({ agent: v, webSearch: v ? false : p.webSearch, codeExec: v ? false : p.codeExec })} />
          <Switch icon={Braces} label="Réponse en JSON" hint="Force un objet JSON valide." checked={p.jsonMode} onChange={v => set({ jsonMode: v })} />
          <Switch icon={Volume2} label="Lire les réponses" hint="Voix Groq Orpheus (anglais) ou voix du navigateur." checked={p.autoSpeak} onChange={v => set({ autoSpeak: v })} />
          <Field label="Effort de raisonnement" hint={gptOss && !tools ? 'Affiche la réflexion du modèle (gpt-oss, qwen3).' : 'Disponible avec gpt-oss et qwen3 hors recherche web.'}>
            <Seg items={EFFORTS} value={p.reasoning} onChange={v => set({ reasoning: v })} label="Effort de raisonnement" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Créativité : ${p.temperature.toFixed(1)}`}>
              <input type="range" className="range" min="0" max="1.5" step="0.1" value={p.temperature} onChange={e => set({ temperature: parseFloat(e.target.value) })} aria-label="Température" />
            </Field>
            <Field label={`Longueur max : ${p.maxTokens}`}>
              <input type="range" className="range" min="256" max="8192" step="256" value={p.maxTokens} onChange={e => set({ maxTokens: parseInt(e.target.value) })} aria-label="Longueur maximale" />
            </Field>
          </div>
        </div>
      </motion.div>
    </>
  )
  return mobile ? createPortal(content, document.body) : content
}

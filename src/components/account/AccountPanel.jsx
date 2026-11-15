import { useState } from 'react'
import { Cloud, LogOut, Loader2 } from 'lucide-react'
import { useAccount, authenticate, logout } from '../../lib/account'
import { useApp } from '../../App'

const LABEL = { off: '', syncing: 'Synchronisation…', ok: 'Synchronisé', error: 'Erreur de synchronisation' }

export default function AccountPanel() {
  const { user } = useAccount()
  const { syncStatus } = useApp()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await authenticate(mode, email, password); setPassword('') }
    catch (x) { setErr(x.message) } finally { setBusy(false) }
  }

  if (user) return (
    <div>
      <p className="text-sm mb-1"><Cloud size={14} className="inline mr-1.5 text-accent" />{user.email}</p>
      <p className="text-xs text-ink3 mb-3">{LABEL[syncStatus]}</p>
      <button onClick={logout} className="btn-ghost"><LogOut size={14} /> Se déconnecter</button>
    </div>
  )
  return (
    <form onSubmit={submit} className="space-y-2.5 max-w-sm">
      <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Adresse e-mail" aria-label="Adresse e-mail" className="input-field w-full" />
      <input type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe (8 caractères minimum)" aria-label="Mot de passe" className="input-field w-full" />
      {err && <p className="text-xs text-danger" role="alert">{err}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={14} className="animate-spin" /> : mode === 'login' ? 'Se connecter' : 'Créer le compte'}</button>
        <button type="button" onClick={() => { setMode(m => (m === 'login' ? 'register' : 'login')); setErr('') }} className="text-xs text-ink2 hover:text-ink underline">{mode === 'login' ? 'Créer un compte' : 'J\'ai déjà un compte'}</button>
      </div>
    </form>
  )
}

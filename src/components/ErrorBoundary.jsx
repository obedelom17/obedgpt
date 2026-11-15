import { Component } from 'react'
import { report } from '../lib/monitor'

export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { report(error, { componentStack: info?.componentStack?.slice(0, 800) }) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center', background: '#0f1a15', color: '#e8efe9', fontFamily: 'system-ui,sans-serif' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', marginBottom: '.5rem' }}>Une erreur est survenue</h1>
          <p style={{ opacity: .7, marginBottom: '1rem' }}>L'erreur a été enregistrée. Recharge la page pour continuer.</p>
          <button onClick={() => location.reload()} style={{ padding: '.6rem 1.2rem', borderRadius: 10, border: 0, background: '#e8a317', color: '#1a3c2e', fontWeight: 600, cursor: 'pointer' }}>Recharger</button>
        </div>
      </div>
    )
  }
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initMonitor } from './lib/monitor'
import './lib/install'
import './index.css'
import 'katex/dist/katex.min.css'

initMonitor()
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>,
)

// Service worker : app shell disponible même hors-ligne après une première
// visite. Échec silencieux si non supporté (ex: navigation privée Safari).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

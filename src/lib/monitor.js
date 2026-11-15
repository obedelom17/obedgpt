// Suivi d'erreurs facultatif (Sentry) sans SDK : active seulement si VITE_SENTRY_DSN est défini au build.
// Envoie un évènement minimal via l'API « envelope » de Sentry.
const DSN = import.meta.env?.VITE_SENTRY_DSN
let seen = 0

export function parseDsn(dsn) {
  const m = /^https?:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(dsn || '')
  return m ? { key: m[1], host: m[2], project: m[3], proto: dsn.startsWith('https') ? 'https' : 'http' } : null
}

export function report(err, extra = {}) {
  const d = parseDsn(DSN)
  if (!d || seen++ > 20) return
  const e = err instanceof Error ? err : new Error(String(err))
  const id = crypto.randomUUID().replace(/-/g, '')
  const event = { event_id: id, timestamp: Date.now() / 1000, platform: 'javascript', level: 'error', release: 'obedgpt@3', environment: location.hostname,
    exception: { values: [{ type: e.name, value: e.message, stacktrace: { frames: String(e.stack || '').split('\n').slice(1, 12).map(l => ({ filename: l.trim() })) } }] },
    request: { url: location.origin + location.pathname }, extra }
  const body = [JSON.stringify({ event_id: id, sent_at: new Date().toISOString() }), JSON.stringify({ type: 'event' }), JSON.stringify(event)].join('\n')
  fetch(`${d.proto}://${d.host}/api/${d.project}/envelope/?sentry_key=${d.key}&sentry_version=7`, { method: 'POST', body, keepalive: true, mode: 'no-cors' }).catch(() => {})
}

export function initMonitor() {
  if (!parseDsn(DSN)) return
  window.addEventListener('error', ev => report(ev.error || ev.message))
  window.addEventListener('unhandledrejection', ev => report(ev.reason))
}

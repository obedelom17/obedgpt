import { useSyncExternalStore } from 'react'

// Installation PWA. Le navigateur émet « beforeinstallprompt » une seule fois, parfois avant le rendu React :
// on l'écoute dès le démarrage (import dans main.jsx) et on le garde pour l'afficher au bon moment.
const DISMISS_KEY = 'obedgpt-install-dismissed'
const DISMISS_DAYS = 14
const subs = new Set()
let deferred = null
let installed = false

const isStandalone = () => matchMedia('(display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: minimal-ui)').matches || navigator.standalone === true
const ua = navigator.userAgent || ''
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isSafariIOS = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)

let snapshot = compute()
function compute() {
  const standalone = isStandalone() || installed
  return {
    standalone,
    canPrompt: !!deferred && !standalone,       // Chrome, Edge, Android, desktop : installation en un clic
    iosHelp: isSafariIOS && !standalone,        // Safari iPhone/iPad : pas d'invite native, il faut guider
    iosOtherBrowser: isIOS && !isSafariIOS && !standalone,
  }
}
const emit = () => { snapshot = compute(); subs.forEach(f => f()) }

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; emit() })
window.addEventListener('appinstalled', () => { installed = true; deferred = null; emit() })
matchMedia('(display-mode: standalone)').addEventListener?.('change', emit)

export const useInstall = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => snapshot)

export async function promptInstall() {
  if (!deferred) return 'unavailable'
  const e = deferred
  deferred = null
  emit()
  e.prompt()
  const { outcome } = await e.userChoice
  if (outcome === 'dismissed') dismissInstall()
  return outcome
}

export function dismissInstall() { try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {} }
export function recentlyDismissed() {
  try { const t = Number(localStorage.getItem(DISMISS_KEY)); return !!t && Date.now() - t < DISMISS_DAYS * 864e5 } catch { return false }
}

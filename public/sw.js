// Service worker minimaliste : ne met en cache QUE l'app (HTML/JS/CSS/icônes),
// jamais les appels /api/* (les réponses de l'IA ne doivent jamais être
// servies depuis un cache périmé). Stratégie volontairement simple :
//  - navigation (HTML) : réseau d'abord, repli sur le cache si hors-ligne
//  - fichiers statiques (JS/CSS/images, hashés par Vite donc immuables) :
//    cache d'abord, mis à jour silencieusement en arrière-plan

const CACHE_NAME = 'obedgpt-shell-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          caches.open(CACHE_NAME).then(c => c.put(request, res.clone()))
          return res
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
    )
    return
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // Cache d'abord pour la rapidité, mais on rafraîchit en silence
        // pour la prochaine visite (stale-while-revalidate).
        fetch(request).then(res => {
          if (res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()))
        }).catch(() => {})
        return cached
      }
      return fetch(request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()))
        return res
      })
    })
  )
})

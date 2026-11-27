const CACHE_NAME = 'depot-client-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url)

  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  )
})
// Admin push (VAPID): order reminders, dépôt requests… Tap → opens the page it is about.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'BebeDepot', body: event.data ? event.data.text() : '' }
  }
  const url = data.linkPath || '/'
  event.waitUntil(
    self.registration.showNotification(data.title || 'BebeDepot', {
      body: data.body || '',
      icon: '/app-icon-192.png',
      badge: '/app-icon-192.png',
      tag: data.entityId || undefined,
      renotify: true,
      requireInteraction: true,
      vibrate: [120, 60, 120],
      data: { url },
      actions: [{ action: 'open', title: 'Voir' }],
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && 'focus' in w) {
          w.navigate(url)
          return w.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})

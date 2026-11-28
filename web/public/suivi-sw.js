/* Bébé Dépôt — déposant tracking app (scope /suivi/): "article vendu" push notifications. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Bébé Dépôt", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Bébé Dépôt";
  // App already open (even in the background): tell it to refresh now, it shows the sale at once.
  const tellPages = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((list) => list.forEach((c) => c.postMessage({ type: "bd-suivi-update" })));
  event.waitUntil(Promise.all([tellPages, self.registration.showNotification(title, {
      body: data.body || "Du nouveau sur vos articles.",
      icon: "/suivi-icon-192.png",
      badge: "/suivi-icon-192.png",
      tag: "bebedepot-vendu",
      renotify: true,
      vibrate: [80, 40, 80],
      data: { url: data.url || "/" },
    })]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && "focus" in c) {
          c.postMessage({ type: "bd-suivi-update" });
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

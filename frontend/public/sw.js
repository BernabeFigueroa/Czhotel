const CACHE_NAME = 'motel-audit-shell-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // APIs siempre directas de red
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Navegación (HTML): Red primero para que nunca quede pantalla blanca tras un deploy
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // Assets estáticos
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

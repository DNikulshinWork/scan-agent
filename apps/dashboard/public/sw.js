// Service Worker for ScanAgent PWA with Push Notifications & Offline Cache
const CACHE_NAME = 'scanagent-v3';
const basePath = self.location.pathname.replace(/\/sw\.js$/, '') || '';

const ASSETS_TO_CACHE = [
  basePath + '/',
  basePath + '/manifest.json',
  basePath + '/pwa-192x192.png',
  basePath + '/pwa-512x512.png',
  basePath + '/pwa-maskable-512x512.png',
  basePath + '/apple-touch-icon.png',
  basePath + '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Pre-cache error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.hostname.includes('hh.ru') || url.hostname.includes('onrender.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match(basePath + '/') || caches.match('./');
        }
      });
    })
  );
});

// Push Notifications Event Handling
self.addEventListener('push', (event) => {
  let data = {
    title: 'ScanAgent HH: Новая вакансия!',
    body: 'Найдена вакансия с высоким скорингом соответствия вашему стеку.',
    icon: basePath + '/pwa-192x192.png',
    badge: basePath + '/pwa-192x192.png',
    data: { url: basePath + '/' }
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = { ...data, ...json };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || (basePath + '/pwa-192x192.png'),
    badge: data.badge || (basePath + '/pwa-192x192.png'),
    vibrate: [100, 50, 100],
    data: data.data || { url: basePath + '/' },
    actions: [
      { action: 'open', title: '👀 Посмотреть' },
      { action: 'close', title: 'Закрыть' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || (basePath + '/');
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});


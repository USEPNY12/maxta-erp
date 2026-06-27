// Cache-busting service worker - clears all old caches
const CACHE_VERSION = 'v-nocache';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Don't cache anything - pass through to network
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

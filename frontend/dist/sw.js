// Service worker disabled - this file unregisters itself
// ERP does not need offline caching
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.registration.unregister();
    })
  );
});
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});

// MaxTA ERP Service Worker - Phase 9
const CACHE_NAME = 'maxta-erp-v9';
const STATIC_CACHE = 'maxta-static-v9';
const API_CACHE = 'maxta-api-v9';

// App shell files to cache immediately
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: Cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== API_CACHE && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API requests: Network-first with short cache for dashboard/read endpoints
  if (url.pathname.startsWith('/api/')) {
    // Only cache GET API requests for dashboard/read data
    const cacheable = ['/api/health', '/api/dashboard-exec/widgets', '/api/dashboard-exec/promotions'];
    if (cacheable.some(p => url.pathname.startsWith(p))) {
      event.respondWith(networkFirstWithCache(request, API_CACHE, 60000)); // 1 min cache
    }
    return; // Let other API calls go through network normally
  }

  // Static assets (JS, CSS, images): Cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages: Network-first, fallback to cached index.html (SPA)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }
});

// Cache-first strategy (for static assets)
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

// Network-first with cache fallback (for API data)
async function networkFirstWithCache(request, cacheName, maxAge) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Network-first with SPA fallback (for HTML)
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback to cached index.html for SPA routing
    const indexCached = await caches.match('/index.html');
    if (indexCached) return indexCached;
    return new Response('<h1>Offline</h1><p>MaxTA ERP is not available offline. Please check your connection.</p>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'MaxTA ERP', body: 'New notification', icon: '/icons/icon-192.png' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  const options = {
    body: data.body || data.message,
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: data.tag || 'maxta-notification',
    data: { url: data.url || '/', reference_type: data.reference_type, reference_id: data.reference_id },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.priority === 'high' || data.priority === 'urgent'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Background sync for offline scan queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-scans') {
    event.waitUntil(syncOfflineScans());
  }
});

async function syncOfflineScans() {
  // This will be triggered when connection returns
  // The actual sync logic is in the frontend IndexedDB handler
  const allClients = await clients.matchAll();
  for (const client of allClients) {
    client.postMessage({ type: 'SYNC_OFFLINE_SCANS' });
  }
}

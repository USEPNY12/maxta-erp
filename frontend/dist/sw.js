// MaxTA ERP Service Worker v10 - Fixed caching strategy for heavy codebase
// CRITICAL: Uses network-first for JS/CSS to prevent blue screen bug
// where old cached index.js references chunk filenames that no longer exist after rebuild
const CACHE_VERSION = 'v10';
const STATIC_CACHE = `maxta-static-${CACHE_VERSION}`;
const API_CACHE = `maxta-api-${CACHE_VERSION}`;

// Only cache the absolute minimum app shell
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: Cache app shell and immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Delete ALL old caches to prevent stale chunk references
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
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

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // API requests: Let browser handle normally - no SW interception
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // JS and CSS assets: Network-first with cache fallback
  // This prevents the blue screen bug where stale cached bundles reference non-existent chunks
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(networkFirstAsset(request));
    return;
  }

  // Images and fonts: Cache-first (safe because they don't reference other files)
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/)) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  // HTML pages: Network-first, fallback to cached index.html (SPA)
  if (request.headers.get('accept')?.includes('text/html') || url.pathname === '/') {
    event.respondWith(networkFirstHTML(request));
    return;
  }
});

// Network-first for JS/CSS assets - prevents stale chunk bug
async function networkFirstAsset(request) {
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
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

// Cache-first for images/fonts (safe - they don't reference other files)
async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

// Network-first for HTML with SPA fallback
async function networkFirstHTML(request) {
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
  const allClients = await clients.matchAll();
  for (const client of allClients) {
    client.postMessage({ type: 'SYNC_OFFLINE_SCANS' });
  }
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHES') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});

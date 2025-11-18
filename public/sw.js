const CACHE_NAME = 'balajibook-v5';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/balaji-logo.jpg',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  // Take control as soon as the new service worker is installed
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
            return undefined;
          })
        )
      ),
      // Start controlling open clients immediately
      self.clients && self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Always try network first for navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() =>
          caches.match(request).then((cachedResponse) =>
            cachedResponse || caches.match('/')
          )
        )
    );
    return;
  }

  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(request).then((response) => response || fetch(request))
  );
});

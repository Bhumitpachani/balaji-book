const CACHE_NAME = 'balajibook';
const urlsToCache = [
  '/',
  '/manifest.json',
  'https://5.imimg.com/data5/YD/VE/MY-27589869/balaji-engineering-works-90x90.jpg',
  'https://5.imimg.com/data5/YD/VE/MY-27589869/balaji-engineering-works-90x90.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Handle background sync, push notifications, etc.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

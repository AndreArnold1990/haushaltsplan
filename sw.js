// Service Worker – Haushaltsplan
// Cache-Version: v24
const CACHE = 'haushaltsplan-v38';

const PRECACHE = [
  './index.html',
  './style.css',
  './manifest.json',
  './favicon.svg',
  './icon.svg',
  './js/app.js',
  './js/config.js',
  './js/store.js',
  './js/utils.js',
  './js/firebase.js',
  './js/recurring.js',
  './js/ui.js',
  './js/dashboard.js',
  './js/transactions.js',
  './js/categories.js',
  './js/i18n.js',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Nur eigene Ressourcen cachen – alle externen Domains durchleiten
  if (!url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      });
      return cached || network;
    })
  );
});

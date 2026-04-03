const CACHE_NAME = 'meatende-admin-pwa-v1';

self.addEventListener('install', (event) => {
  console.log('✅ [PWA] Service Worker Instalado.');
  self.skipWaiting(); // Forces the waiting service worker to become the active service worker.
});

self.addEventListener('activate', (event) => {
  console.log('✅ [PWA] Service Worker Ativado.');
  event.waitUntil(clients.claim());
});

// Minimal fetch interceptor: Bypass cache, go straight to network.
// This prevents stale data issues on the Admin Dashboard.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

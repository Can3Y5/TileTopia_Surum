/**
 * Polytopia Android PWA Service Worker (GitHub Auto-Update Engine)
 * GitHub Pages üzerinden anında yüklenir ve her kod güncellemesinde otomatik yenilenir.
 */

const CACHE_VERSION = 'v1.0.2';
const CACHE_NAME = `polytopia-${CACHE_VERSION}`;

// Önbelleğe alınacak çekirdek dosyalar (GitHub Pages alt dizinleriyle uyumlu göreli yollar)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/game.css',
  './js/game-core.js',
  './js/game-ai.js',
  './js/game-view3d.js',
  './js/game-audio.js',
  './js/game-ui.js',
  './libs/three.min.js',
  './libs/OrbitControls.js',
  './libs/tween.umd.js'
];

self.addEventListener('install', (event) => {
  // Yeni sürüm geldiğinde beklemeden hızlıca yükle
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Eski sürüm önbelleklerini temizle
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stale-While-Revalidate & Network-First Yaklaşımı:
// Çevrimdışıyken cache'ten anında açılır, internet varken arka planda GitHub'dan güncellemeyi kontrol eder.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Geçerli bir cevap geldiyse önbelleği güncelle
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // İnternet yoksa sessizce geç
      });

      // Önbellekte varsa hemen göster (hızlı açılış), yoksa ağdan bekle
      return cachedResponse || fetchPromise;
    })
  );
});

// Uygulama içinden "Şimdi Güncelle" mesajı geldiğinde
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

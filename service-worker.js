
/* =====================================================
   GOKUL HUB FUTURISTIC OS
   Offline App Shell + CDN Runtime Cache
   ===================================================== */

const CACHE_VERSION = 'gokul-hub-offline-v7';
const APP_CACHE = `${CACHE_VERSION}-app`;
const CDN_CACHE = `${CACHE_VERSION}-cdn`;

// Required app files
const APP_FILES = [
  './',
  './index.html',
  './style.css',
  './auth.css',
  './upgrades.css',
  './os.css',

  './holidays.js',
  './auth.js',
  './os.js',
  './app.js',
  './enhancements.js',
  './upgrades.js',

  './manifest.json'
];

// Optional image files
const OPTIONAL_FILES = [
  './app-icon-512.png',
  './icon.png',
  './10276.png'
];

// CDN files
const CDN_FILES = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',

  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',

  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',

  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',

  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',


  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js',

  'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Comfortaa:wght@400;700&family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;600;700&family=Josefin+Sans:wght@400;700&family=Lato:wght@400;700&family=Lora:ital,wght@0,500;0,700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;600;700&family=Nunito:wght@400;700&family=Open+Sans:wght@400;600&family=Oswald:wght@500;700&family=Outfit:wght@400;600;800&family=Pacifico&family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;0,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;600;800&family=Quicksand:wght@500;700&family=Righteous&family=Roboto:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap'
];

/* INSTALL */

self.addEventListener('install', event => {
  event.waitUntil((async () => {

    const appCache = await caches.open(APP_CACHE);

    await appCache.addAll(APP_FILES);

    // Optional files should not break installation
    await Promise.all(
      OPTIONAL_FILES.map(async file => {
        try {
          const response = await fetch(file, {
            cache: 'reload'
          });

          if (response.ok) {
            await appCache.put(file, response);
          }
        } catch (_) {}
      })
    );

    // Cache CDN resources
    const cdnCache = await caches.open(CDN_CACHE);

    await Promise.all(
      CDN_FILES.map(async url => {
        try {
          const request = new Request(url, {
            mode: 'no-cors'
          });

          const response = await fetch(request);

          if (
            response &&
            (response.ok || response.type === 'opaque')
          ) {
            await cdnCache.put(request, response);
          }
        } catch (_) {
          // CDN can retry during runtime
        }
      })
    );

    // Updated workers wait for the user to approve an in-app update.

  })());
});

/* ACTIVATE */

self.addEventListener('activate', event => {
  event.waitUntil((async () => {

    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith('gokul-hub-offline-') &&
          !key.startsWith(CACHE_VERSION)
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();

  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* FETCH */

self.addEventListener('fetch', event => {

  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Same-origin app files
  if (url.origin === self.location.origin) {

    // Navigation requests
    if (request.mode === 'navigate') {

      event.respondWith((async () => {

        try {
          const fresh = await fetch(request);

          const cache = await caches.open(APP_CACHE);

          cache.put('./index.html', fresh.clone());

          return fresh;

        } catch (_) {

          return (
            await caches.match('./index.html')
          ) || Response.error();

        }

      })());

      return;
    }

    // Static resources
    event.respondWith((async () => {

      const cached = await caches.match(request);

      if (cached) return cached;

      try {

        const fresh = await fetch(request);

        if (fresh.ok) {
          const cache = await caches.open(APP_CACHE);

          cache.put(request, fresh.clone());
        }

        return fresh;

      } catch (_) {

        return cached || Response.error();

      }

    })());

    return;
  }

  // External CDN resources
  if (
    [
      'cdnjs.cloudflare.com',
      'www.gstatic.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com'
    ].includes(url.hostname)
  ) {

    event.respondWith((async () => {

      const cache = await caches.open(CDN_CACHE);

      const cached = await cache.match(request, {
        ignoreVary: true
      });

      if (cached) return cached;

      try {

        const fresh = await fetch(request);

        if (
          fresh &&
          (fresh.ok || fresh.type === 'opaque')
        ) {
          cache.put(request, fresh.clone());
        }

        return fresh;

      } catch (_) {

        return cached || Response.error();

      }

    })());

  }

});

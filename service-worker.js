/* Gokul Hub offline app shell + CDN runtime cache. */
const CACHE_VERSION = 'gokul-hub-offline-v3';
const APP_CACHE = `${CACHE_VERSION}-app`;
const CDN_CACHE = `${CACHE_VERSION}-cdn`;
const APP_FILES = [
  './', './index.html', './style.css', './auth.css', './app.js', './auth.js',
  './enhancements.js', './10276.png', './app-icon-512.png', './manifest.json'
];
const CDN_FILES = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Comfortaa:wght@400;700&family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;600;700&family=Josefin+Sans:wght@400;700&family=Lato:wght@400;700&family=Lora:ital,wght@0,500;0,700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;600;700&family=Nunito:wght@400;700&family=Open+Sans:wght@400;600&family=Oswald:wght@500;700&family=Outfit:wght@400;600;800&family=Pacifico&family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;0,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;600;800&family=Quicksand:wght@500;700&family=Righteous&family=Roboto:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const appCache = await caches.open(APP_CACHE);
    await appCache.addAll(APP_FILES);
    const cdnCache = await caches.open(CDN_CACHE);
    await Promise.all(CDN_FILES.map(async url => {
      try {
        const request = new Request(url, { mode: 'no-cors' });
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) await cdnCache.put(request, response);
      } catch (_) { /* CDN may be unavailable during first install; runtime caching retries. */ }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('gokul-hub-offline-') && !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      event.respondWith((async () => {
        try { const fresh = await fetch(req); const c = await caches.open(APP_CACHE); c.put('./index.html', fresh.clone()); return fresh; }
        catch (_) { return (await caches.match('./index.html')) || Response.error(); }
      })());
      return;
    }
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try { const fresh = await fetch(req); if (fresh.ok) (await caches.open(APP_CACHE)).put(req, fresh.clone()); return fresh; }
      catch (_) { return cached || Response.error(); }
    })());
    return;
  }
  if (['cdnjs.cloudflare.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CDN_CACHE);
      const cached = await cache.match(req, { ignoreVary: true });
      if (cached) return cached;
      try { const fresh = await fetch(req); if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(req, fresh.clone()); return fresh; }
      catch (_) { return cached || Response.error(); }
    })());
  }
});

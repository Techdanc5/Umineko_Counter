const CACHE = 'umineko-counter-v1';
const ASSETS = [
  '/Umineko_Counter/',
  '/Umineko_Counter/index.html',
  '/Umineko_Counter/style.css',
  '/Umineko_Counter/app.js',
  '/Umineko_Counter/manifest.json',
  '/Umineko_Counter/icons/icon-192.png',
  '/Umineko_Counter/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // AdSense等の外部リクエストはネットワーク優先
  if (!e.request.url.startsWith(self.location.origin)) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 408 })));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || fresh;
    })
  );
});

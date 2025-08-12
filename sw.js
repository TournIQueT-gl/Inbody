
const CACHE='inbody-ultra-cache-v56';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => {
  const req = e.request;
  e.respondWith((async () => {
    try {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(res => { if(res && res.status===200 && req.method==='GET') cache.put(req, res.clone()); return res; }).catch(_ => cached);
      return cached || fetchPromise;
    } catch(_) {
      return fetch(req).catch(_ => caches.match('./index.html'));
    }
  })());
});

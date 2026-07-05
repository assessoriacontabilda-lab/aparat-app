/* APARAT service worker - network-first (sempre pega a versao nova) */
var CACHE = 'aparat-v3';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async function () {
    try {
      var net = await fetch(req, { cache: 'no-store' });
      try {
        var c = await caches.open(CACHE);
        c.put(req, net.clone());
      } catch (err) {}
      return net;
    } catch (err) {
      var cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});

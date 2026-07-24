/* APARAT service worker v17 - network-first + auto-atualizar clientes */
var CACHE = 'aparat-v27';

self.addEventListener('install', function (e) { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try { var keys = await caches.keys(); await Promise.all(keys.map(function (k) { return caches.delete(k); })); } catch (err) {}
    try { await self.clients.claim(); } catch (err) {}
    try {
      var cls = await self.clients.matchAll({ type: 'window' });
      for (var i = 0; i < cls.length; i++) { try { cls[i].navigate(cls[i].url); } catch (e2) {} }
    } catch (err) {}
  })());
});

self.addEventListener('message', function (e) { if (e.data === 'skipWaiting' || (e.data && e.data.type === 'skipWaiting')) self.skipWaiting(); });

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async function () {
    try {
      var net = await fetch(req, { cache: 'no-store' });
      try { if (net && net.status === 200 && req.url.indexOf('http') === 0) { var c = await caches.open(CACHE); c.put(req, net.clone()); } } catch (err) {}
      return net;
    } catch (err) {
      var cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});

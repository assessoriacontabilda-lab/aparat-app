const CACHE = 'aparat-v1';
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ self.clients.claim(); });
self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(r){
      try { var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, cp); }); } catch(_){}
      return r;
    }).catch(function(){ return caches.match(e.request); })
  );
});

self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('fetch', function(e){ if(e.request.method!=='GET')return; e.respondWith(fetch(e.request)); });

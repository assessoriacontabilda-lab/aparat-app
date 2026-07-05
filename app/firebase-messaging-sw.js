importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyB5uHbMeK9OWUVYaaLv7oQr7NeHZDsVsMQ",
  authDomain: "aparat-contabilidade.firebaseapp.com",
  projectId: "aparat-contabilidade",
  storageBucket: "aparat-contabilidade.firebasestorage.app",
  messagingSenderId: "657898871170",
  appId: "1:657898871170:web:26cbb9c9eaf2929bddd79b"
});
var messaging = firebase.messaging();
messaging.onBackgroundMessage(function(payload){
  var n = payload.notification || {};
  var t = n.title || 'Aparat Contabilidade';
  var b = n.body || 'Você tem uma novidade no app.';
  self.registration.showNotification(t, { body:b, icon:'icone-aparat.png', badge:'icone-aparat.png', tag:'aparat' });
  try{ if(self.navigator && self.navigator.setAppBadge) self.navigator.setAppBadge(1); }catch(e){}
});
self.addEventListener('notificationclick', function(e){ e.notification.close(); try{ if(self.navigator && self.navigator.clearAppBadge) self.navigator.clearAppBadge(); }catch(err){} e.waitUntil(clients.matchAll({type:'window'}).then(function(cl){ for(var i=0;i<cl.length;i++){ if('focus' in cl[i]) return cl[i].focus(); } if(clients.openWindow) return clients.openWindow('./'); })); });
self.addEventListener('message', function(e){ if(e.data==='limpar-bolinha'){ try{ if(self.navigator && self.navigator.clearAppBadge) self.navigator.clearAppBadge(); }catch(err){} } });

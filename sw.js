// Service worker minimo para o Air Hockey.
// Habilita o Chrome/Android a instalar isso como app de verdade (WebAPK)
// e permite jogar offline depois da primeira visita.

var CACHE_NAME = 'air-hockey-v13';
var CORE_ASSETS = [
  './',
  './index.html',
  './game.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS);
    }).catch(function(){})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached) return cached;
      return fetch(event.request).catch(function(){ return cached; });
    })
  );
});

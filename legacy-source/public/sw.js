// Only the generic offline page is cached. Never cache songs, customer data,
// admin pages, access links, purchases, or API responses.
const CACHE='mq3-offline-v1';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/offline.html')));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mq3-offline-')&&key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||event.request.mode!=='navigate'||url.pathname.startsWith('/api/'))return;
  event.respondWith(fetch(event.request).catch(async()=>
    (await caches.match('/offline.html'))||new Response('MQ3 needs an internet connection.',{headers:{'Content-Type':'text/plain'}})
  ));
});

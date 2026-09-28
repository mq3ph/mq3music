// Retire the previous creator service worker on an existing installation.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.registration.unregister();const windows=await self.clients.matchAll({type:'window'});for(const client of windows)client.navigate(client.url);})()));

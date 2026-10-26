// Blastforge moved to Sarge & Deputy Games. This replaces the old offline worker: it clears the saved
// copy, removes itself, and reloads open pages so they show the "moved" page.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 for(const k of await caches.keys())if(k.startsWith('blastforge-'))await caches.delete(k);
 await self.registration.unregister();
 for(const c of await self.clients.matchAll({type:'window'}))c.navigate(c.url);
})()));

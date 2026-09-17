const CACHE='guildbattle-v4';
const ASSETS=['./','./index.html','./style.css','./app.js','./phase3.js','./phase4.js','./phase4_1.js','./phase4_2_character_master.js','./phase4_3.js','./phase4_4.js','./phase4_5.js','./phase4_6.js','./phase4_7.js','./phase4_8.js','./phase4_9.js','./manifest.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>cached)))});

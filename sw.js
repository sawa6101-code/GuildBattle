const CACHE='guildbattle-v9';
const ASSETS=['./','./index.html','./style.css','./app.js','./lazy-load.js','./manifest.json','./phase4_2_character_master.js','./enemy_guild_seed_20260918.js','./own_players_seed_20260918.js','./party_seed_kuroronkotarezo_20260918.js','./persistent_recovery_seed.js','./character_match_engine.js','./character_match_audit.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}return r}).catch(()=>cached)))});

const CACHE='guildbattle-v58';
const ASSETS=['./','./index.html','./db-init.js','./character_skill_master_20260918.js','./style.css','./app.js','./lazy-load.js','./manifest.json','./character_master_catalog_20260918.js','./help.js','./phase4_2_character_master.js','./enemy_guild_seed_20260918.js','./own_players_seed_20260918.js','./party_seed_kuroronkotarezo_20260918.js','./persistent_recovery_seed.js','./guildbattle_recovery_store.js','./legacy_data_recovery.js','./repository_history_recovery_20260930.js','./character_db_repository_recovery_20260930.js','./character_one_shot_registration_restore_20260930.js','./data/character-master.json','./data/character-images.json','./data/repository-recovery-snapshot-20260930.json','./canonical_character_master_20260930.js','./data/character-master.json','./character_match_engine.js','./character_match_audit.js','./character_sync_engine.js','./data/character-sync-latest.json','./character_skill_sync_engine.js','./data/character-skill-sync-latest.json','./character_screenshot_binder.js','./character_ocr_new_registration.js','./github_character_image_store.js','./data/character-images.json','./party_screenshot_awakening.js','./character_screenshot_batch_20260925.js','./character_screenshot_batch_20260919.js','./character_screenshot_batch_20260920.js','./character_awakening_master_20260920.js','./phase4_4.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  const isNavigation=e.request.mode==='navigate';
  const isAppCode=/\.(?:js|mjs|css)$/.test(url.pathname);
  const networkFirst=isNavigation||isAppCode;
  e.respondWith((async()=>{
    if(networkFirst){
      try{
        const r=await fetch(e.request,{cache:'no-store'});
        if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}
        return r;
      }catch(err){
        const cached=await caches.match(e.request);
        return cached||Response.error();
      }
    }
    const cached=await caches.match(e.request);
    if(cached)return cached;
    try{
      const r=await fetch(e.request);
      if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}
      return r;
    }catch(err){return cached||Response.error();}
  })());
});

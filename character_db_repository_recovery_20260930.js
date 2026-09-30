/* Character DB recovery + cross-browser reference status v2026-09-30
   - GitHub-hosted character-master.json is the shared source of truth.
   - Restores character metadata on every browser without touching guild/PT data.
   - Reconstructs screenshot-confirmed status from the repository master.
   - Uses data/character-images.json as the authoritative source for green image references.
   - Never invents image references when the public manifest has none.
*/
(function(){
'use strict';
const DB='paranoize-guildbattle',VER=7,MASTER='./data/character-master.json',MANIFEST='./data/character-images.json';
const now=()=>new Date().toISOString();
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s　]+/g,'').replace(/[（(]/g,'(').replace(/[）)]/g,')').toLowerCase();
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,VER);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const all=(d,n)=>new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const put=(d,n,x)=>new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res(x);r.onerror=()=>rej(r.error)});
const del=(d,n,k)=>new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).delete(k);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
async function json(url){const r=await fetch(url+'?v=20260930',{cache:'no-store'});if(!r.ok)throw new Error(url+' HTTP '+r.status);return r.json()}
async function run(){
 const master=await json(MASTER),records=Array.isArray(master.records)?master.records:[];
 if(!records.length)throw new Error('GitHub character master is empty');
 const manifest=await json(MANIFEST).catch(()=>({records:[]}));
 const rows=Array.isArray(manifest.records)?manifest.records:[];
 const d=await open(),old=await all(d,'characters'),oldImages=await all(d,'characterImages');
 const oldByName=new Map(old.map(x=>[norm(x.name),x])), canonical=new Set(records.map(x=>norm(x.name)));
 const ids=new Map(),stats={master:records.length,added:0,updated:0,removed:0,imageRefs:0,screenshotConfirmed:0};
 for(const m of records){
   const o=oldByName.get(norm(m.name));
   const c=Object.assign({},o||{},m,{
     id:o?.id||m.id,canonical_id:m.id,
     source:m.source||'github_canonical_character_master',
     verification_status:m.verification_status||'repository_recovered',
     verification_required:false,active:true,
     updated_at:now(),created_at:o?.created_at||m.created_at||now()
   });
   if(m.screenshot_confirmed===true)stats.screenshotConfirmed++;
   await put(d,'characters',c);ids.set(norm(m.name),c.id);
   o?stats.updated++:stats.added++;
 }
 // Remove only records that are not part of the repository master.
 for(const o of old)if(!canonical.has(norm(o.name))){await del(d,'characters',o.id);stats.removed++}
 // Rebuild the public-reference index locally from GitHub's manifest.
 const liveImages=await all(d,'characterImages');
 const manifestById=new Map(rows.filter(x=>x.character_id).map(x=>[String(x.character_id),x]));
 for(const row of rows){
   const cid=ids.get(norm(row.name||''));
   const targetId=cid||row.character_id;
   if(!targetId||!row.url)continue;
   try{
     const rr=await fetch(row.url,{cache:'no-store'});if(!rr.ok)continue;
     const blob=await rr.blob();
     const oldImg=liveImages.find(x=>x.character_id===targetId&&x.github_url===row.url);
     await put(d,'characterImages',Object.assign({},oldImg||{id:'img_'+crypto.randomUUID()},{
       character_id:targetId,image_type:'card',blob,verified:true,storage:'github',
       github_path:row.path,github_url:row.url,github_sha:row.sha||'',
       reference_scope:'character_variant',reference_name:row.name||'',reference_title:row.title||'',
       verification_source:'github_manifest',updated_at:now(),created_at:oldImg?.created_at||now()
     }));
     stats.imageRefs++;
   }catch(e){console.warn('character reference restore',row.character_id,e)}
 }
 // Keep historical local references that are still tied to a canonical character.
 for(const img of liveImages){
   if(!img.character_id)continue;
   if(![...ids.values()].includes(img.character_id))continue;
   if(img.verified!==false && img.features)continue;
 }
 await put(d,'settings',{key:'character_db_repository_recovery_20260930',version:1,master_version:master.version,master_count:records.length,manifest_count:rows.length,stats,restored_at:now(),source:'GitHub repository'});
 d.close();
 window.dispatchEvent(new CustomEvent('character-db-repository-recovered',{detail:stats}));
 return stats;
}
window.GuildBattleCharacterDBRecovery={run};
setTimeout(()=>run().catch(e=>console.error('[GuildBattle] character DB recovery:',e)),800);
})();
/* Canonical character master hydrator
   GitHub-hosted source of truth for character DB.
   Party/guild data are intentionally untouched.
*/
(function(){
'use strict';
const DB='paranoize-guildbattle',VER=7,URL='./data/character-master.json';
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s　]+/g,'').replace(/[（(]/g,'(').replace(/[）)]/g,')').toLowerCase();
const now=()=>new Date().toISOString();
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,VER);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const all=(d,n)=>new Promise((res,rej)=>{const q=d.transaction(n).objectStore(n).getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
const put=(d,n,x)=>new Promise((res,rej)=>{const q=d.transaction(n,'readwrite').objectStore(n).put(x);q.onsuccess=()=>res(x);q.onerror=()=>rej(q.error)});
const del=(d,n,k)=>new Promise((res,rej)=>{const q=d.transaction(n,'readwrite').objectStore(n).delete(k);q.onsuccess=()=>res();q.onerror=()=>rej(q.error)});
async function load(){const r=await fetch(URL+'?v=20260930',{cache:'no-store'});if(!r.ok)throw Error('character master HTTP '+r.status);return r.json()}
async function run(){
 const master=await load(),records=Array.isArray(master.records)?master.records:[];if(!records.length)throw Error('canonical character master is empty');
 const d=await open(),existing=await all(d,'characters'),images=await all(d,'characterImages'),byName=new Map(existing.map(c=>[norm(c.name),c])),canonical=new Set(records.map(c=>norm(c.name)));
 const ids=new Map(),stats={canonical:records.length,added:0,updated:0,removed:0,imageLinksRepaired:0};
 for(const m of records){
   const old=byName.get(norm(m.name));
   const c=Object.assign({},old||{},m,{id:old?.id||m.id,canonical_id:m.id,source:'github_canonical_character_master',verification_status:m.verification_status||'repository_recovered',verification_required:false,active:true,updated_at:now(),created_at:old?.created_at||now()});
   await put(d,'characters',c);ids.set(norm(m.name),c.id);if(old)stats.updated++;else stats.added++;
 }
 // Keep the canonical set identical across browsers. Remove old provisional/non-canonical character records.
 for(const c of existing){if(!canonical.has(norm(c.name))){await del(d,'characters',c.id);stats.removed++}}
 // Repair locally stored image references after character IDs were normalized.
 for(const img of images){
   const ref=norm(img.reference_name||'');
   if(ref&&ids.has(ref)&&img.character_id!==ids.get(ref)){img.character_id=ids.get(ref);img.updated_at=now();await put(d,'characterImages',img);stats.imageLinksRepaired++}
 }
 await put(d,'settings',{key:'canonical_character_master',version:master.version,source:'GitHub:data/character-master.json',updated_at:now(),stats,policy:'GitHub canonical character DB; party/guild data untouched.'});
 d.close();
 window.__GuildBattleCanonicalCharacterMaster=master;
 window.dispatchEvent(new CustomEvent('canonical-character-master-loaded',{detail:stats}));
 if(typeof window.renderCharacters==='function')try{window.renderCharacters()}catch{}
 console.info('[GuildBattle] canonical character master loaded',stats);
 return stats;
}
window.GuildBattleCanonicalCharacterMaster={load,run};
setTimeout(()=>run().catch(e=>console.error('[GuildBattle] canonical character master:',e)),2500);
})();
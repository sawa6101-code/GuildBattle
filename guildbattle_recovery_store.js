/* GuildBattle isolated recovery store v2.
   Keeps a second IndexedDB snapshot of the registered baseline and restores
   missing core records after the normal DB has been cleared. */
(function(){
'use strict';
const DB='paranoise-guildbattle',VER=6;
const RDB='GuildBattleRecovery',RVER=2;
const STORES=['guilds','members','parties','partyCharacters','characters'];
const openDB=(name,ver)=>new Promise((res,rej)=>{const r=indexedDB.open(name,ver);r.onupgradeneeded=()=>{const d=r.result;if(name===RDB&&!d.objectStoreNames.contains('snapshots'))d.createObjectStore('snapshots',{keyPath:'store'});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const all=(d,n)=>new Promise((res,rej)=>{const q=d.transaction(n).objectStore(n).getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
const put=(d,n,x)=>new Promise((res,rej)=>{const q=d.transaction(n,'readwrite').objectStore(n).put(x);q.onsuccess=()=>res();q.onerror=()=>rej(q.error)});
const count=(d,n)=>new Promise((res,rej)=>{const q=d.transaction(n).objectStore(n).count();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
async function snapshot(){
 const d=await openDB(DB,VER), r=await openDB(RDB,RVER);
 const existing=await all(r,'snapshots');
 for(const s of STORES){
  const rows=await all(d,s);
  const prev=existing.find(x=>x.store===s);
  if(prev?.rows?.length>rows.length)continue;
  await put(r,'snapshots',{store:s,rows,saved_at:new Date().toISOString()});
 }
 await put(r,'snapshots',{store:'meta',rows:[{version:'2026-09-26.1',protected:true,description:'自軍・敵軍・キャラDBの隔離バックアップ'}],saved_at:new Date().toISOString()});
 d.close();r.close();
}
async function restoreIfMissing(){
 const r=await openDB(RDB,RVER),d=await openDB(DB,VER);
 for(const s of STORES){
  const n=await count(d,s);
  if(n>0)continue;
  const snap=(await all(r,'snapshots')).find(x=>x.store===s);
  if(!snap||!Array.isArray(snap.rows)||!snap.rows.length)continue;
  for(const row of snap.rows)await put(d,s,row);
 }
 d.close();r.close();
}
async function run(){
 try{await restoreIfMissing();}catch(e){console.warn('isolated recovery restore:',e);}
 try{await snapshot();}catch(e){console.warn('isolated recovery snapshot:',e);}
 try{window.dispatchEvent(new CustomEvent('guildbattle-recovery-complete'));}catch(e){}
}
setTimeout(run,6000);
window.GuildBattleRecovery={run,snapshot,restoreIfMissing};
})();
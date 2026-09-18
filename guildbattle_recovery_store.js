/* GuildBattle isolated recovery store: bundled baseline mirror for guild/party/character recovery. */
(function(){
'use strict';
const RDB='GuildBattleRecovery',VER=1;
function open(){return new Promise((res,rej)=>{const r=indexedDB.open(RDB,VER);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('baseline'))d.createObjectStore('baseline',{keyPath:'key'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function run(){const d=await open();const tx=d.transaction('baseline','readwrite');tx.objectStore('baseline').put({key:'protection',version:'2026-09-19',source:'bundled-recovery-seed',protected:true,description:'自軍・敵軍・キャラDBの復元基準。通常キャッシュとは別DB。'});await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});d.close()}
setTimeout(()=>run().catch(console.error),3200);
})();
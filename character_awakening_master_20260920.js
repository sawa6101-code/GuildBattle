/* Awakening / 凸 master 2026-09-20
   Rates supplied by the user are stored as 0-4 awakening probabilities.
   These values affect probability-based passives in the battle engine.
*/
(function(){
'use strict';
const DB='paranoise-guildbattle';
const R={
 'ポイズンスキン':[10,20,40,70,100],
 '復讐スリープ(2体)':[10,20,40,70,100],
 'スタンスキン':[3,6,12,21,30],
 'オートポイズン':[10,20,40,70,100],
 '入場ポイズン(全体)':[7,14,28,49,70],
 'オートスリープ':[3,6,12,21,30],
 'ギブターンの遺志':[10,20,40,70,100],
 '入場スリープ(2体)':[10,20,40,70,100],
 'オートガード':[40,55,70,85,100],
 '入場スタン(2体)':[10,20,40,70,100]
};
const norm=s=>String(s||'').replace(/スリーブ/g,'スリープ').replace(/[（]/g,'(').replace(/[）]/g,')').replace(/\s/g,'');
function match(name,key){
 const a=norm(name),b=norm(key);
 return a===b || (key==='復讐スリープ(2体)'&&a.includes('復讐スリープ')) ||
 (key==='入場スリープ(2体)'&&a.includes('入場スリープ')) ||
 (key==='入場スタン(2体)'&&a.includes('入場スタン')) ||
 (key==='入場ポイズン(全体)'&&a.includes('入場ポイズン'));
}
function open(){return new Promise((res,rej)=>{const r=indexedDB.open(DB);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function all(d,n){return new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(d,n,x){return new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function run(){
 const d=await open(),cs=await all(d,'characters');let changed=0;
 for(const c of cs){
   let hit=false;
   for(const p of (Array.isArray(c.passives)?c.passives:[])){
     for(const [k,r] of Object.entries(R))if(match(p.name,k)){p.awakening_rates=r;p.awakening_effect='確率は覚醒回数0～4に応じて変化';p.awakening_source='user_provided_2026-09-20';hit=true}
   }
   const containers=[c.skill_data,c.battle_profile].filter(Boolean);
   for(const box of containers){
     for(const p of (Array.isArray(box.passives)?box.passives:[]))
       for(const [k,r] of Object.entries(R))if(match(p.name,k)){p.awakening_rates=r;p.awakening_source='user_provided_2026-09-20';hit=true}
     for(const s of (Array.isArray(box.skills)?box.skills:[]))
       for(const [k,r] of Object.entries(R))if(match(s.name,k)){s.awakening_rates=r;s.awakening_source='user_provided_2026-09-20';hit=true}
   }
   if(hit){c.updated_at=new Date().toISOString();await put(d,'characters',c);changed++}
 }
 await put(d,'settings',{key:'character_awakening_master_20260920',version:'1.0',rates:R,source:'user_provided',updated_at:new Date().toISOString()});
 d.close();window.dispatchEvent(new CustomEvent('paranoise-character-master-updated',{detail:{awakeningChanged:changed}}));
}
setTimeout(()=>run().catch(console.error),500);
})();
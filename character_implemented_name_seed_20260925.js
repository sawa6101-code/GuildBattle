/* Implemented character-name seed 2026-09-25
   Adds every character name implemented outside the main catalog.
   Existing character records are NEVER overwritten or modified.
*/
(function(){
'use strict';
const DB='paranoise-guildbattle';
const EXTRA=[
 ['橘 智弥（兄として、友として）','SSR'],
 ['宮本 蓮士（打ち明けた秘密）','SSR'],
 ['蒼木 祥子（空腹の待ち合わせ）','SSR'],
 ['リューグーン（時を忘れた海底の主）','SR'],
 ['ネイサン（ネコ科最強のエージェント）','SR'],
 ['ビューマルゴ（不死身な黄金色の猛獣）','SR'],
 ['コロコニー（輝きする二本の牙）','SR'],
 ['シャルロッテ（とってもふわふわお嬢様）','SR'],
 ['オージュゴン（見たら忘れてほしい）','SR'],
 ['ヌメテューサ（双メメった大群にとりこまれる）','SR'],
 ['ナンヨウ（ゾト目で世界を掌握）','SR'],
 ['鳳梨 麗華（鳳梨の名を背負う少女）','SR']
];
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,4);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const all=(d,n)=>new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const put=(d,n,x)=>new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
async function run(){
 const d=await open(),cs=await all(d,'characters');
 let next=1,added=0,skipped=0,details=[];
 const makeId=()=>{while(cs.some(x=>x.id===`CHR-${String(next).padStart(4,'0')}`))next++;return `CHR-${String(next++).padStart(4,'0')}`};
 for(const [name,rarity] of EXTRA){
   if(cs.some(x=>String(x.name||'')===name)){skipped++;details.push({name,status:'skipped_existing'});continue}
   const c={id:makeId(),name,rarity,source:'implemented_character_name_seed',verification_status:'unverified',verification_required:true,active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
   await put(d,'characters',c);cs.push(c);added++;details.push({id:c.id,name,status:'added'});
 }
 await put(d,'settings',{key:'implemented_character_name_seed_20260925',added,skipped,details,updated_at:new Date().toISOString(),note:'Implemented character names are added only when missing; existing records are skipped without overwrite.'});
 d.close();
 window.dispatchEvent(new CustomEvent('paranoise-character-master-updated',{detail:{added,skipped}}));
}
setTimeout(()=>run().catch(console.error),1200);
})();
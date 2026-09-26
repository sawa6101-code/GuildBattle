/* Character skill master 2026-09-18
   Source-backed SSR/SR combat data. Unknown mechanics are not invented. */
(function(){
'use strict';
const DB='paranoise-guildbattle',V=6;
const M=[
{name:'橘 結衣（その視線の先に）',rarity:'SSR',element:'地',attack_type:'特殊アタッカー',max_mp:6,
 passives:[{name:'復讐スリープ(2体)',trigger:'敵の攻撃で戦闘不能',effect:'その敵と別のランダムな敵1体を睡眠状態にする',awakening_rates:[10,20,40,70,100],status:'sleep'}],
 skills:[
  {name:'HP反転',type:'hp_swap',target:'self',condition:{hp_below:0.30},tu:100,mp_cost:3},
  {name:'EXスリープ(2体)',type:'status',target:'enemy_2',status:'sleep',tu:160,ex:true,once_per_battle:true,mp_cost:0},
  {name:'サバイバー',type:'damage',target:'enemy_single',multiplier:5,condition:{survive_tu:300},tu:130},
  {name:'アタック',type:'damage',target:'enemy_single',multiplier:1,tu:130}] ,source:'user_screenshot',source_checked:'2026-09-19',screenshot_evidence:'IMG_0456.png',verification_status:'user_confirmed',verification_required:false},
{name:'天草 仁（鳳梨に忠誠を誓った男）',rarity:'SR',element:'闇',attack_type:'特殊アタッカー',
 passives:[{name:'—',effect:'パッシブなし'}],
 skills:[
  {name:'シリアルキラー',type:'damage',target:'enemy_single',multiplier:5,condition:{kills_gte:2},tu:130},
  {name:'強化アタック（全体）',type:'damage',target:'enemy_all',multiplier:1.5,tu:250,mp:true},
  {name:'アタック',type:'damage',target:'enemy_single',multiplier:1,tu:130}]},
{name:'鳳梨 麗華（鳳梨の名を背負う少女）',rarity:'SR',element:'地',attack_type:'特殊アタッカー',
 passives:[{name:'根性',trigger:'致命傷',effect:'HP1で生存'}],
 skills:[
  {name:'シリアルキラー',type:'damage',target:'enemy_single',multiplier:5,condition:{kills_gte:2},tu:130},
  {name:'強化アタック（2体）',type:'damage',target:'enemy_2',multiplier:2,tu:160,mp:true},
  {name:'アタック',type:'damage',target:'enemy_single',multiplier:1,tu:130}]},
{name:'橘 結衣（天真爛漫な剣道女子）',rarity:'SR',element:'光',attack_type:'物理アタッカー',
 passives:[{name:'根性',trigger:'致命傷',effect:'HP1で生存'}],
 skills:[
  {name:'サバイバー',type:'damage',target:'enemy_single',multiplier:5,condition:{survive_tu:300},tu:130},
  {name:'強化アタック',type:'damage',target:'enemy_single',multiplier:2.5,tu:130,mp:true},
  {name:'アタック（2体）',type:'damage',target:'enemy_2',multiplier:.75,tu:130}]},
{name:'宮本 蓮士（黒き刃を振るう青年）',rarity:'SR',element:'闇',attack_type:'物理アタッカー',
 passives:[{name:'根性',trigger:'致命傷',effect:'HP1で生存'}],
 skills:[
  {name:'孤軍奮闘',type:'damage',target:'enemy_single',multiplier:5,condition:{last_standing:true},tu:130},
  {name:'タイムストライク',type:'conditional_damage',target:'enemy_single',conditions:[{enemy_tu_gte:130,multiplier:4},{enemy_tu_gte:200,multiplier:5}],tu:100},
  {name:'アタック',type:'damage',target:'enemy_single',multiplier:1,tu:130}]},
{name:'本田 美波（神奈川県警の若きエース）',rarity:'SR',element:'光',attack_type:'物理アタッカー',
 passives:[{name:'根性',trigger:'致命傷',effect:'HP1で生存'}],
 skills:[
  {name:'シリアルキラー',type:'damage',target:'enemy_single',multiplier:5,condition:{kills_gte:2},tu:130},
  {name:'強化アタック',type:'damage',target:'enemy_single',multiplier:2.5,tu:130,mp:true},
  {name:'アタック',type:'damage',target:'enemy_single',multiplier:1,tu:130}]}
];
function open(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,V);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function all(d,n){return new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(d,n,x){return new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function run(){const d=await open(),cs=await all(d,'characters');let next=1;const id=()=>{while(cs.some(x=>x.id===`CHR-${String(next).padStart(4,'0')}`))next++;return `CHR-${String(next++).padStart(4,'0')}`};for(const x of M){let c=cs.find(v=>v.name===x.name);if(!c)c={id:id(),name:x.name,created_at:new Date().toISOString()};Object.assign(c,x,{skill_data:{passives:x.passives,skills:x.skills},battle_profile:{passives:x.passives,skills:x.skills},tu_data:{skills:x.skills.map(s=>({name:s.name,tu:s.tu??null}))},verification_status:'verified',verification_required:false,source:'攻略Wiki/Gamerch',source_checked:'2026-09-18',updated_at:new Date().toISOString()});await put(d,'characters',c)}await put(d,'settings',{key:'character_skill_master_20260918',version:'1.0',updated_at:new Date().toISOString(),count:M.length});d.close();window.dispatchEvent(new CustomEvent('paranoise-character-master-updated',{detail:{count:M.length}}))}setTimeout(()=>run().catch(console.error),300);
})();
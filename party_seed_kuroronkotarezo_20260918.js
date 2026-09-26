/* Party import: クロろんこたれ蔵 / screenshot 2026-09-18. */
(function(){
const DB='paranoise-guildbattle',VER=6,PLAYER='クロろんこたれ蔵';
const PARTIES=[
{no:1,total:75195811,chars:[
{pos:1,name:'宮本 涼子（潮風とレモンの記憶）',level:186,power:13570000},
{pos:2,name:'橘 結衣（その視線の先に）',level:111,power:4830000},
{pos:3,name:'榊原大地（決戦前日）',level:200,power:18570000},
{pos:4,name:'望月 那由多（今...見ましたよね？）',level:101,power:1320000},
{pos:5,name:'本田 美波（デートじゃないよね？）',level:200,power:29940000},
{pos:6,name:'蒼木 祥子（今夜のデザートは...）',level:150,power:6950000}]},
{no:2,total:49855723,chars:[
{pos:1,name:'蒼木 祥子（空腹の待ち合わせ）',level:101,power:1950000},
{pos:2,name:'黒澤 アンナ（密室のミーティング）',level:25,power:260000},
{pos:3,name:'鳳梨 麗華（夕立ちの迷子）',level:180,power:13510000},
{pos:4,name:'柳葉 龍（遅れてきた男）',level:200,power:26150000},
{pos:5,name:'宮本 蓮士（打ち明けた秘密）',level:101,power:2320000},
{pos:6,name:'黒澤 アンナ（心を惑わす嘘）',level:130,power:5680000}]},
];
const now=()=>new Date().toISOString();
function open(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,VER);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function all(d,n){return new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(d,n,x){return new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function del(d,n,k){return new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).delete(k);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function seed(){
const d=await open(),ms=await all(d,'members'),ps=await all(d,'parties'),pcs=await all(d,'partyCharacters'),cs=await all(d,'characters');
const m=ms.find(x=>x.name===PLAYER);if(!m)throw new Error('対象プレイヤーが未登録: '+PLAYER);
for(const spec of PARTIES){let p=ps.find(x=>x.member_id===m.id&&Number(x.party_no)===spec.no);if(!p){p={id:'party_'+crypto.randomUUID(),member_id:m.id,party_no:spec.no,name:'PT'+spec.no,created_at:now()};Object.assign(p,{name:'PT'+spec.no,total_power:spec.total,hp_current:0,hp_max:0,fatigue_value:0,fatigue_multiplier:1,battle_count:0,win_count:0,loss_count:0,draw_count:0,active:true,source:'screenshot',source_date:'2026-09-18',source_player:PLAYER,updated_at:now()});await put(d,'parties',p);}
const current=await all(d,'partyCharacters');for(const x of spec.chars){const c=cs.find(v=>v.name===x.name);let row=current.find(z=>z.party_id===p.id&&z.position===x.pos);if(!row)row={id:'pc_'+crypto.randomUUID(),party_id:p.id,position:x.pos};Object.assign(row,{character_id:c?.id||row.character_id||null,character_name_snapshot:x.name,level:x.level,power:x.power,hp:row.hp??null,attack:row.attack??null,defense:row.defense??null,speed:row.speed??null,source:'screenshot',source_date:'2026-09-18',recognition_status:c?'visual_match_candidate':'character_not_found',verification_required:!c,updated_at:now()});await put(d,'partyCharacters',row)}
}
await put(d,'settings',{key:'party_import_クロろんこたれ蔵_20260918',player:PLAYER,party_count:2,source:'screenshot',updated_at:now()});d.close();
window.dispatchEvent(new CustomEvent('guildbattle-party-imported',{detail:{player:PLAYER,partyCount:2}}));
}seed().catch(e=>console.error('部隊登録:',e));
})();
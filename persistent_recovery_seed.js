/* GuildBattle persistent recovery seed.
   Restores previously registered screenshot data only when missing.
   Browser cache deletion does not erase IndexedDB; this bundled seed additionally
   allows recovery after site-data reset when the app is opened again. */
(function(){
'use strict';
const DB='paranoise-guildbattle',VER=6;
const OWN=[
['猛暑☠HINA☆ボコ',139,46550902,17575],['クロろんこたれ蔵',153,145543359,60790],['卍 楽いのり 卍',142,57893276,22575],['釣れない釣り師',0,52713566,37430],['モクまるっとサワー',140,43302132,16765],['リンク',139,37132827,19235],['じょん・とらぼるた',140,34545530,28920],['CHELSEA',136,33932656,22240],['Pe:',143,30917758,28660],['かーくん8歳',134,29719137,14645],['フェルミナ',137,28623403,25505],['くさなぎ',132,26517262,13340],['ゆうまくんくん',133,24037819,8650],['常時充電不足',135,23413088,1120],['シャア・アズナブル',131,23191698,16340],['Free',0,0,0]
];
const ENEMY=[['(ね ^ v ^ る)',137,57088726,21965],['とっとこ',140,51654681,26915],['bk',141,46316418,3200],['こひつ',141,42237466,25615],['ラスニール',138,38426768,24115],['しん',135,34541545,3690]];
const PARTIES=[
{player:'クロろんこたれ蔵',no:1,total:75195811,chars:['宮本 涼子（潮風とレモンの記憶）','橘 結衣（その視線の先に）','榊原大地（決戦前日）','望月 那由多（今...見ましたよね？）','本田 美波（デートじゃないよね？）','蒼木 祥子（今夜のデザートは...）'],levels:[186,111,200,101,200,150],powers:[13570000,4830000,18570000,1320000,29940000,6950000]},
{player:'クロろんこたれ蔵',no:2,total:49855723,chars:['蒼木 祥子（空腹の待ち合わせ）','黒澤 アンナ（密室のミーティング）','鳳梨 麗華（夕立ちの迷子）','柳葉 龍（遅れてきた男）','宮本 蓮士（打ち明けた秘密）','黒澤 アンナ（心を惑わす嘘）'],levels:[101,25,180,200,101,130],powers:[1950000,260000,13510000,26150000,2320000,5680000]}
];
const now=()=>new Date().toISOString(),uid=p=>p+'_'+crypto.randomUUID();
function open(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,VER);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function all(d,n){return new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(d,n,x){return new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function makeParty(d,m,no){
 let ps=await all(d,'parties'),p=ps.find(x=>x.member_id===m.id&&Number(x.party_no)===no);
 if(!p){p={id:uid('party'),member_id:m.id,party_no:no,name:'PT'+no,total_power:0,hp_current:0,hp_max:0,fatigue_value:0,fatigue_multiplier:1,battle_count:0,win_count:0,loss_count:0,draw_count:0,active:true,created_at:now()}}
 await put(d,'parties',p);return p
}
async function ensureMembers(d,g,list){
 let ms=await all(d,'members'),deleted=await all(d,'settings');
 for(let i=0;i<list.length;i++){const x=list[i];if(deleted.some(s=>String(s.key||'').startsWith('deleted_member_')&&s.name===x[0]))continue;let m=ms.find(v=>v.guild_id===g.id&&v.name===x[0]);if(!m)m={id:uid('member'),guild_id:g.id,member_no:i+1,name:x[0],active:true,memo:'スクリーンショット登録（2026-09-18）',created_at:now()};Object.assign(m,{member_no:m.member_no||i+1,profile_level:x[1],battle_power:x[2],ambition_points:x[3],source:'screenshot',source_date:'2026-09-18',active:true,updated_at:now()});await put(d,'members',m)}
}
async function restoreParties(d,ms,chars){
 for(const spec of PARTIES){const m=ms.find(x=>x.name===spec.player);if(!m)continue;const p=await makeParty(d,m,spec.no);const existingPC=await all(d,'partyCharacters');const complete=spec.chars.every((name,i)=>existingPC.some(z=>z.party_id===p.id&&z.position===i+1));if(p.total_power===spec.total&&complete)continue;Object.assign(p,{name:'PT'+spec.no,total_power:spec.total,source:'screenshot',source_date:'2026-09-18',source_player:spec.player,active:true,updated_at:now()});await put(d,'parties',p);let pcs=await all(d,'partyCharacters');for(const x of spec.chars.map((name,i)=>({name,i}))){if(pcs.some(z=>z.party_id===p.id&&z.position===x.i))continue;const c=chars.find(v=>v.name===x.name);await put(d,'partyCharacters',{id:uid('pc'),party_id:p.id,position:x.i+1,character_id:c?.id||null,character_name_snapshot:x.name,level:spec.levels[x.i],power:spec.powers[x.i],hp:null,attack:null,defense:null,speed:null,source:'screenshot',source_date:'2026-09-18',recognition_status:c?'visual_match_candidate':'character_not_found',verification_required:!c,updated_at:now()})}}
}
async function run(){
 const d=await open(),gs=await all(d,'guilds');
 let own=gs.find(g=>g.side==='OWN'||g.side==='own');if(!own){own={id:uid('guild'),name:'自軍',side:'OWN',guild_no:0,active:true,source:'recovery_seed',created_at:now(),updated_at:now()};await put(d,'guilds',own)}
 let enemy=gs.find(g=>g.name==='月のしずく'&&g.side==='ENEMY');if(!enemy){enemy={id:uid('guild'),name:'月のしずく',side:'ENEMY',guild_no:Math.max(0,...gs.filter(g=>g.side==='ENEMY').map(g=>Number(g.guild_no)||0))+1,active:true,external_id:'VQ6KMM0',source:'screenshot',source_date:'2026-09-18',created_at:now(),updated_at:now()};await put(d,'guilds',enemy)}
 await ensureMembers(d,own,OWN);await ensureMembers(d,enemy,ENEMY);
 const ms=await all(d,'members'),chars=await all(d,'characters');await restoreParties(d,ms,chars);
 await put(d,'settings',{key:'persistent_recovery_seed',version:'2026-09-18.1',protected:true,restored_at:now(),description:'Screenshot registration recovery baseline'});d.close();
 window.dispatchEvent(new CustomEvent('guildbattle-recovery-complete'));
}
setTimeout(()=>run().catch(e=>console.error('persistent recovery:',e)),2500);
})();
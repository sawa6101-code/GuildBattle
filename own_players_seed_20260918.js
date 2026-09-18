/* Own guild player import seed: screenshots 2026-09-18. */
(function(){
const DB='paranoise-guildbattle',VER=2;
const PLAYERS=[
{name:'猛暑☠HINA☆ボコ',level:139,power:46550902,points:17575},
{name:'クロろんこたれ蔵',level:153,power:145543359,points:60790},
{name:'卍 楽いのり 卍',level:142,power:57893276,points:22575},
{name:'釣れない釣り師',level:0,power:52713566,points:37430},
{name:'モクまるっとサワー',level:140,power:43302132,points:16765},
{name:'リンク',level:139,power:37132827,points:19235},
{name:'じょん・とらぼるた',level:140,power:34545530,points:28920},
{name:'CHELSEA',level:136,power:33932656,points:22240},
{name:'Pe:',level:143,power:30917758,points:28660},
{name:'かーくん8歳',level:134,power:29719137,points:14645},
{name:'フェルミナ',level:137,power:28623403,points:25505},
{name:'くさなぎ',level:132,power:26517262,points:13340},
{name:'ゆうまくんくん',level:133,power:24037819,points:8650},
{name:'常時充電不足',level:135,power:23413088,points:1120},
{name:'シャア・アズナブル',level:131,power:23191698,points:16340},
{name:'Free',level:0,power:0,points:0}
];
const now=()=>new Date().toISOString(),uid=p=>p+'_'+crypto.randomUUID();
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,VER);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function all(d,n){return new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(d,n,x){return new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function seed(){
const d=await open();const gs=await all(d,'guilds');
let g=gs.find(x=>x.side==='OWN'||x.side==='own');
if(!g){g={id:uid('guild'),name:'自軍',side:'OWN',guild_no:0,active:true,created_at:now(),updated_at:now()};await put(d,'guilds',g)}
const ms=await all(d,'members'),ps=await all(d,'parties');
for(let i=0;i<PLAYERS.length;i++){const x=PLAYERS[i];let m=ms.find(v=>v.guild_id===g.id&&v.name===x.name);if(!m)m={id:uid('member'),guild_id:g.id,member_no:i+1,name:x.name,active:true,memo:'スクリーンショット登録（2026-09-18）',created_at:now(),updated_at:now()};Object.assign(m,{profile_level:x.level,battle_power:x.power,ambition_points:x.points,source:'screenshot',source_date:'2026-09-18',updated_at:now()});await put(d,'members',m);if(!ps.some(p=>p.member_id===m.id)){for(let pn=1;pn<=2;pn++)await put(d,'parties',{id:uid('party'),member_id:m.id,party_no:pn,name:'PT'+pn,total_power:0,hp_current:0,hp_max:0,fatigue_value:0,fatigue_multiplier:1,battle_count:0,win_count:0,loss_count:0,draw_count:0,active:true,created_at:now(),updated_at:now()})}}
await put(d,'settings',{key:'own_players_import_20260918',guild_id:g.id,count:PLAYERS.length,source:'screenshots',updated_at:now()});d.close();
window.dispatchEvent(new CustomEvent('guildbattle-own-imported',{detail:{guild:g.name,count:PLAYERS.length}}));
}seed().catch(e=>console.error('自軍プレイヤー登録:',e));
})();
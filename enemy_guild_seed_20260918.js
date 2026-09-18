/* Enemy guild import seed: 月のしずく (screenshot 2026-09-18). */
(function(){
const DB='paranoise-guildbattle',VER=3;
const PLAYERS=[
{name:'(ね ^ v ^ る)',level:137,power:57088726,points:21965,memo:'3/29(´・ω・`)ゃー（スクショより）'},
{name:'とっとこ',level:140,power:51654681,points:26915,memo:'(・-・)（スクショより）'},
{name:'bk',level:141,power:46316418,points:3200,memo:'地道にこつこつ（スクショより）'},
{name:'こひつ',level:141,power:42237466,points:25615,memo:'（スクショより）'},
{name:'ラスニール',level:138,power:38426768,points:24115,memo:'（スクショより）'},
{name:'しん',level:135,power:34541545,points:3690,memo:'本田刑事推し♪（スクショより）'}
];
const now=()=>new Date().toISOString(),uid=p=>p+'_'+crypto.randomUUID();
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,VER);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function all(d,n){return new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(d,n,x){return new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function seed(){
const d=await open();
const gs=await all(d,'guilds');
let g=gs.find(x=>x.name==='月のしずく'&&x.side==='ENEMY');
if(!g){const nums=gs.filter(x=>x.side==='ENEMY').map(x=>Number(x.guild_no)||0);g={id:uid('guild'),name:'月のしずく',side:'ENEMY',guild_no:Math.max(0,...nums)+1,active:true,external_id:'VQ6KMM0',member_count_display:46,member_capacity:50,source:'screenshot',source_date:'2026-09-18',created_at:now(),updated_at:now()};await put(d,'guilds',g)}
else{Object.assign(g,{external_id:'VQ6KMM0',member_count_display:46,member_capacity:50,source:'screenshot',source_date:'2026-09-18',updated_at:now()});await put(d,'guilds',g)}
const ms=await all(d,'members'),ps=await all(d,'parties');
for(let i=0;i<PLAYERS.length;i++){const x=PLAYERS[i];let m=ms.find(v=>v.guild_id===g.id&&v.name===x.name);if(!m)m={id:uid('member'),guild_id:g.id,member_no:i+1,name:x.name,active:true,memo:x.memo,created_at:now(),updated_at:now()};Object.assign(m,{profile_level:x.level,battle_power:x.power,ambition_points:x.points,source:'screenshot',source_date:'2026-09-18',memo:x.memo,updated_at:now()});await put(d,'members',m);if(!ps.some(p=>p.member_id===m.id)){for(let pn=1;pn<=2;pn++)await put(d,'parties',{id:uid('party'),member_id:m.id,party_no:pn,name:'PT'+pn,total_power:0,hp_current:0,hp_max:0,fatigue_value:0,fatigue_multiplier:1,battle_count:0,win_count:0,loss_count:0,draw_count:0,active:true,created_at:now(),updated_at:now()})}}
await put(d,'settings',{key:'enemy_guild_month_shizuku_import_20260918',guild_id:g.id,count:PLAYERS.length,source:'screenshot',updated_at:now()});d.close();
window.dispatchEvent(new CustomEvent('guildbattle-enemy-imported',{detail:{guild:g.name,count:PLAYERS.length}}));
}
seed().catch(e=>console.error('月のしずく登録:',e));
})();
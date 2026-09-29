/* Repository-history recovery seed — 2026-09-30
   Restores data that is demonstrably present in repository history.
   Merge-only: existing non-empty records are never overwritten.
*/
(function(){
'use strict';
const DB='paranoise-guildbattle',VER=7,SNAPSHOT='data/repository-recovery-snapshot-20260930.json';
const now=()=>new Date().toISOString();
const uid=p=>p+'_'+crypto.randomUUID();
const norm=s=>String(s||'').normalize('NFKC').replace(/[\\s　]/g,'').replace(/[（]/g,'(').replace(/[）]/g,')').trim();
function open(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,VER);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function all(d,n){return new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(d,n,x){return new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function fetchSnapshot(){return fetch(SNAPSHOT+'?v=20260930',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('snapshot HTTP '+r.status);return r.json()})}
function hasValue(v){return v!==undefined&&v!==null&&v!==''&&v!==0}
async function run(){
 const snap=await fetchSnapshot(),d=await open();
 if(![...d.objectStoreNames].includes('guilds'))throw new Error('guilds store missing');
 let gs=await all(d,'guilds'),ms=await all(d,'members'),ps=await all(d,'parties'),pcs=await all(d,'partyCharacters'),cs=await all(d,'characters');
 const counts={guilds:0,members:0,parties:0,partyCharacters:0,characters:0};
 const guildBySide=new Map();
 for(const gspec of snap.guilds){
   let g=gs.find(x=>x.name===gspec.name&&String(x.side||'').toUpperCase()===gspec.side);
   if(!g){g={id:uid('guild'),name:gspec.name,side:gspec.side,guild_no:gspec.guild_no,active:true,created_at:now()};Object.assign(g,gspec,{updated_at:now(),source:g.source||'repository_history_recovery'});await put(d,'guilds',g);gs.push(g);counts.guilds++}
   else{guildBySide.set(gspec.side,g)}
   guildBySide.set(gspec.side,g);
 }
 const own=guildBySide.get('OWN'),enemy=guildBySide.get('ENEMY');
 async function ensureMember(g,x,i,memo){
   let m=ms.find(v=>v.guild_id===g.id&&v.name===x[0]);
   if(!m){m={id:uid('member'),guild_id:g.id,member_no:i+1,name:x[0],active:true,created_at:now()};Object.assign(m,{profile_level:x[1],battle_power:x[2],ambition_points:x[3],memo:memo||'リポジトリ履歴復元',source:'repository_history',source_date:'2026-09-18',updated_at:now()});await put(d,'members',m);ms.push(m);counts.members++}
   else{
     const patch={};
     if(!hasValue(m.profile_level)&&hasValue(x[1]))patch.profile_level=x[1];
     if(!hasValue(m.battle_power)&&hasValue(x[2]))patch.battle_power=x[2];
     if(!hasValue(m.ambition_points)&&hasValue(x[3]))patch.ambition_points=x[3];
     if(m.member_no==null)patch.member_no=i+1;
     if(Object.keys(patch).length){Object.assign(m,patch,{updated_at:now()});await put(d,'members',m)}
   }
   return m;
 }
 for(let i=0;i<snap.own_members.length;i++)await ensureMember(own,snap.own_members[i],i);
 for(let i=0;i<snap.enemy_members.length;i++)await ensureMember(enemy,snap.enemy_members[i],i,snap.enemy_members[i][4]);
 ms=await all(d,'members');ps=await all(d,'parties');pcs=await all(d,'partyCharacters');cs=await all(d,'characters');
 for(const [name,rarity] of snap.characters){
   let c=cs.find(v=>norm(v.name)===norm(name));
   if(!c){c={id:'CHR-'+String(cs.length+1).padStart(4,'0'),name,rarity,source:'repository_history_recovery',verification_status:'unverified',verification_required:true,active:true,created_at:now(),updated_at:now()};while(cs.some(v=>v.id===c.id))c.id='CHR-'+String(Number(c.id.slice(4))+1).padStart(4,'0');await put(d,'characters',c);cs.push(c);counts.characters++}
 }
 for(const spec of snap.parties){
   const m=ms.find(v=>v.name===spec.player); if(!m)continue;
   let p=ps.find(v=>v.member_id===m.id&&Number(v.party_no)===spec.no);
   if(!p){p={id:uid('party'),member_id:m.id,party_no:spec.no,name:'PT'+spec.no,total_power:spec.total_power,hp_current:0,hp_max:0,fatigue_value:0,fatigue_multiplier:1,battle_count:0,win_count:0,loss_count:0,draw_count:0,active:true,source:'repository_history',source_date:'2026-09-18',source_player:spec.player,created_at:now(),updated_at:now()};await put(d,'parties',p);ps.push(p);counts.parties++}
   else if(!hasValue(p.total_power)){p.total_power=spec.total_power;p.source=p.source||'repository_history';p.source_date=p.source_date||'2026-09-18';p.updated_at=now();await put(d,'parties',p)}
   pcs=await all(d,'partyCharacters');
   for(let i=0;i<spec.chars.length;i++){
     const [name,level,power]=spec.chars[i];
     let row=pcs.find(v=>v.party_id===p.id&&Number(v.position)===i+1);
     const c=cs.find(v=>norm(v.name)===norm(name));
     if(!row){
       row={id:uid('pc'),party_id:p.id,position:i+1,character_id:c?.id||null,character_name_snapshot:name,level,power,hp:null,attack:null,defense:null,speed:null,source:'repository_history',source_date:'2026-09-18',recognition_status:c?'repository_history_match':'character_not_found',verification_required:!c,updated_at:now()};
       await put(d,'partyCharacters',row);pcs.push(row);counts.partyCharacters++;
     }else{
       const patch={};
       if(!hasValue(row.character_id)&&c)patch.character_id=c.id;
       if(!row.character_name_snapshot)patch.character_name_snapshot=name;
       if(!hasValue(row.level)&&hasValue(level))patch.level=level;
       if(!hasValue(row.power)&&hasValue(power))patch.power=power;
       if(Object.keys(patch).length){Object.assign(row,patch,{updated_at:now()});await put(d,'partyCharacters',row)}
     }
   }
 }
 await put(d,'settings',{key:'repository_history_recovery_20260930',version:1,source_commits:snap.source_commits,counts,restored_at:now(),description:'Merge-only recovery from repository history; existing non-empty records preserved.'});
 d.close();
 window.dispatchEvent(new CustomEvent('repository-history-recovery-complete',{detail:counts}));
 window.dispatchEvent(new CustomEvent('guildbattle-recovery-complete',{detail:{source:'repository-history',counts}}));
 console.info('[GuildBattle] repository history recovery',counts);
 return counts;
}
window.GuildBattleRepositoryRecovery={run};
setTimeout(()=>run().catch(e=>console.error('[GuildBattle] repository history recovery:',e)),3500);
})();
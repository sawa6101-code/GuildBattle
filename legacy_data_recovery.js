/* GuildBattle legacy database/PT recovery v1
   Reads same-origin IndexedDB databases created by older GuildBattle builds and
   imports missing guild/member/party/partyCharacters/character records into
   the current DB without deleting or replacing existing populated records.
*/
(function(){
'use strict';

const CURRENT_DB='paranoise-guildbattle';
const CURRENT_VERSION=7;
const RECOVERY_DB='GuildBattleRecovery';
const CORE=['guilds','members','parties','partyCharacters','characters'];

const norm=s=>String(s??'').normalize('NFKC').replace(/[\\s　]+/g,'').replace(/[（(]/g,'(').replace(/[）)]/g,')').toLowerCase();
const uid=p=>p+'_'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'_'+Math.random().toString(36).slice(2));
const now=()=>new Date().toISOString();

function openRead(name){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(name);
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error||new Error('IndexedDBを開けません: '+name));
    r.onblocked=()=>reject(new Error('旧DBの読み込みがブロックされています: '+name));
  });
}
function openCurrent(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(CURRENT_DB,CURRENT_VERSION);
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
    r.onupgradeneeded=()=>{
      const d=r.result,t=r.transaction;
      const defs={guilds:'id',members:'id',parties:'id',partyCharacters:'id',characters:'id',battleMatches:'id',battleResults:'id',fatigueHistory:'id',screenshots:'id',settings:'key',characterImages:'id',characterScreenshots:'id',characterSkillSources:'id'};
      for(const [n,k] of Object.entries(defs)){
        let s=d.objectStoreNames.contains(n)?t.objectStore(n):d.createObjectStore(n,{keyPath:k});
        if(n==='members'&&!s.indexNames.contains('guild_id'))s.createIndex('guild_id','guild_id');
        if(n==='parties'&&!s.indexNames.contains('member_id'))s.createIndex('member_id','member_id');
        if(n==='partyCharacters'){
          if(!s.indexNames.contains('party_id'))s.createIndex('party_id','party_id');
          if(!s.indexNames.contains('character_id'))s.createIndex('character_id','character_id');
        }
        if(n==='characters'){
          if(!s.indexNames.contains('name'))s.createIndex('name','name');
          if(!s.indexNames.contains('element'))s.createIndex('element','element');
          if(!s.indexNames.contains('rarity'))s.createIndex('rarity','rarity');
        }
        if(n==='screenshots'&&!s.indexNames.contains('target'))s.createIndex('target','target');
      }
    };
  });
}
function all(db,store){
  return new Promise((resolve,reject)=>{
    if(!db.objectStoreNames.contains(store))return resolve([]);
    const r=db.transaction(store).objectStore(store).getAll();
    r.onsuccess=()=>resolve(r.result||[]);
    r.onerror=()=>reject(r.error);
  });
}
function put(db,store,row){
  return new Promise((resolve,reject)=>{
    const r=db.transaction(store,'readwrite').objectStore(store).put(row);
    r.onsuccess=()=>resolve(row);
    r.onerror=()=>reject(r.error);
  });
}
function readStores(db){
  const names=[...db.objectStoreNames].filter(n=>CORE.includes(n));
  return Promise.all(names.map(n=>all(db,n).then(rows=>[n,rows]))).then(x=>Object.fromEntries(x));
}
async function listDatabases(){
  if(typeof indexedDB.databases==='function'){
    try{return (await indexedDB.databases()).filter(x=>x?.name).map(x=>({name:x.name,version:x.version||0}));}
    catch(e){console.warn('indexedDB.databases unavailable:',e)}
  }
  return [{name:CURRENT_DB,version:CURRENT_VERSION},{name:RECOVERY_DB,version:2}];
}
async function readRecovery(){
  try{
    const d=await openRead(RECOVERY_DB);
    if(!d.objectStoreNames.contains('snapshots')){d.close();return {}}
    const rows=await all(d,'snapshots');
    d.close();
    const out={};
    for(const x of rows)if(CORE.includes(x.store)&&Array.isArray(x.rows))out[x.store]=x.rows;
    return out;
  }catch(e){return {}}
}
async function readLegacyDatabase(name){
  const d=await openRead(name);
  const data=await readStores(d);
  const meta={name,version:d.version,stores:[...d.objectStoreNames]};
  d.close();
  return {meta,data};
}
function mergeField(dst,src,key){
  const a=dst[key],b=src[key];
  const empty=a===undefined||a===null||a===''||(typeof a==='number'&&a===0);
  if(empty && b!==undefined && b!==null && b!=='')dst[key]=b;
}
async function importSnapshot(db,snapshot,label){
  const stats={guilds:0,members:0,parties:0,partyCharacters:0,characters:0,skipped:0};
  const current={};
  for(const s of CORE)current[s]=await all(db,s);

  const charMap=new Map();
  const chars=snapshot.characters||[];
  for(const c0 of chars){
    if(!c0?.name)continue;
    const found=current.characters.find(x=>norm(x.name)===norm(c0.name));
    if(found){charMap.set(String(c0.id),found.id);continue}
    const c=Object.assign({},c0,{id:c0.id||uid('CHR'),recovered_from:label,recovered_at:now()});
    try{await put(db,'characters',c);current.characters.push(c);charMap.set(String(c0.id),c.id);stats.characters++}catch(e){console.warn('character import',e)}
  }

  const guildMap=new Map();
  for(const g0 of snapshot.guilds||[]){
    if(!g0?.name && g0?.side!=='OWN')continue;
    const found=current.guilds.find(g=>{
      if(g.side!==g0.side)return false;
      if(g.name&&g0.name&&norm(g.name)===norm(g0.name))return true;
      return Number(g.guild_no)===Number(g0.guild_no)&&g.side===g0.side;
    });
    if(found){guildMap.set(String(g0.id),found.id);continue}
    const g=Object.assign({},g0,{id:g0.id||uid('guild'),recovered_from:label,recovered_at:now()});
    try{await put(db,'guilds',g);current.guilds.push(g);guildMap.set(String(g0.id),g.id);stats.guilds++}catch(e){console.warn('guild import',e)}
  }

  const memberMap=new Map();
  for(const m0 of snapshot.members||[]){
    if(!m0?.name)continue;
    const gid=guildMap.get(String(m0.guild_id));
    if(!gid)continue;
    let found=current.members.find(m=>m.guild_id===gid&&norm(m.name)===norm(m0.name));
    if(!found){
      const m=Object.assign({},m0,{id:m0.id||uid('member'),guild_id:gid,recovered_from:label,recovered_at:now()});
      try{await put(db,'members',m);current.members.push(m);found=m;stats.members++}catch(e){console.warn('member import',e);continue}
    }else{
      for(const k of ['member_no','profile_level','battle_power','ambition_points','memo','source','source_date'])mergeField(found,m0,k);
      await put(db,'members',found);
    }
    memberMap.set(String(m0.id),found.id);
  }

  const partyMap=new Map();
  for(const p0 of snapshot.parties||[]){
    const mid=memberMap.get(String(p0.member_id));
    if(!mid)continue;
    let found=current.parties.find(p=>p.member_id===mid&&Number(p.party_no)===Number(p0.party_no));
    const hasSourceChars=(snapshot.partyCharacters||[]).some(x=>String(x.party_id)===String(p0.id));
    if(!found){
      found=Object.assign({},p0,{id:p0.id||uid('party'),member_id:mid,recovered_from:label,recovered_at:now()});
      try{await put(db,'parties',found);current.parties.push(found);stats.parties++}catch(e){console.warn('party import',e);continue}
    }else{
      for(const k of ['name','total_power','hp_current','hp_max','fatigue_value','fatigue_multiplier','battle_count','win_count','loss_count','draw_count','source','source_date','source_player'])mergeField(found,p0,k);
      if(hasSourceChars)found.recovered_from=label;
      await put(db,'parties',found);
    }
    partyMap.set(String(p0.id),found.id);
  }

  const existingPC=await all(db,'partyCharacters');
  for(const pc0 of snapshot.partyCharacters||[]){
    const pid=partyMap.get(String(pc0.party_id));
    if(!pid)continue;
    let found=existingPC.find(x=>x.party_id===pid&&Number(x.position)===Number(pc0.position));
    const mappedChar=pc0.character_id!=null?charMap.get(String(pc0.character_id)):null;
    if(!found){
      const pc=Object.assign({},pc0,{
        id:pc0.id||uid('pc'),
        party_id:pid,
        character_id:mappedChar||pc0.character_id||null,
        recovered_from:label,
        recovered_at:now()
      });
      try{await put(db,'partyCharacters',pc);existingPC.push(pc);stats.partyCharacters++}catch(e){console.warn('partyCharacter import',e)}
    }else{
      for(const k of ['character_id','character_name_snapshot','level','power','hp','attack','defense','speed','awakening','source','source_date','recognition_status','match_status','match_stage','match_confidence'])mergeField(found,pc0,k);
      if(mappedChar)found.character_id=mappedChar;
      found.recovered_from=label;
      await put(db,'partyCharacters',found);
      stats.skipped++;
    }
  }
  return stats;
}
async function recover(){
  const report=[];
  const dbs=await listDatabases();
  const recovery=await readRecovery();
  if(Object.keys(recovery).length){
    const d=await openCurrent();
    const s=await importSnapshot(d,recovery,RECOVERY_DB+' snapshot');
    report.push({source:RECOVERY_DB,version:2,stats:s});
    d.close();
  }

  for(const info of dbs){
    if(!info.name||info.name===CURRENT_DB||info.name===RECOVERY_DB)continue;
    try{
      const legacy=await readLegacyDatabase(info.name);
      const hasCore=CORE.some(s=>(legacy.data[s]||[]).length);
      if(!hasCore)continue;
      const d=await openCurrent();
      const s=await importSnapshot(d,legacy.data,info.name);
      d.close();
      report.push({source:info.name,version:legacy.meta.version,stores:legacy.meta.stores,stats:s});
    }catch(e){report.push({source:info.name,error:e?.message||String(e)})}
  }

  window.dispatchEvent(new CustomEvent('guildbattle-legacy-recovery-complete',{detail:report}));
  return report;
}
async function inspect(){
  const dbs=await listDatabases();
  const result=[];
  for(const info of dbs){
    try{
      const d=await openRead(info.name);
      const counts={};
      for(const s of CORE)counts[s]=d.objectStoreNames.contains(s)?(await all(d,s)).length:0;
      result.push({name:info.name,version:d.version,stores:[...d.objectStoreNames],counts});
      d.close();
    }catch(e){result.push({name:info.name,error:e?.message||String(e)})}
  }
  try{
    const r=await readRecovery();
    result.push({name:RECOVERY_DB+' snapshot',counts:Object.fromEntries(CORE.map(s=>[s,(r[s]||[]).length]))});
  }catch(e){}
  return result;
}
window.GuildBattleLegacyRecovery={recover,inspect,listDatabases};
})();

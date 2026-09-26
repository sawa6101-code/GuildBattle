/* GuildBattle Skill/Spec Auto-Diff Engine v2
 * Pipeline: acquire -> normalize -> diff -> confidence -> pending -> approved -> engine.
 * No unverified observation is silently promoted to combat rules.
 */
(function(){
'use strict';
const DB='paranoise-guildbattle',V=6;
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s　]+/g,'').replace(/[（(]/g,'(').replace(/[）)]/g,')').toLowerCase();
const now=()=>new Date().toISOString();
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,V);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const all=(d,n)=>new Promise((res,rej)=>{const q=d.transaction(n).objectStore(n).getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
const put=(d,n,x)=>new Promise((res,rej)=>{const q=d.transaction(n,'readwrite').objectStore(n).put(x);q.onsuccess=()=>res(x);q.onerror=()=>rej(q.error)});
function canonical(s){
 const x=s||{};
 return {name:String(x.name||''),type:String(x.type||'damage'),target:String(x.target||'enemy_single'),
 multiplier:x.multiplier==null?null:Number(x.multiplier),tu:x.tu==null?null:Number(x.tu),
 status_effects:[...(x.status_effects||[])].sort(),conditions:(x.conditions||[]).map(c=>({type:c.type,value:Number(c.value)})).sort((a,b)=>(a.type+a.value).localeCompare(b.type+b.value)),ex:!!x.ex};
}
function diffSkill(a,b){
 const d=[];
 for(const k of ['type','target','multiplier','tu','ex']) if(JSON.stringify(canonical(a)[k])!==JSON.stringify(canonical(b)[k]))d.push({field:k,before:canonical(a)[k],after:canonical(b)[k]});
 if(JSON.stringify(canonical(a).status_effects)!==JSON.stringify(canonical(b).status_effects))d.push({field:'status_effects',before:canonical(a).status_effects,after:canonical(b).status_effects});
 if(JSON.stringify(canonical(a).conditions)!==JSON.stringify(canonical(b).conditions))d.push({field:'conditions',before:canonical(a).conditions,after:canonical(b).conditions});
 return d;
}
function parseCandidate(raw,source){
 const skills=Array.isArray(raw.skills)?raw.skills:[];
 return {name:raw.name,rarity:raw.rarity||'',source_url:raw.url||source||'',skills:skills.map(canonical),checked_at:now()};
}
async function loadLatestSnapshot(opts={}){const r=await fetch('./data/character-skill-sync-latest.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('skill snapshot HTTP '+r.status);return applySnapshot(await r.json(),opts)}
async function applySnapshot(snapshot,{autoApprove=false}={}){
 const d=await open(),chars=await all(d,'characters'),changes=[],pending=[];
 for(const raw of (snapshot.records||[])){
  const c=chars.find(x=>norm(x.name)===norm(raw.name)); if(!c)continue;
  const incoming=parseCandidate(raw,raw.url), oldSkills=Array.isArray(c.skill_data?.skills)?c.skill_data.skills:[];
  const by=new Map(oldSkills.map(s=>[norm(s.name),s]));
  for(const ns of incoming.skills){
   const os=by.get(norm(ns.name));
   const diffs=os?diffSkill(os,ns):[{field:'NEW_SKILL',before:null,after:ns}];
   if(diffs.length){
    const key='skill_spec_'+c.id+'_'+norm(ns.name);
    const previous=(await all(d,'settings')).find(x=>x.key===key);
    const sameAsPrevious=previous?.after && JSON.stringify(canonical(previous.after))===JSON.stringify(canonical(ns));
    const observations=Number(previous?.observations||0)+1;
    const consistency=previous ? (sameAsPrevious ? Math.min(1,(Number(previous.consistency||0)*Number(previous.observations||1)+1)/observations) : 0.5) : 1;
    const confidence=Math.min(0.99,(1-Math.exp(-observations/3))*consistency);
    const candidate={key,character_id:c.id,character_name:c.name,skill_name:ns.name,
      before:os||previous?.after||null,after:ns,diffs,source_url:incoming.source_url,
      observations,consistency,confidence,status:autoApprove?'APPROVED':(confidence>=0.9?'READY_REVIEW':'PENDING_REVIEW'),created_at:previous?.created_at||now(),updated_at:now()};
    await put(d,'settings',candidate);pending.push(candidate);changes.push({character_id:c.id,skill:ns.name,diffs});
    if(autoApprove){c.skill_data=c.skill_data||{};c.skill_data.skills=oldSkills.filter(s=>norm(s.name)!==norm(ns.name)).concat([ns]);c.battle_profile=c.battle_profile||{};c.battle_profile.skills=c.skill_data.skills;c.updated_at=now();await put(d,'characters',c)}
   }
  }
 }
 const meta={key:'character_skill_sync_meta',version:2,last_sync:now(),changes,pending_count:pending.length,engine_reflected:autoApprove};
 await put(d,'settings',meta);d.close();
 window.dispatchEvent(new CustomEvent('character-skill-sync-complete',{detail:meta}));
 return meta;
}
async function approve(key){
 const d=await open(),s=(await all(d,'settings')).find(x=>x.key===key);if(!s){d.close();throw Error('候補がありません')}
 const chars=await all(d,'characters'),c=chars.find(x=>x.id===s.character_id);if(!c){d.close();throw Error('キャラクターがありません')}
 c.skill_data=c.skill_data||{};const arr=Array.isArray(c.skill_data.skills)?c.skill_data.skills:[];c.skill_data.skills=arr.filter(x=>norm(x.name)!==norm(s.skill_name)).concat([s.after]);c.battle_profile=c.battle_profile||{};c.battle_profile.skills=c.skill_data.skills;c.skill_spec_version=(Number(c.skill_spec_version)||0)+1;c.updated_at=now();await put(d,'characters',c);
 s.status='APPROVED';s.approved_at=now();await put(d,'settings',s);d.close();return s;
}
async function listPending(){
 const d=await open(),r=(await all(d,'settings')).filter(x=>x.key&&String(x.key).startsWith('skill_spec_')&&x.status!=='APPROVED');d.close();return r;
}
window.GuildBattleSkillSync={loadLatestSnapshot,applySnapshot,approve,listPending,diffSkill,canonical};
document.addEventListener('DOMContentLoaded',()=>{loadLatestSnapshot().catch(()=>{})});
})();

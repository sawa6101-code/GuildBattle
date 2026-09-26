/* GuildBattle Character Data Auto Sync Engine
 * Source priority:
 * 1 game_server
 * 2 public_api
 * 3 official_web_api
 * 4 public攻略サイト
 * Browser side only uses CORS-accessible sources. GitHub Actions performs server-side periodic sync.
 */
(function(){
'use strict';
const DB='paranoise-guildbattle', V=6;
const SOURCE_KEY='character_sync_sources_v1';
const META_KEY='character_sync_meta';
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s　]+/g,'').replace(/[（(]/g,'(').replace(/[）)]/g,')').toLowerCase();
const now=()=>new Date().toISOString();
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,V);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const all=(d,n)=>new Promise((res,rej)=>{const q=d.transaction(n).objectStore(n).getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
const put=(d,n,x)=>new Promise((res,rej)=>{const q=d.transaction(n,'readwrite').objectStore(n).put(x);q.onsuccess=()=>res(x);q.onerror=()=>rej(q.error)});
const get=(d,n,k)=>new Promise((res,rej)=>{const q=d.transaction(n).objectStore(n).get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
const sourceDefaults=[
 {id:'game-server',priority:1,type:'game_server',enabled:true,endpoint:'',format:'json',note:'ゲームサーバー公式API。発見時に設定'},
 {id:'public-api',priority:2,type:'public_api',enabled:true,endpoint:'',format:'json',note:'公開API。発見時に設定'},
 {id:'official-web-api',priority:3,type:'official_web_api',enabled:true,endpoint:'',format:'json',note:'公式Web/API。発見時に設定'},
 {id:'paranavi-ssr',priority:4,type:'public_guide',enabled:true,endpoint:'https://www.gaming.kyuzitu.net/paranoizu/ssrkyaraitiran/',format:'html',note:'パラナビSSR一覧'},
 {id:'paranavi-performance',priority:4,type:'public_guide',enabled:true,endpoint:'https://www.gaming.kyuzitu.net/paranoizu/category/character-seinou-hyouka/',format:'html',note:'パラナビ性能記事一覧'}
];
async function getSources(d){const s=await get(d,'settings',SOURCE_KEY);return s?.sources?.length?s.sources:sourceDefaults}
function extractJsonCharacters(data){
 const out=[];
 const walk=x=>{
  if(!x)return;
  if(Array.isArray(x)){x.forEach(walk);return}
  if(typeof x!=='object')return;
  const name=x.name||x.characterName||x.cardName||x.title;
  const rarity=x.rarity||x.rarityName||x.rank;
  if(name&&rarity&&/^(SSR|SR|R)$/i.test(String(rarity)))out.push(x);
  Object.values(x).forEach(v=>{if(v&&typeof v==='object')walk(v)});
 };
 walk(data);
 const seen=new Set();return out.filter(x=>{const k=norm(x.name||x.characterName||x.cardName||x.title);if(seen.has(k))return false;seen.add(k);return true});
}
function extractGuideNames(html){
 const doc=new DOMParser().parseFromString(html,'text/html'),out=[];
 doc.querySelectorAll('a,h1,h2,h3,h4,h5,li').forEach(el=>{
  const t=(el.textContent||'').replace(/\s+/g,' ').trim();
  const m=t.match(/^(.+?)[\s　]+(?:（|\()?(SSR|SR|R)(?:）|\))?$/i);
  if(m&&m[1].length>1&&m[1].length<80)out.push({name:m[1],rarity:m[2]?.toUpperCase()||''});
 });
 return out;
}
function stableId(chars){let n=1;while(chars.some(c=>c.id===`CHR-${String(n).padStart(4,'0')}`))n++;return `CHR-${String(n).padStart(4,'0')}`}
function normalizeRecord(raw,source,existing){
 const name=raw.name||raw.characterName||raw.cardName||raw.title;
 const rarity=String(raw.rarity||raw.rarityName||raw.rank||existing?.rarity||'').toUpperCase();
 const c=Object.assign({},existing||{id:stableId([]),created_at:now()}, {
  name:String(name).trim(), rarity:rarity||existing?.rarity||'',
  element:raw.element||raw.attribute||existing?.element||'',
  attack_type:raw.attack_type||raw.attackType||existing?.attack_type||'',
  source:source.type, source_url:source.endpoint, source_checked:now(),
  verification_status:source.priority<=3?'server_synced':'public_source',
  verification_required:source.priority>3,
  active:true, updated_at:now()
 });
 if(raw.id||raw.characterId||raw.cardId)c.external_id=raw.id||raw.characterId||raw.cardId;
 if(raw.skills||raw.skill_data)c.skill_data=raw.skill_data||{skills:raw.skills};
 if(raw.passives)c.skill_data=Object.assign({},c.skill_data,{passives:raw.passives});
 if(raw.base_hp!=null)c.base_hp=Number(raw.base_hp);
 if(raw.base_attack!=null)c.base_attack=Number(raw.base_attack);
 if(raw.base_defense!=null)c.base_defense=Number(raw.base_defense);
 if(raw.base_speed!=null)c.base_speed=Number(raw.base_speed);
 return c;
}
async function fetchSource(source){
 const r=await fetch(source.endpoint,{cache:'no-store',headers:{Accept:'application/json,text/html,*/*'}});
 if(!r.ok)throw new Error(source.id+' HTTP '+r.status);
 const text=await r.text();
 if(source.format==='json'){let data;try{data=JSON.parse(text)}catch(e){throw new Error(source.id+' JSON parse error')}return extractJsonCharacters(data)}
 return extractGuideNames(text);
}
async function applySnapshot(data){
 const d=await open(), chars=await all(d,'characters'), rows=Array.isArray(data?.records)?data.records:[], changes=[];
 let next=1; const alloc=()=>{while(chars.some(c=>c.id===`CHR-${String(next).padStart(4,'0')}`))next++;return `CHR-${String(next++).padStart(4,'0')}`};
 for(const raw of rows){
  const name=raw.name||raw.characterName||raw.cardName||raw.title;if(!name)continue;
  const key=norm(name);let c=chars.find(x=>norm(x.name)===key);
  const incoming={name:String(name).trim(),rarity:String(raw.rarity||raw.rarityName||raw.rank||c?.rarity||'').toUpperCase(),element:raw.element||raw.attribute||c?.element||'',attack_type:raw.attack_type||raw.attackType||c?.attack_type||'',source:raw._source||raw.source||'public_source',source_url:raw._source_url||raw.source_url||'',source_checked:data.generated_at||now(),verification_status:Number(raw._priority||4)<=3?'server_synced':'public_source',verification_required:Number(raw._priority||4)>3,active:true,updated_at:now()};
  if(raw.id||raw.characterId||raw.cardId)incoming.external_id=raw.id||raw.characterId||raw.cardId;
  if(raw.skills||raw.skill_data)incoming.skill_data=raw.skill_data||{skills:raw.skills};
  if(!c){c={id:alloc(),created_at:now()};Object.assign(c,incoming);await put(d,'characters',c);chars.push(c);changes.push({type:'ADD',id:c.id,name:c.name,source:c.source})}
  else {const before=JSON.stringify({...c,updated_at:undefined,source_checked:undefined});Object.assign(c,incoming);const after=JSON.stringify({...c,updated_at:undefined,source_checked:undefined});if(before!==after){await put(d,'characters',c);changes.push({type:'UPDATE',id:c.id,name:c.name,source:c.source})}}
 }
 const meta={key:META_KEY,version:2,last_sync:now(),snapshot_generated_at:data.generated_at||'',after_count:(await all(d,'characters')).length,changes,errors:data.errors||[],mode:'snapshot'};
 await put(d,'settings',meta);d.close();window.dispatchEvent(new CustomEvent('character-sync-complete',{detail:meta}));return meta;
}
async function loadLatestSnapshot(){
 const r=await fetch('./data/character-sync-latest.json?ts='+Date.now(),{cache:'no-store'});
 if(!r.ok)throw new Error('snapshot HTTP '+r.status);
 return applySnapshot(await r.json());
}
async function sync(opts={}){
 const d=await open(),sources=(await getSources(d)).filter(s=>s.enabled&&s.endpoint).sort((a,b)=>a.priority-b.priority);
 const chars=await all(d,'characters'),before=chars.length,changes=[],errors=[],seen=new Map();
 for(const s of sources){
  try{
   const rows=await fetchSource(s);
   for(const raw of rows){
    const name=raw.name||raw.characterName||raw.cardName||raw.title;
    if(!name)continue;
    const key=norm(name);
    const old=seen.get(key)||chars.find(c=>norm(c.name)===key);
    const rec=normalizeRecord(raw,s,old);
    if(!old)rec.id=stableId(chars.concat([...seen.values()]));
    const isNew=!old;
    if(isNew||JSON.stringify({...old,updated_at:undefined,source_checked:undefined})!==JSON.stringify({...rec,updated_at:undefined,source_checked:undefined})){
      await put(d,'characters',rec);seen.set(key,rec);if(isNew)chars.push(rec);
      changes.push({type:isNew?'ADD':'UPDATE',id:rec.id,name:rec.name,source:s.id});
    }
   }
  }catch(e){errors.push({source:s.id,error:String(e.message||e)})}
 }
 const meta={key:META_KEY,version:1,last_sync:now(),before_count:before,after_count:(await all(d,'characters')).length,changes,errors,sources};
 await put(d,'settings',meta);d.close();
 window.dispatchEvent(new CustomEvent('character-sync-complete',{detail:meta}));
 return meta;
}
function installUI(){
 const sec=document.querySelector('#characters .section-head');if(!sec||document.querySelector('#characterSyncButton'))return;
 const b=document.createElement('button');b.id='characterSyncButton';b.className='small primary';b.textContent='🔄同期';
 b.onclick=async()=>{b.disabled=true;b.textContent='同期中…';try{const r=await sync();alert(`キャラクター同期完了\\n${r.after_count}件 / 追加・更新 ${r.changes.length}件\\nエラー ${r.errors.length}件`);if(window.renderCharacters)window.renderCharacters()}catch(e){alert('同期失敗: '+e.message)}finally{b.disabled=false;b.textContent='🔄同期'}};
 sec.appendChild(b);
}
async function auto(){try{const d=await open(),m=await get(d,'settings',META_KEY);d.close();const age=m?.snapshot_generated_at?Date.now()-Date.parse(m.snapshot_generated_at):Infinity;if(age>6*60*60*1000)await loadLatestSnapshot()}catch(e){console.warn('character sync auto:',e.message)}}
window.GuildBattleCharacterSync={sync,loadLatestSnapshot,applySnapshot,getSources,auto};
document.addEventListener('DOMContentLoaded',()=>{installUI();auto()});setTimeout(installUI,1000);
})();
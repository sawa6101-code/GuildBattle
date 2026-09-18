/* GuildBattle Character Match Engine v1
   ① exact -> ② normalized -> ③ title -> ④ image feature candidate -> ⑤ confirm
*/
(function(){
'use strict';
const VERSION='1.0.0', DB='paranoise-guildbattle';
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s　]+/g,'').replace(/[（）]/g,'()').replace(/[・･]/g,'').toLowerCase();
const splitTitle=s=>{const m=String(s??'').match(/^(.+?)\s*[（(](.+?)[）)]\s*$/);return m?{base:norm(m[1]),title:norm(m[2])}:{base:norm(s),title:''}};
const lev=s=>{const x=splitTitle(s);return {base:x.base,title:x.title,full:norm(s)}};
function scoreName(a,b){const A=lev(a),B=lev(b);if(A.full===B.full)return 1;if(A.base===B.base&&A.title&&B.title&&A.title===B.title)return .98;if(A.base===B.base)return .9;if(A.title&&B.title&&A.title===B.title)return .78;return 0}
function editSim(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>Array(n+1).fill(0));for(let i=0;i<=m;i++)d[i][0]=i;for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return 1-d[m][n]/Math.max(m,n)}
function imageVector(data){return new Promise(resolve=>{if(!data)return resolve(null);const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),w=16,h=16;c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0,w,h);const p=x.getImageData(0,0,w,h).data,v=[];for(let i=0;i<p.length;i+=4){v.push(Math.round(p[i]/32),Math.round(p[i+1]/32),Math.round(p[i+2]/32),Math.round((.299*p[i]+.587*p[i+1]+.114*p[i+2])/32))}resolve(v)};im.onerror=()=>resolve(null);im.src=typeof data==='string'?data:''})}
function visualSim(a,b){if(!a||!b||a.length!==b.length)return 0;let e=0;for(let i=0;i<a.length;i++)e+=Math.abs(a[i]-b[i]);return 1-e/(a.length*31)}
async function allStore(db,n){return new Promise((res,rej)=>{const r=db.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function put(db,n,x){return new Promise((res,rej)=>{const r=db.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res(x);r.onerror=()=>rej(r.error)})}
async function match(name,opts={}){
 const chars=opts.characters||await allStore(opts.db||await new Promise((res,rej)=>{const r=indexedDB.open(DB,3);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}),'characters');
 const rows=chars.map(c=>{const ns=scoreName(name,c.name);const fuzzy=editSim(name,c.name);return {id:c.id,name:c.name,rarity:c.rarity,element:c.element,nameScore:ns,fuzzyScore:fuzzy,imageScore:null,stage:ns===1?'EXACT':ns>=.98?'NORMALIZED':ns>=.78?'TITLE':fuzzy>=.75?'FUZZY':'NONE',score:Math.max(ns,fuzzy*.82)}}).sort((a,b)=>b.score-a.score);
 const top=rows.slice(0,5);
 if(top[0]?.stage==='EXACT')return {status:'CONFIRMED',stage:1,character_id:top[0].id,candidates:top};
 if(top[0]?.stage==='NORMALIZED')return {status:'CONFIRMED',stage:2,character_id:top[0].id,candidates:top};
 if(top[0]?.stage==='TITLE'&&top[0].score>=.78)return {status:'CANDIDATE',stage:3,character_id:top[0].id,candidates:top};
 return {status:'UNMATCHED',stage:4,character_id:null,candidates:top};
}
async function confirm(partyCharacterId,characterId){
 const db=await new Promise((res,rej)=>{const r=indexedDB.open(DB,3);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
 const pcs=await allStore(db,'partyCharacters');const p=pcs.find(x=>x.id===partyCharacterId);if(!p)throw Error('partyCharactersが見つかりません');const c=await new Promise((res,rej)=>{const r=db.transaction('characters').objectStore('characters').get(characterId);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});if(!c)throw Error('キャラクターIDが見つかりません');p.character_id=c.id;p.character_name=c.name;p.match_status='CONFIRMED';p.match_stage=5;p.match_confidence=1;p.match_confirmed_at=new Date().toISOString();await put(db,'partyCharacters',p);return p}
async function verifyParty(partyId){
 const db=await new Promise((res,rej)=>{const r=indexedDB.open(DB,3);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
 const [pcs,chars]=await Promise.all([allStore(db,'partyCharacters'),allStore(db,'characters')]);const out=[];
 for(const p of pcs.filter(x=>x.party_id===partyId).sort((a,b)=>a.position-b.position)){const name=p.character_name_snapshot||p.character_name||chars.find(c=>c.id===p.character_id)?.name||'';const m=await match(name,{db,characters:chars});out.push({...p,recognized:name,match:m})}
 return out
}
function install(){
 const run=async()=>{
  const box=document.querySelector('#partyEditor');if(!box||box.querySelector('.match-panel'))return;
  const cards=[...box.querySelectorAll('.party')];const parties=await (async()=>{const db=await new Promise((res,rej)=>{const r=indexedDB.open(DB,3);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return allStore(db,'parties')})();
  cards.forEach(async card=>{const s=card.querySelector('summary');const txt=s?.textContent||'';const n=Number((txt.match(/(\\d+)/)||[])[1]);const p=parties.find(x=>x.member_id===window.__guildBattleCurrentMemberId&&Number(x.party_no)===n);if(!p)return;const panel=document.createElement('div');panel.className='match-panel card';panel.innerHTML='<h4>🧬 キャラクターID照合</h4><div class="match-status">照合中…</div><div class="match-rows"></div>';card.querySelector('.party-body')?.appendChild(panel);try{const rows=await verifyParty(p.id);const rs=panel.querySelector('.match-rows');let ok=0,cand=0,none=0;rs.innerHTML=rows.map(x=>{const m=x.match;if(m.status==='CONFIRMED')ok++;else if(m.status==='CANDIDATE')cand++;else none++;const icon=m.status==='CONFIRMED'?'🟢':m.status==='CANDIDATE'?'🟡':'🔴';const candText=(m.candidates||[]).slice(0,2).map(c=>c.id).join(' / ');return '<div class="match-row"><span>'+x.position+'</span><b>'+icon+'</b><span class="match-name">'+escSafe(x.recognized)+'</span><span class="match-id">'+(m.character_id||candText||'未照合')+'</span></div>'}).join('');panel.querySelector('.match-status').textContent='🟢 確定 '+ok+'　🟡 候補 '+cand+'　🔴 未照合 '+none+'　（5段階照合）'}catch(e){panel.querySelector('.match-status').textContent='照合エラー: '+e.message}});
 };
 setTimeout(run,150);
}
function escSafe(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]) )}
window.ParanoiseCharacterMatch={VERSION,norm,match,confirm,verifyParty,install};
document.addEventListener('DOMContentLoaded',install);
window.addEventListener('guildbattle-party-imported',install);
})();
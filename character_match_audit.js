/* GuildBattle Character ID verification dashboard */
(function(){
'use strict';
const DB='paranoise-guildbattle',VERSION=2;
function open(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,VERSION);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function all(d,n){return new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function audit(){
 const d=await open();const [pcs,chars,parties,members,guilds]=await Promise.all(['partyCharacters','characters','parties','members','guilds'].map(n=>all(d,n)));
 let exact=0,normalized=0,title=0,unmatched=0,empty=0;
 const rows=[];
 for(const p of pcs){
  const name=p.character_name_snapshot||p.character_name||chars.find(c=>c.id===p.character_id)?.name||'';
  if(!name){empty++;continue}
  const m=window.ParanoiseCharacterMatch?.match?await window.ParanoiseCharacterMatch.match(name,{db:d,characters:chars}):null;
  if(!m){unmatched++;continue}
  if(m.stage===1)exact++;else if(m.stage===2)normalized++;else if(m.stage===3)title++;else unmatched++;
  rows.push({p,m,name});
 }
 const partyById=new Map(parties.map(p=>[p.id,p])),memberById=new Map(members.map(m=>[m.id,m])),guildById=new Map(guilds.map(g=>[g.id,g]));
 const tbody=rows.filter(x=>x.m.status!=='CONFIRMED'||!x.p.character_id).slice(0,100).map(x=>{const p=partyById.get(x.p.party_id),m=memberById.get(p?.member_id),g=guildById.get(m?.guild_id);const icon=x.m.stage<=2?'🟢':x.m.stage===3?'🟡':'🔴';const ids=x.m.candidates.slice(0,2).map(c=>c.id).join(' / ');return '<tr><td>'+icon+'</td><td>'+esc(g?.name||'')+'</td><td>'+esc(m?.name||'')+'</td><td>PT'+(p?.party_no||'')+'-'+x.p.position+'</td><td>'+esc(x.name)+'</td><td>'+(x.m.character_id||ids||'未照合')+'</td></tr>'}).join('');
 d.close();
 return {total:pcs.length,exact,normalized,title,unmatched,empty,tbody};
}
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function install(){
 const settings=document.querySelector('#settings');if(!settings||document.querySelector('#matchAudit'))return;
 const box=document.createElement('div');box.id='matchAudit';box.className='card';box.innerHTML='<h3>🧬 キャラクターID照合状況</h3><p class="hint">全登録PTのキャラクターを、①完全一致→②正規化→③タイトル→④画像特徴候補→⑤確定の順で確認します。画像特徴はマスター画像が登録されている場合のみ使用します。</p><button class="wide primary" id="runMatchAudit">🔍 全850PTを照合</button><div id="matchAuditResult"></div>';settings.appendChild(box);
 document.querySelector('#runMatchAudit').onclick=async()=>{const out=document.querySelector('#matchAuditResult');out.innerHTML='照合中…';try{const r=await audit();out.innerHTML='<div class="stats-grid"><div><b>登録枠</b><br>'+r.total+'</div><div><b>🟢 確定</b><br>'+ (r.exact+r.normalized)+'</div><div><b>🟡 候補</b><br>'+r.title+'</div><div><b>🔴 未照合</b><br>'+ (r.unmatched+r.empty)+'</div></div>'+(r.tbody?'<h4>要確認（最大100件）</h4><div style="overflow:auto"><table><thead><tr><th></th><th>ギルド</th><th>プレイヤー</th><th>枠</th><th>認識名</th><th>候補ID</th></tr></thead><tbody>'+r.tbody+'</tbody></table></div>':'<p>要確認はありません。</p>')}catch(e){out.textContent='照合エラー: '+e.message}};
}
document.addEventListener('DOMContentLoaded',install);window.addEventListener('guildbattle-party-imported',install);
window.ParanoiseMatchAudit={audit};
})();
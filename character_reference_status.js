/* Character reference status dashboard */
(function(){
'use strict';
const DB='paranoise-guildbattle',V=4,$=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const openDB=()=>new Promise((ok,no)=>{const r=indexedDB.open(DB,V);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const all=(d,n)=>new Promise((ok,no)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
function splitName(name){const m=String(name||'').match(/^(.*?)[（(](.*)[）)]$/);return m?{base:m[1].trim(),type:m[2].trim()}:{base:String(name||''),type:'—'}}
function statusOf(c,refs){const count=refs.filter(x=>x.character_id===c.id&&x.verified!==false&&Array.isArray(x.features)).length;if(count>0)return ['🟢','画像参照あり',count];if(c.screenshot_confirmed===true)return ['🟡','スクショ確認済み・画像参照なし',0];return ['🔴','画像参照なし',0]}
function render(){const chars=window.__crsChars||[],refs=window.__crsRefs||[],q=String($('#crsSearch')?.value||'').trim().toLowerCase(),f=$('#crsFilter')?.value||'all';const rows=chars.map(c=>{const [icon,label,count]=statusOf(c,refs);return{c,icon,label,count,n:splitName(c.name)}}).filter(r=>f==='all'||(f==='green'&&r.icon==='🟢')||(f==='yellow'&&r.icon==='🟡')||(f==='red'&&r.icon==='🔴')).filter(r=>!q||[r.c.id,r.c.name,r.n.base,r.n.type,r.c.rarity].some(v=>String(v||'').toLowerCase().includes(q))).sort((a,b)=>a.c.id.localeCompare(b.c.id));const counts={green:0,yellow:0,red:0};chars.forEach(c=>{const x=statusOf(c,refs)[0];if(x==='🟢')counts.green++;else if(x==='🟡')counts.yellow++;else counts.red++});$('#crsSummary').innerHTML='<span>🟢 '+counts.green+'</span><span>🟡 '+counts.yellow+'</span><span>🔴 '+counts.red+'</span><b>合計 '+chars.length+'</b>';$('#crsCount').textContent=rows.length+'件表示';$('#crsRows').innerHTML=rows.length?rows.map(r=>'<tr><td>'+r.icon+'</td><td><code>'+esc(r.c.id)+'</code></td><td>'+esc(r.c.rarity||'—')+'</td><td>'+esc(r.n.base)+'</td><td>'+esc(r.n.type)+'</td><td>'+r.count+'</td><td>'+esc(r.label)+'</td></tr>').join(''):'<tr><td colspan="7" class="hint">該当するキャラクターはありません。</td></tr>'}
async function load(){const d=await openDB(),chars=await all(d,'characters'),refs=await all(d,'characterImages');d.close();window.__crsChars=chars;window.__crsRefs=refs;render()}
function install(){if(!$('#characterReferenceStatus'))return;$('#crsSearch').oninput=render;$('#crsFilter').onchange=render;$('#crsReload').onclick=()=>load().catch(e=>alert('画像参照状況の更新に失敗しました: '+e.message));load().catch(e=>console.error(e));window.CharacterReferenceStatus={load,render}}
document.addEventListener('DOMContentLoaded',install);
document.addEventListener('click',e=>{if(e.target.closest('[data-view="characterReferenceStatus"]'))setTimeout(()=>load().catch(console.error),0)});
})();

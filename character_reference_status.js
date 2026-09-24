/* Character reference status dashboard
   🟢 verified characterImages exists
   🟡 screenshot_confirmed but no verified image reference
   🔴 neither
*/
(function(){
'use strict';
const DB='paranoise-guildbattle', V=4;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const openDB=()=>new Promise((ok,no)=>{const r=indexedDB.open(DB,V);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const all=(d,n)=>new Promise((ok,no)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
function statusOf(c,refs){
 const count=refs.filter(x=>x.character_id===c.id&&x.verified!==false&&Array.isArray(x.features)).length;
 if(count>0)return ['🟢','画像参照あり',count];
 if(c.screenshot_confirmed===true)return ['🟡','スクショ確認済み・画像参照なし',0];
 return ['🔴','画像参照なし',0];
}
function splitName(name){
 const m=String(name||'').match(/^(.*?)[（(](.*)[）)]$/);
 return m?{base:m[1].trim(),type:m[2].trim()}: {base:String(name||''),type:'—'};
}
function render(){
 const wrap=$('#characterReferenceStatus'), chars=window.__crsChars||[], refs=window.__crsRefs||[];
 const q=String($('#crsSearch')?.value||'').trim().toLowerCase();
 const f=$('#crsFilter')?.value||'all';
 const rows=chars.map(c=>{const [icon,label,count]=statusOf(c,refs),n=splitName(c.name);return {c,icon,label,count,n}})
 .filter(r=>(f==='all'||(f==='green'&&r.icon==='🟢')||(f==='yellow'&&r.icon==='🟡')||(f==='red'&&r.icon==='🔴')))
 .filter(r=>!q||[r.c.id,r.c.name,r.n.base,r.n.type,r.c.rarity].some(v=>String(v||'').toLowerCase().includes(q)))
 .sort((a,b)=>a.icon.localeCompare(b.icon)||a.c.id.localeCompare(b.c.id));
 const counts={green:0,yellow:0,red:0};
 chars.forEach(c=>{const s=statusOf(c,refs)[0];if(s==='🟢')counts.green++;else if(s==='🟡')counts.yellow++;else counts.red++});
 $('#crsSummary').innerHTML='<span>🟢 '+counts.green+'</span><span>🟡 '+counts.yellow+'</span><span>🔴 '+counts.red+'</span><b>合計 '+chars.length+'</b>';
 $('#crsRows').innerHTML=rows.length?rows.map(r=>'<tr><td>'+r.icon+'</td><td><code>'+esc(r.c.id)+'</code></td><td>'+esc(r.c.rarity||'—')+'</td><td>'+esc(r.n.base)+'</td><td>'+esc(r.n.type)+'</td><td>'+r.count+'</td><td>'+esc(r.label)+'</td></tr>').join(''):'<tr><td colspan="7" class="hint">該当するキャラクターはありません。</td></tr>';
 $('#crsCount').textContent=rows.length+'件表示';
}
async function load(){
 const d=await openDB(),chars=await all(d,'characters'),refs=await all(d,'characterImages');d.close();
 window.__crsChars=chars;window.__crsRefs=refs;
 render();
}
function install(){
 if($('#characterReferenceStatus'))return;
 const sec=document.createElement('section');sec.id='characterReferenceStatus';sec.className='view';
 sec.innerHTML='<div class="section-head"><button class="back" data-view="dashboard">←</button><div><h2>🧬 画像参照状況</h2><p>全キャラクターのスクショ確認・画像参照を照合</p></div><button class="small" id="crsReload">↻</button></div>'+
 '<div class="card"><div class="notice"><b>判定基準</b><br>🟢 <b>画像参照あり</b>：characterImagesにverified画像あり<br>🟡 <b>スクショ確認済み・画像参照なし</b>：スクショ確認済みだがverified画像なし<br>🔴 <b>画像参照なし</b>：スクショ確認も画像参照もなし</div>'+
 '<div id="crsSummary" class="stats-grid"></div><div class="meta-grid"><label>検索<input id="crsSearch" type="search" placeholder="ID・名前・種別・レアリティ"></label><label>状態<select id="crsFilter"><option value="all">全て</option><option value="green">🟢 画像参照あり</option><option value="yellow">🟡 スクショ確認済み・画像参照なし</option><option value="red">🔴 画像参照なし</option></select></label></div><p id="crsCount" class="hint"></p></div>'+
 '<div class="card" style="overflow:auto"><table class="crs-table"><thead><tr><th>状態</th><th>ID</th><th>レア</th><th>キャラクター名</th><th>種別</th><th>画像参照数</th><th>判定</th></tr></thead><tbody id="crsRows"></tbody></table></div>';
 document.querySelector('main').appendChild(sec);
 const nav=document.querySelector('.bottom-nav');
 const b=document.createElement('button');b.dataset.view='characterReferenceStatus';b.innerHTML='🖼️<span>参照</span>';nav?.appendChild(b);
 $('#crsSearch').oninput=render;$('#crsFilter').onchange=render;$('#crsReload').onclick=()=>load().catch(console.error);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-view="characterReferenceStatus"]');if(!b)return;setTimeout(()=>load().catch(console.error),0)});
}
window.CharacterReferenceStatus={load,render};
document.addEventListener('DOMContentLoaded',install);
})();
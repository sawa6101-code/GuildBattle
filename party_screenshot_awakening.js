/* GuildBattle Party Screenshot Convex/Awakening Detector v1
   Screenshot -> 6 slot crop -> OCR character name -> character ID match
   -> awakening (凸) detection -> preview -> automatic PT update.
   Awakening is never guessed from the character master; it is read from the screenshot.
*/
(function(){
'use strict';
const DB='paranoise-guildbattle';
const VERSION='2.0.0';
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s　]+/g,'').toLowerCase();
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function all(db,n){return new Promise((res,rej)=>{const r=db.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(db,n,x){return new Promise((res,rej)=>{const r=db.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res(x);r.onerror=()=>rej(r.error)})}
function readImage(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error);fr.readAsDataURL(file)})}
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();let u=null;im.onload=()=>{if(u)URL.revokeObjectURL(u);res(im)};im.onerror=()=>{if(u)URL.revokeObjectURL(u);rej(new Error('画像を読み込めません'))};if(src instanceof Blob){u=URL.createObjectURL(src);im.src=u}else im.src=src})}
function cropData(im,x,y,w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));c.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);return c.toDataURL('image/jpeg',.88)}
function levenshtein(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;const d=Array.from({length:a.length+1},(_,i)=>i);for(let j=1;j<=b.length;j++){let prev=d[0];d[0]=j;for(let i=1;i<=a.length;i++){const old=d[i];d[i]=Math.min(d[i]+1,d[i-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}return 1-d[a.length]/Math.max(a.length,b.length)}
function imageFeature(data){
 return loadImg(data).then(im=>{
  const c=document.createElement('canvas'),w=16,h=16;c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);
  const p=c.getContext('2d').getImageData(0,0,w,h).data,v=[];for(let i=0;i<p.length;i+=4){v.push(Math.round(p[i]/32)/8,Math.round(p[i+1]/32)/8,Math.round(p[i+2]/32)/8)}return v;
 });
}
function featureSimilarity(a,b){if(!a||!b||a.length!==b.length)return 0;let d=0;for(let i=0;i<a.length;i++){const x=a[i]-b[i];d+=x*x}return Math.max(0,1-Math.sqrt(d/a.length)*2)}
async function imageCandidates(data,chars){
 const db=await openDB();let imgs=[];try{imgs=await all(db,'characterImages')}catch{}db.close();
 const q=await imageFeature(data),out=[];
 for(const im of imgs){
  if(!im.character_id||!im.blob)continue;
  try{const f=await imageFeature(im.blob);const s=featureSimilarity(q,f);if(s>0)out.push({id:im.character_id,score:s})}catch{}
 }
 const best={};for(const x of out)if(!best[x.id]||best[x.id].score<x.score)best[x.id]=x.score;
 return Object.entries(best).map(([id,score])=>{const c=chars.find(x=>x.id===id);return c?{...c,score}:null}).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,5);
}
function nameMatch(text,chars){
 const t=norm(text);
 return chars.map(c=>{const n=norm(c.name);const exact=t.includes(n)&&n.length>0?1:0;const fuzzy=levenshtein(t,c.name);const title=(c.name.match(/[（(]([^）)]+)[）)]/)||[])[1];const titleHit=title&&t.includes(norm(title))?.82:0;return {...c,score:Math.max(exact,fuzzy,titleHit)}}).sort((a,b)=>b.score-a.score).slice(0,5)
}
async function ocrText(data){
 if(!window.Tesseract){await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=res;s.onerror=()=>rej(new Error('OCRエンジンの読み込みに失敗しました'));document.head.appendChild(s)});}
 return Tesseract.recognize(data,'jpn+eng',{logger:()=>{}}).then(r=>r?.data?.text||'').catch(()=> '');
}
/* Detects explicit ★/☆ notation first. Then common Japanese UI labels such as 凸3, 覚醒3.
   A visual fallback counts separated bright star-like components in the lower part of a slot.
   The fallback is deliberately confidence-limited because card art can create false positives. */
function detectStarVisual(data){
 return loadImg(data).then(im=>{
  const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
  const c=document.createElement('canvas'),cw=Math.max(1,Math.round(w*.70)),ch=Math.max(1,Math.round(h*.22));
  c.width=cw;c.height=ch;c.getContext('2d').drawImage(im,Math.round(w*.15),Math.round(h*.70),cw,ch,0,0,cw,ch);
  const p=c.getContext('2d').getImageData(0,0,cw,ch).data,bins=[0,0,0,0,0];
  for(let i=0;i<p.length;i+=4){const r=p[i],g=p[i+1],b=p[i+2];if(r>165&&g>140&&b<150&&r+b<g*2.1){const x=((i/4)%cw)/cw;bins[Math.min(4,Math.floor(x*5))]++}}
  const threshold=Math.max(8,cw*ch*.004),active=bins.filter(v=>v>=threshold).length;
  if(active>=1&&active<=4)return {value:active,confidence:.82,source:'visual_star'};
  return {value:null,confidence:0,source:'visual_none'};
 })
}
function parseAwakeningText(text){
 const t=String(text||'').replace(/[☆✦✧]/g,'★');
 let m=t.match(/(?:凸|覚醒|限界突破|突破)\s*[:：]?\s*([0-4])/);
 if(m)return {value:Number(m[1]),confidence:.97,source:'ocr_label'};
 m=t.match(/★\s*([0-4])/);
 if(m)return {value:Number(m[1]),confidence:.94,source:'ocr_star_digit'};
 const stars=(t.match(/★/g)||[]).length;
 if(stars>=1&&stars<=4)return {value:stars,confidence:.78,source:'ocr_star_count'};
 return {value:null,confidence:0,source:'none'};
}
function visualAwakening(data){
 return loadImg(data).then(im=>{
  const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
  const c=document.createElement('canvas');const cw=Math.max(1,Math.round(w*.82)),ch=Math.max(1,Math.round(h*.24));
  c.width=cw;c.height=ch;c.getContext('2d').drawImage(im,Math.round(w*.09),Math.round(h*.70),cw,ch,0,0,cw,ch);
  const p=c.getContext('2d').getImageData(0,0,cw,ch).data;
  const pts=[];for(let i=0;i<p.length;i+=4){const r=p[i],g=p[i+1],b=p[i+2];if(r>180&&g>150&&b<180&&Math.max(r,g)-b>70)pts.push(i/4)}
  /* Gold/yellow UI pixels often form the awakening stars. Estimate 5 equal star zones. */
  if(pts.length<30)return {value:null,confidence:0,source:'visual_none'};
  const xs=pts.map(q=>q%cw);const bins=[0,0,0,0,0];
  xs.forEach(x=>{bins[Math.min(4,Math.floor(x/cw*5))]++});
  const active=bins.filter(v=>v>Math.max(5,pts.length*.025)).length;
  if(active>=1&&active<=4)return {value:active,confidence:.55,source:'visual_candidate'};
  return {value:null,confidence:0,source:'visual_none'};
 })
}
async function analyze(file,partyId){
 const db=await openDB();const chars=await all(db,'characters');const src=await readImage(file);const im=await loadImg(src);
 const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
 const wideSix=w/h>=2.2;const landscape=w/h>=1.2;const cols=wideSix?6:(landscape?3:2),rows=wideSix?1:(landscape?2:3),gapX=wideSix?.006:.012,gapY=wideSix?.018:.012;
 const out=[];
 for(let i=0;i<6;i++){
   const col=i%cols,row=Math.floor(i/cols);
   const x=w*(col/cols+gapX),y=h*(row/rows+gapY),cw=w*(1/cols-2*gapX),ch=h*(1/rows-2*gapY);
   const data=cropData(im,x,y,cw,ch);
   const text=await ocrText(data);
   const matches=nameMatch(text,chars);
   const visual=await imageCandidates(data,chars); const merged=[...matches,...visual].reduce((m,x)=>{const old=m.get(x.id);if(!old||x.score>old.score)m.set(x.id,x);return m},new Map()); const ranked=[...merged.values()].sort((a,b)=>b.score-a.score); const nm=ranked[0]||null; matches.splice(0,matches.length,...ranked.slice(0,5));
   const awText=parseAwakeningText(text);
   const aw=awText.value!==null?awText:(await visualAwakening(data)); const starVisual=aw.value===null?await detectStarVisual(data):aw;
   const visualTop=visual[0]?.score||0; const visualBoost=Math.min(.15,visualTop*.15); const confidence=nm?.score?Math.min(1,(nm.score+visualBoost)*(aw.confidence||.7)):0;
   out.push({position:i+1,crop:data,ocr:text,candidates:matches.slice(0,3),character_id:nm?.id||null,character_name:nm?.name||'',name_confidence:Math.min(1,(nm?.score||0)+visualBoost),visual_confidence:visualTop,awakening:starVisual.value,awakening_confidence:starVisual.confidence,awakening_source:starVisual.source,confidence});
 }
 return {version:VERSION,party_id:partyId,source_image:src,slots:out,created_at:new Date().toISOString()};
}
async function apply(result,manual={}){
 const db=await openDB();const pcs=await all(db,'partyCharacters');const chars=await all(db,'characters');
 let saved=0;
 for(const s of result.slots){
   const choice=manual[s.position]||{};const cid=choice.character_id||s.character_id;const aw=choice.awakening!==undefined?Number(choice.awakening):s.awakening;
   if(!cid)continue;
   let pc=pcs.find(x=>x.party_id===result.party_id&&Number(x.position)===s.position);
   if(!pc)pc={id:'pc_'+crypto.randomUUID(),party_id:result.party_id,position:s.position};
   pc.character_id=cid;pc.character_name=chars.find(c=>c.id===cid)?.name||s.character_name||'';pc.awakening=(Number.isFinite(aw)?Math.max(0,Math.min(4,aw)):0);pc.match_status=choice.character_id?'CONFIRMED':'SCREENSHOT_CONFIRMED';pc.match_stage=5;pc.match_confidence=Math.max(s.name_confidence||0,s.confidence||0);pc.awakening_confidence=choice.awakening!==undefined?1:(s.awakening_confidence||0);pc.awakening_source=choice.awakening!==undefined?'manual':s.awakening_source;pc.awakening_detected_at=new Date().toISOString();await put(db,'partyCharacters',pc);saved++;
 }
 return saved;
}
async function refreshTargetParties(){
 const box=document.querySelector('#partyShotAwake');
 const sel=document.querySelector('#psaParty');
 const memberId=window.__guildBattleCurrentMemberId;
 if(!box||!sel||!memberId)return;
 try{
  const db=await openDB();
  let ps=(await all(db,'parties')).filter(p=>String(p.member_id??p.memberId)===String(memberId)).sort((a,b)=>Number(a.party_no??a.partyNo)-Number(b.party_no??b.partyNo));
  if(ps.length<2){
   const member=(await all(db,'members')).find(m=>String(m.id)===String(memberId));
   if(member){
    for(let n=1;n<=2;n++){
     if(!ps.some(p=>Number(p.party_no??p.partyNo)===n)){
      const p={id:'party_'+crypto.randomUUID(),member_id:member.id,party_no:n,name:'PT'+n,total_power:0,hp_current:0,hp_max:0,fatigue_value:0,fatigue_multiplier:1,battle_count:0,win_count:0,loss_count:0,draw_count:0,active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      await put(db,'parties',p); ps.push(p);
     }
    }
    ps.sort((a,b)=>Number(a.party_no??a.partyNo)-Number(b.party_no??b.partyNo));
   }
  }
  const old=sel.value;
  sel.innerHTML=ps.map(p=>'<option value="'+esc(p.id)+'">PT'+p.party_no+(p.name?' ・ '+esc(p.name):'')+'</option>').join('');
  if(old&&ps.some(p=>p.id===old))sel.value=old;
  if(!ps.length)sel.innerHTML='<option value="">PTが登録されていません</option>';
 }catch(e){console.error('PT selector refresh error',e);sel.innerHTML='<option value="">PT取得エラー</option>';}
}
function install(){
 const host=document.querySelector('#memberDetail');if(!host)return;
 const existing=host.querySelector('#partyShotAwake');
 if(existing){refreshTargetParties();return;}
 const box=document.createElement('div');box.id='partyShotAwake';box.className='card';box.innerHTML='<h3>📷 PTスクショ → 6枠＋現在の凸数を自動設定</h3><p class="hint">PT編成画面のスクショを1枚添付すると、6枠のキャラクターIDと★0～★4（凸数）をOCR＋画像解析します。高信頼の結果はそのまま反映し、低信頼だけ確認できます。</p><label>対象PT<select id="psaParty"></select></label><input id="psaFile" type="file" accept="image/*"><button type="button" class="wide primary" id="psaAnalyze">🔍 6枠＋凸数を自動認識</button><div id="psaStatus" class="hint"></div><div id="psaResults"></div>';
 host.prepend(box);
 refreshTargetParties();
 $('#psaAnalyze').onclick=async()=>{const f=$('#psaFile')?.files?.[0],pid=$('#psaParty')?.value;if(!f||!pid)return alert('対象PTとスクショを指定してください。');$('#psaStatus').textContent='解析中…（OCR＋6枠照合＋凸数認識）';try{const r=await analyze(f,pid);window.__partyScreenshotAwakeningLast=r;const auto={};let autoCount=0;r.slots.forEach(s=>{if(s.character_id&&s.name_confidence>=.9&&s.awakening!==null&&s.awakening_confidence>=.9){auto[s.position]={character_id:s.character_id,awakening:s.awakening};autoCount++}});if(autoCount)await apply(r,auto);renderResult(r);$('#psaStatus').textContent='解析完了。🟢高信頼 '+autoCount+'枠は自動反映済み。🟡/🔴は下の結果を確認して確定してください。'}catch(e){console.error(e);$('#psaStatus').textContent='解析エラー: '+e.message}};
};
function renderResult(r){
 const box=$('#psaResults');if(!box)return;
 box.innerHTML='<h4>認識結果</h4>'+r.slots.map(s=>{
  const icon=s.name_confidence>=.9&&s.awakening_confidence>=.9?'🟢':s.name_confidence>=.75?'🟡':'🔴';
  const opts=(s.candidates||[]).map(c=>'<option value="'+esc(c.id)+'" '+(c.id===s.character_id?'selected':'')+'>'+esc(c.name)+' ['+esc(c.id)+']</option>').join('');
  return '<div class="card" data-psa-pos="'+s.position+'"><b>'+icon+' 枠'+s.position+'</b><div>OCR: '+esc((s.ocr||'').slice(0,100))+'</div><label>キャラクター<select class="psaChar">'+opts+'</select></label><label>現在の凸<select class="psaAw">'+[0,1,2,3,4].map(n=>'<option value="'+n+'" '+(s.awakening===n?'selected':'')+'>★'+n+'</option>').join('')+'</select></label><small>キャラ信頼度 '+Math.round(s.name_confidence*100)+'% / 凸認識 '+(s.awakening===null?'未認識':Math.round(s.awakening_confidence*100)+'%')+' / '+esc(s.awakening_source)+'</small></div>'
 }).join('')+'<button type="button" class="wide primary" id="psaApply">✅ この6枠をPTへ確定</button>';
 $('#psaApply').onclick=async()=>{const manual={};box.querySelectorAll('[data-psa-pos]').forEach(el=>{manual[Number(el.dataset.psaPos)]={character_id:el.querySelector('.psaChar')?.value||null,awakening:Number(el.querySelector('.psaAw')?.value||0)}});try{const n=await apply(r,manual);alert(n+'枠をPTへ反映しました。');if(typeof openMember==='function')openMember(window.__guildBattleCurrentMemberId,window.memberReturnView||'own')}catch(e){alert('反映に失敗しました: '+e.message)}};
}
window.ParanoisePartyScreenshotAwakening={VERSION,analyze,apply,refreshTargetParties};
document.addEventListener('DOMContentLoaded',()=>setTimeout(install,300));
new MutationObserver(()=>setTimeout(install,50)).observe(document.body,{childList:true,subtree:true});
})();
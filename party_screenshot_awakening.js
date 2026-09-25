/* GuildBattle Party Screenshot Convex/Awakening Detector v2
   Screenshot -> 6 slot crop -> OCR + verified character-image reference matching
   -> soft rarity/element evidence -> candidate -> preview -> PT update.
   Important: rarity/element detection NEVER removes characters from the image/OCR search pool.
*/
(function(){
'use strict';
const DB='paranoize-guildbattle';
const VERSION='4.2.0';
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s　]+/g,'').replace(/[・･]/g,'').toLowerCase();
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,4);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function all(db,n){return new Promise((res,rej)=>{const r=db.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(db,n,x){return new Promise((res,rej)=>{const r=db.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res(x);r.onerror=()=>rej(r.error)})}
function readImage(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error);fr.readAsDataURL(file)})}
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();let u=null;im.onload=()=>{if(u)URL.revokeObjectURL(u);res(im)};im.onerror=()=>{if(u)URL.revokeObjectURL(u);rej(new Error('画像を読み込めません'))};if(src instanceof Blob){u=URL.createObjectURL(src);im.src=u}else im.src=src})}
function cropData(im,x,y,w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));c.getContext('2d').drawImage(im,x,y,w,h,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.88)}
function levenshtein(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;const d=Array.from({length:a.length+1},(_,i)=>i);for(let j=1;j<=b.length;j++){let prev=d[0];d[0]=j;for(let i=1;i<=a.length;i++){const old=d[i];d[i]=Math.min(d[i]+1,d[i-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}return 1-d[a.length]/Math.max(a.length,b.length)}
function imageFeature(data){
 return loadImg(data).then(im=>{
  const c=document.createElement('canvas'),w=32,h=32;c.width=w;c.height=h;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,w,h);
  const p=ctx.getImageData(0,0,w,h).data,v=[];
  for(let i=0;i<p.length;i+=4)v.push(Math.round(p[i]/16),Math.round(p[i+1]/16),Math.round(p[i+2]/16));
  return v;
 });
}
function featureSimilarity(a,b){
 if(!a||!b||a.length!==b.length)return 0;
 let e=0;for(let i=0;i<a.length;i++)e+=Math.abs(a[i]-b[i]);
 return Math.max(0,1-e/(a.length*15));
}
function normalizeRarity(v){
 const t=String(v||'').toUpperCase().replace(/Ｓ/g,'S').replace(/Ｒ/g,'R');
 if(/SSR/.test(t))return 'SSR';if(/(^|[^S])SR([^R]|$)/.test(t))return 'SR';if(/(^|[^S])R([^R]|$)/.test(t))return 'R';return '';
}
async function detectRarity(data){
 const t=(await ocrText(data)).toUpperCase().replace(/\s/g,'');const r=normalizeRarity(t);
 if(r)return {value:r,confidence:.98,source:'ocr_rarity'};
 const im=await loadImg(data),w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
 const c=document.createElement('canvas'),cw=Math.round(w*.42),ch=Math.round(h*.24);c.width=cw;c.height=ch;
 c.getContext('2d').drawImage(im,0,0,cw,ch,0,0,cw,ch);
 const rr=normalizeRarity(await ocrText(c.toDataURL('image/png')));
 return rr?{value:rr,confidence:.92,source:'ocr_rarity_crop'}:{value:'',confidence:0,source:'rarity_unknown'};
}
async function detectElement(data){
 const im=await loadImg(data),w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
 const regs=[[.18,.05,.28,.20],[.22,.04,.20,.24],[.12,.02,.40,.30]],score={光:0,闇:0,風:0};
 for(const q of regs){
  const cc=document.createElement('canvas'),cw=Math.max(1,Math.round(w*q[2])),ch=Math.max(1,Math.round(h*q[3]));
  cc.width=cw;cc.height=ch;cc.getContext('2d').drawImage(im,w*q[0],h*q[1],w*q[2],h*q[3],0,0,cw,ch);
  const p=cc.getContext('2d').getImageData(0,0,cw,ch).data;
  for(let i=0;i<p.length;i+=4){
   const r=p[i],g=p[i+1],b=p[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(mx<55||d<30)continue;
   let hue=0,delta=d/255,rr=r/255,gg=g/255,bb=b/255,mxN=mx/255;
   if(delta){if(mxN===rr)hue=60*(((gg-bb)/delta)%6);else if(mxN===gg)hue=60*((bb-rr)/delta+2);else hue=60*((rr-gg)/delta+4);if(hue<0)hue+=360}
   if(hue>=35&&hue<75&&r>120&&g>90)score.光++;
   else if(hue>=245&&hue<=335&&b>70)score.闇++;
   else if(hue>=75&&hue<170&&g>70)score.風++;
  }
 }
 const z=Object.entries(score).sort((x,y)=>y[1]-x[1]);
 return z[0]&&z[0][1]>0?{value:z[0][0],confidence:Math.min(.98,z[0][1]/Math.max(1,z[1]?.[1]||1)*.72),source:'visual_element'}:{value:'',confidence:0,source:'element_unknown'};
}
async function imageCandidates(data,chars,candidateIds){
 const db=await openDB();let imgs=[];try{imgs=await all(db,'characterImages')}catch{}db.close();
 const allowed=candidateIds?new Set(candidateIds):null,q=await imageFeature(data),out=[];
 for(const im of imgs){
  if(im.verified===false||!im.character_id||!im.blob||(allowed&&!allowed.has(im.character_id)))continue;
  try{
   let s=0;
   if(Array.isArray(im.features)&&im.features.length){
    for(const ref of im.features){
     const v=Array.isArray(ref)?ref:ref?.vector;
     if(v) s=Math.max(s,featureSimilarity(q,v));
    }
   }
   if(s<=0&&im.blob){const f=await imageFeature(im.blob);s=featureSimilarity(q,f)}
   if(s>0)out.push({id:im.character_id,score:s,reference_id:im.id,reference_name:im.reference_name||'',reference_title:im.reference_title||''});
  }catch{}
 }
 const best={};for(const x of out)if(!best[x.id]||best[x.id].score<x.score)best[x.id]=x;
 return Object.values(best).map(x=>{const c=chars.find(v=>v.id===x.id);return c?{...c,score:x.score,reference_id:x.reference_id,reference_name:x.reference_name,reference_title:x.reference_title}:null}).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,12);
}
function characterParts(c){
 const m=String(c.name||'').match(/^(.*?)[（(](.*)[）)]$/);
 return {base:norm(m?m[1]:c.name),title:norm(m?m[2]:(c.title||'')),full:norm(c.name)};
}
function nameMatch(text,chars){
 const raw=norm(text);
 return chars.map(c=>{
  const p=characterParts(c);
  const exact=raw.includes(p.full)&&p.full.length>0?1:0;
  const base=(raw.includes(p.base)&&p.base.length>=2)?0.94:0;
  const title=(raw.includes(p.title)&&p.title.length>=3)?0.92:0;
  const fuzzy=Math.max(levenshtein(raw,c.name),p.base?levenshtein(raw,p.base):0,p.title?levenshtein(raw,p.title):0);
  return {...c,score:Math.max(exact,base,title,fuzzy)};
 }).sort((a,b)=>b.score-a.score).slice(0,12);
}
function combineCandidates(chars,names,visual,rarity,element){
 const map=new Map();
 const putCand=(c,sourceScore,source)=>{
  const old=map.get(c.id);
  const row=old||{...c,id:c.id,name:c.name,rarity:c.rarity,element:c.element,name_score:0,image_score:0,reference_id:null,reference_count:0,sources:[]};
  if(source==='ocr')row.name_score=Math.max(row.name_score,sourceScore);
  if(source==='image'){row.image_score=Math.max(row.image_score,sourceScore);row.reference_id=c.reference_id||row.reference_id;row.reference_count=(c.reference_count||0);}
  row.sources=[...new Set([...(row.sources||[]),source])];
  map.set(c.id,row);
 };
 names.forEach(c=>putCand(c,c.score,'ocr'));
 visual.forEach(c=>putCand(c,c.score,'image'));
 const rows=[...map.values()].map(r=>{
  const rarityMatch=rarity.value&&normalizeRarity(r.rarity)===rarity.value;
  const elementMatch=element.value&&String(r.element||'')===element.value;
  const metaBonus=(rarityMatch?.025:0)+(elementMatch?.025:0);
  const imageBase=r.image_score>0?r.image_score*.96:0;
  const base=Math.max(r.name_score,imageBase);
  return {...r,rarity_match:!!rarityMatch,element_match:!!elementMatch,score:Math.min(1,base+metaBonus)};
 }).sort((a,b)=>b.score-a.score||b.image_score-a.image_score||b.name_score-a.name_score);
 return rows;
}
async function ocrText(data){
 if(!window.Tesseract){await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=res;s.onerror=()=>rej(new Error('OCRエンジンの読み込みに失敗しました'));document.head.appendChild(s)})}
 return Tesseract.recognize(data,'jpn+eng',{logger:()=>{}}).then(r=>r?.data?.text||'').catch(()=> '');
}
function detectStarVisual(data){
 return loadImg(data).then(im=>{
  const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,c=document.createElement('canvas'),cw=Math.max(1,Math.round(w*.70)),ch=Math.max(1,Math.round(h*.22));
  c.width=cw;c.height=ch;c.getContext('2d').drawImage(im,Math.round(w*.15),Math.round(h*.70),cw,ch,0,0,cw,ch);
  const p=c.getContext('2d').getImageData(0,0,cw,ch).data,bins=[0,0,0,0,0];
  for(let i=0;i<p.length;i+=4){const r=p[i],g=p[i+1],b=p[i+2];if(r>165&&g>140&&b<150&&r+b<g*2.1){const x=((i/4)%cw)/cw;bins[Math.min(4,Math.floor(x*5))]++}}
  const threshold=Math.max(8,cw*ch*.004),active=bins.filter(v=>v>=threshold).length;
  return active>=1&&active<=4?{value:active,confidence:.82,source:'visual_star'}:{value:null,confidence:0,source:'visual_none'};
 })
}
function parseAwakeningText(text){
 const t=String(text||'').replace(/[☆✦✧]/g,'★');let m=t.match(/(?:凸|覚醒|限界突破|突破)\s*[:：]?\s*([0-4])/);
 if(m)return {value:Number(m[1]),confidence:.97,source:'ocr_label'};
 m=t.match(/★\s*([0-4])/);if(m)return {value:Number(m[1]),confidence:.94,source:'ocr_star_digit'};
 const stars=(t.match(/★/g)||[]).length;if(stars>=1&&stars<=4)return {value:stars,confidence:.78,source:'ocr_star_count'};
 return {value:null,confidence:0,source:'none'};
}
function visualAwakening(data){
 return loadImg(data).then(im=>{
  const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,c=document.createElement('canvas'),cw=Math.max(1,Math.round(w*.82)),ch=Math.max(1,Math.round(h*.24));
  c.width=cw;c.height=ch;c.getContext('2d').drawImage(im,Math.round(w*.09),Math.round(h*.70),cw,ch,0,0,cw,ch);
  const p=c.getContext('2d').getImageData(0,0,cw,ch).data,pts=[];
  for(let i=0;i<p.length;i+=4){const r=p[i],g=p[i+1],b=p[i+2];if(r>180&&g>150&&b<180&&Math.max(r,g)-b>70)pts.push(i/4)}
  if(pts.length<30)return {value:null,confidence:0,source:'visual_none'};
  const xs=pts.map(q=>q%cw),bins=[0,0,0,0,0];xs.forEach(x=>bins[Math.min(4,Math.floor(x/cw*5))]++);
  const active=bins.filter(v=>v>Math.max(5,pts.length*.025)).length;
  return active>=1&&active<=4?{value:active,confidence:.55,source:'visual_candidate'}:{value:null,confidence:0,source:'visual_none'};
 })
}
async function ocrFullImage(data){
 if(!window.Tesseract){await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=res;s.onerror=()=>rej(new Error('OCRエンジンの読み込みに失敗しました'));document.head.appendChild(s)})}
 try{const r=await Tesseract.recognize(data,'jpn+eng',{logger:()=>{}});return {text:r?.data?.text||'',words:r?.data?.words||[]}}catch{return {text:'',words:[]}}
}
function slotBoxes(w,h){
 const ratio=w/h;
 if(ratio>=2.2)return Array.from({length:6},(_,i)=>({x:w*i/6,y:0,w:w/6,h:h}));
 if(ratio>=1.2)return Array.from({length:6},(_,i)=>{const col=i%3,row=Math.floor(i/3);return{x:w*col/3,y:h*row/2,w:w/3,h:h/2}});
 return Array.from({length:6},(_,i)=>{const col=i%2,row=Math.floor(i/2);return{x:w*col/2,y:h*row/3,w:w/2,h:h/3}});
}
function cropWithMargin(im,b,m=.018){
 const x=Math.max(0,b.x-b.w*m),y=Math.max(0,b.y-b.h*m),x2=Math.min(im.width,b.x+b.w*(1+m)),y2=Math.min(im.height,b.y+b.h*(1+m));
 return cropData(im,x,y,x2-x,y2-y);
}
async function analyze(file,partyId){
 const db=await openDB(),chars=await all(db,'characters');db.close();
 const src=await readImage(file),im=await loadImg(src),w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,full=await ocrFullImage(src),boxes=slotBoxes(w,h),out=[];
 for(let i=0;i<6;i++){
  const b=boxes[i],data=cropWithMargin(im,b,.012),rarity=await detectRarity(data),element=await detectElement(data);
  // 重要：レアリティ/属性は「補助証拠」。ここで候補を削除しない。
  // 以前はここで候補母集団を絞っていたため、属性/レアリティ誤認時に
  // 正しいキャラクター画像参照そのものが検索対象から消えていた。
  const visual=await imageCandidates(data,chars);
  const nameRegions=[
   cropData(im,b.x+b.w*.02,b.y+b.h*.02,b.w*.96,b.h*.96),
   cropData(im,b.x+b.w*.08,b.y+b.h*.05,b.w*.84,b.h*.78)
  ];
  let text='';for(const nr of nameRegions){const t=await ocrText(nr);if(t)text+='\n'+t}
  const matches=nameMatch(text,chars),ranked=combineCandidates(chars,matches,visual,rarity,element);
  const top=ranked[0]||null,second=ranked[1]||null;
  const margin=(top?.score||0)-(second?.score||0);
  const visualAuto=!!top&&top.image_score>=.86&&top.reference_count>0&&margin>=.045;
  const exactOcr=!!top&&top.name_score>=.98&&margin>=.08;
  const nm=top;
  const awText=parseAwakeningText(text),aw=awText.value!==null?awText:(await visualAwakening(data)),starVisual=aw.value===null?await detectStarVisual(data):aw;
  const nameConf=nm?.score||0;
  out.push({
   position:i+1,crop:data,ocr:text,full_ocr:full.text,
   rarity:rarity.value,rarity_confidence:rarity.confidence,rarity_source:rarity.source,
   element:element.value,element_confidence:element.confidence,element_source:element.source,
   candidate_count:chars.length,candidates:ranked.slice(0,8),character_id:nm?.id||null,character_name:nm?.name||'',
   image_reference_id:nm?.reference_id||null,image_match_auto:!!visualAuto,
   name_confidence:Math.min(1,nameConf),visual_confidence:top?.image_score||0,
   match_margin:margin,match_sources:top?.sources||[],rarity_match:!!top?.rarity_match,element_match:!!top?.element_match,
   awakening:starVisual.value,awakening_confidence:starVisual.confidence,awakening_source:starVisual.source,
   confidence:Math.min(1,nameConf*(starVisual.confidence||.7))
  });
 }
 return {version:VERSION,party_id:partyId,source_image:src,full_ocr:full.text,slots:out,layout:{width:w,height:h,boxes},created_at:new Date().toISOString()};
}
async function apply(result,manual={}){
 const db=await openDB(),pcs=await all(db,'partyCharacters'),chars=await all(db,'characters');let saved=0;
 for(const s of result.slots){
  const choice=manual[s.position]||{},cid=choice.character_id||s.character_id;if(!cid)continue;
  let pc=pcs.find(x=>x.party_id===result.party_id&&Number(x.position)===s.position);if(!pc)pc={id:'pc_'+crypto.randomUUID(),party_id:result.party_id,position:s.position};
  const aw=choice.awakening!==undefined?Number(choice.awakening):s.awakening,preservedAwakening=Number.isFinite(pc.awakening)?Number(pc.awakening):0;
  pc.character_id=cid;pc.character_name=chars.find(c=>c.id===cid)?.name||s.character_name||'';
  pc.awakening=Number.isFinite(aw)?Math.max(0,Math.min(4,aw)):preservedAwakening;
  pc.match_status=choice.character_id?'CONFIRMED':'SCREENSHOT_CONFIRMED';pc.match_stage=5;
  pc.match_confidence=Math.max(s.name_confidence||0,s.confidence||0);pc.awakening_confidence=choice.awakening!==undefined?1:(s.awakening_confidence||0);
  pc.awakening_source=choice.awakening!==undefined?'manual':s.awakening_source;pc.awakening_detected_at=new Date().toISOString();await put(db,'partyCharacters',pc);saved++;
 }
 db.close();return saved;
}
async function refreshTargetParties(){
 const box=document.querySelector('#partyShotAwake'),sel=document.querySelector('#psaParty'),memberId=window.__guildBattleCurrentMemberId;if(!box||!sel||!memberId)return;
 try{
  const db=await openDB();let ps=(await all(db,'parties')).filter(p=>String(p.member_id??p.memberId)===String(memberId)).sort((a,b)=>Number(a.party_no??a.partyNo)-Number(b.party_no??b.partyNo));
  if(ps.length<2){
   const member=(await all(db,'members')).find(m=>String(m.id)===String(memberId));
   if(member)for(let n=1;n<=2;n++)if(!ps.some(p=>Number(p.party_no??p.partyNo)===n)){const p={id:'party_'+crypto.randomUUID(),member_id:member.id,party_no:n,name:'PT'+n,total_power:0,hp_current:0,hp_max:0,fatigue_value:0,fatigue_multiplier:1,battle_count:0,win_count:0,loss_count:0,draw_count:0,active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};await put(db,'parties',p);ps.push(p)}
   ps.sort((a,b)=>Number(a.party_no??a.partyNo)-Number(b.party_no??b.partyNo));
  }
  db.close();const old=sel.value;sel.innerHTML=ps.map(p=>'<option value="'+esc(p.id)+'">PT'+p.party_no+(p.name?' ・ '+esc(p.name):'')+'</option>').join('');
  if(old&&ps.some(p=>p.id===old))sel.value=old;if(!ps.length)sel.innerHTML='<option value="">PTが登録されていません</option>';
 }catch(e){console.error('PT selector refresh error',e);sel.innerHTML='<option value="">PT取得エラー</option>'}
}
function install(){
 const host=document.querySelector('#memberDetail');if(!host)return;const existing=host.querySelector('#partyShotAwake');if(existing){refreshTargetParties();return}
 const box=document.createElement('div');box.id='partyShotAwake';box.className='card';
 box.innerHTML='<h3>📷 PTスクショ → 6枠＋現在の凸数を自動設定</h3><p class="hint">登録済みの🟢画像参照を最優先で検索し、OCR・レアリティ・属性は補助証拠として統合します。レアリティ/属性の誤認で正解候補が消えることはありません。</p><label>対象PT<select id="psaParty"></select></label><input id="psaFile" type="file" accept="image/*"><button type="button" class="wide primary" id="psaAnalyze">🔍 6枠＋凸数を自動認識</button><div id="psaStatus" class="hint"></div><div id="psaResults"></div>';
 host.prepend(box);refreshTargetParties();
 $('#psaAnalyze').onclick=async()=>{
  const f=$('#psaFile')?.files?.[0],pid=$('#psaParty')?.value;if(!f||!pid)return alert('対象PTとスクショを指定してください。');
  $('#psaStatus').textContent='解析中…（6枠画像参照＋OCR＋レアリティ/属性補助）';
  try{
   const r=await analyze(f,pid);window.__partyScreenshotAwakeningLast=r;const auto={};let autoCount=0;
   r.slots.forEach(s=>{if(s.character_id&&s.name_confidence>=.9){auto[s.position]={character_id:s.character_id};if(s.awakening!==null&&s.awakening_confidence>=.9)auto[s.position].awakening=s.awakening;autoCount++}});
   if(autoCount)await apply(r,auto);renderResult(r);
   $('#psaStatus').textContent='解析完了。🟢高信頼 '+autoCount+'枠は自動反映済み。🟡/🔴は結果を確認してください。';
  }catch(e){console.error(e);$('#psaStatus').textContent='解析エラー: '+e.message}
 };
}
function renderResult(r){
 const box=$('#psaResults');if(!box)return;
 box.innerHTML='<h4>認識結果</h4>'+r.slots.map(s=>{
  const icon=s.name_confidence>=.9?'🟢':s.name_confidence>=.7?'🟡':'🔴';
  const opts=(s.candidates||[]).map(c=>'<option value="'+esc(c.id)+'" '+(c.id===s.character_id?'selected':'')+'>'+esc(c.name)+' ['+esc(c.id)+']</option>').join('');
  const evidence=(s.match_sources||[]).join('+')||'none';
  return '<div class="card" data-psa-pos="'+s.position+'"><b>'+icon+' 枠'+s.position+'</b><div>候補母集団: '+s.candidate_count+'体 / OCR '+Math.round(s.candidates?.[0]?.name_score*100||0)+'% / 画像 '+Math.round(s.visual_confidence*100)+'% / 差 '+Math.round(s.match_margin*100)+'pt</div><div>レアリティ: '+esc(s.rarity||'未判定')+' '+(s.rarity_match?'✓':'')+' / 属性: '+esc(s.element||'未判定')+' '+(s.element_match?'✓':'')+'</div><div>照合根拠: '+esc(evidence)+(s.image_reference_id?' / 🟢画像参照あり':' / 画像参照なし')+'</div><div>枠OCR: '+esc((s.ocr||'').slice(0,100))+'</div><label>キャラクター<select class="psaChar">'+opts+'</select></label><label>現在の凸<select class="psaAw">'+[0,1,2,3,4].map(n=>'<option value="'+n+'" '+(s.awakening===n?'selected':'')+'>★'+n+'</option>').join('')+'</select></label><small>キャラ信頼度 '+Math.round(s.name_confidence*100)+'% / 凸認識 '+(s.awakening===null?'未認識':Math.round(s.awakening_confidence*100)+'%')+' / '+esc(s.awakening_source)+'</small></div>'
 }).join('')+'<button type="button" class="wide primary" id="psaApply">✅ この6枠をPTへ確定</button>';
 $('#psaApply').onclick=async()=>{
  const manual={};box.querySelectorAll('[data-psa-pos]').forEach(el=>{manual[Number(el.dataset.psaPos)]={character_id:el.querySelector('.psaChar')?.value||null,awakening:Number(el.querySelector('.psaAw')?.value||0)}});
  try{const n=await apply(r,manual);alert(n+'枠をPTへ反映しました。');if(typeof openMember==='function')openMember(window.__guildBattleCurrentMemberId,window.memberReturnView||'own')}catch(e){alert('反映に失敗しました: '+e.message)}
 };
}
window.ParanoizePartyScreenshotAwakening={VERSION,analyze,apply,refreshTargetParties};
window.ParanoisePartyScreenshotAwakening=window.ParanoizePartyScreenshotAwakening;
document.addEventListener('DOMContentLoaded',()=>setTimeout(install,300));
new MutationObserver(()=>setTimeout(install,50)).observe(document.body,{childList:true,subtree:true});
})();

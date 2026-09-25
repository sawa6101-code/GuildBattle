/* GuildBattle - Full Character Detail Screenshot Registration v2 */
(function(){
'use strict';
const DB='paranoise-guildbattle',V=4;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s　・･「」『』()（）［］【】]/g,'').toLowerCase();
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,V);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function all(d,n){return new Promise((ok,no)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function put(d,n,x){return new Promise((ok,no)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>ok(x);r.onerror=()=>no(r.error)})}
function fileData(f){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)})}
function loadImg(src){return new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(new Error('画像を読み込めません'));im.src=src})}
function cropData(im,x,y,w,h,type='image/jpeg',quality=.9){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));c.getContext('2d').drawImage(im,x,y,w,h,0,0,c.width,c.height);return c.toDataURL(type,quality)}
async function ensureOCR(){if(window.Tesseract)return;const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';document.head.appendChild(s);await new Promise((ok,no)=>{s.onload=ok;s.onerror=no})}
async function ocr(src){await ensureOCR();try{const r=await Tesseract.recognize(src,'jpn+eng');return r.data?.text||''}catch{return ''}}
const lines=t=>String(t).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
function cleanLine(s){return String(s??'').replace(/^[\s\-・●◆▶•]+/,'').trim()}
function normalizeRarity(t){
 const x=String(t??'').toUpperCase().replace(/[Ｓｓ]/g,'S').replace(/Ｒ/g,'R').replace(/[\s　・･._-]/g,'');
 if(/SSR/.test(x))return 'SSR';
 if(/SR/.test(x))return 'SR';
 if(/^R+$/.test(x)||/(^|[^A-Z])R$/.test(x))return 'R';
 return '';
}
function findRarity(t){return normalizeRarity(t)}
function findElement(t){
 const x=String(t??'');
 if(/風/.test(x))return '風';
 if(/光/.test(x))return '光';
 if(/闇/.test(x))return '闇';
 return '';
}
function findRole(t){const x=String(t);return ['特殊アタッカー','物理アタッカー','ヒーラー','タンク','サポーター','特殊型','アタッカー'].find(k=>x.includes(k))||''}
function findMaxMP(t){const m=String(t).match(/(?:最大\s*)?MP\s*([0-9]+)/i);return m?Number(m[1]):0}
function findLevel(t){const m=String(t).match(/Lv\.?\s*([0-9]+)/i);return m?Number(m[1]):0}
function findPower(t){const m=String(t).match(/([0-9][0-9,]{5,})/);return m?Number(m[1].replace(/,/g,'')):0}
function splitNameTitle(header,chars){
 const ls=lines(header);
 for(const l of ls){const h=chars.find(c=>norm(c.name)===norm(l));if(h)return {name:l,title:'',existing:h}}
 let name='',title='';
 for(let i=0;i<ls.length-1;i++){const a=cleanLine(ls[i]),b=cleanLine(ls[i+1]);if(/[一-龯ぁ-んァ-ヶ]/.test(a)&&/[一-龯ぁ-んァ-ヶ]/.test(b)&&a.length<=30&&b.length<=20&&!/特殊アタッカー|物理アタッカー|HP|Lv|最大|MP|戦力/.test(a+b)){title=a;name=b;break}}
 if(!name){const label=ls.find(x=>/キャラクター名|名前|Name/i.test(x));if(label)name=label.replace(/.*?[:：]/,'').trim()}
 return {name:cleanLine(name),title:cleanLine(title),existing:null}
}
function numberAfter(text,label){const m=String(text).match(new RegExp(label+'[^0-9]{0,20}([0-9][0-9,]*)','i'));return m?Number(m[1].replace(/,/g,'')):0}
function parseStats(text){return{base_hp:numberAfter(text,'(?:基礎)?(?:HP|体力)'),base_attack:numberAfter(text,'(?:基礎)?(?:攻撃|ATK|攻撃力)'),base_defense:numberAfter(text,'(?:基礎)?(?:防御|DEF|防御力)'),base_speed:numberAfter(text,'(?:基礎)?(?:速度|SPD|スピード)')}}
function parseStars(text){const t=String(text).replace(/[☆✦✧]/g,'★');const a=(t.match(/★/g)||[]).length;return a>=1&&a<=4?a:null}
function parseSkills(text){
 const ls=lines(text),skills=[],skillWords=/アタック|サバイバー|シリアル|タイムストライク|ドリーム|ポイズン|スタン|スリープ|睡眠|毒|ヒール|回復|EX|ガッツ|根性|スキン|復讐|反転|ドレイン|ハンター|オート|入場/i;
 for(let i=0;i<ls.length;i++){const first=cleanLine(ls[i]),q=ls.slice(i,Math.min(ls.length,i+5)).join(' ');if(!skillWords.test(q))continue;
  const mm=q.match(/([0-9]+(?:\.[0-9]+)?)\s*[x×倍]/i),tm=q.match(/([0-9]{1,3})\s*TU/i),mp=q.match(/(?:[-−]\s*)?([0-9]+)\s*MP/i),target=(q.match(/全体|ランダム\s*\d+\s*体|\d+\s*体|敵\d*体|味方\d*体|敵1体|単体|自分/)||[])[0]||'';
  const statuses=['毒','睡眠','スタン','火傷','凍結','麻痺','スロウ','眠り','ガード'].filter(x=>q.includes(x)),conditions=[];
  const cm=q.match(/HP\s*[0-9]+%?\s*(?:未満|以下|以上|超)/);if(cm)conditions.push(cm[0]);
  const tuC=q.match(/[0-9]{2,3}\s*TU\s*(?:生存|以上|未満|以下)/);if(tuC)conditions.push(tuC[0]);
  if(/戦闘中各1回|戦闘中1回|1回のみ|一度のみ/.test(q))conditions.push('使用回数:1');
  if(/撃破|倒した|戦闘不能/.test(q))conditions.push('撃破/戦闘不能条件');
  const type=/回復|ヒール/.test(q)?'heal':/スキン|復讐|入場|オート/.test(q)?'passive':'damage';
  if(!first||skills.some(s=>norm(s.name)===norm(first)))continue;
  skills.push({name:first,type,target,multiplier:mm?Number(mm[1]):null,tu:tm?Number(tm[1]):null,mp:mp?Number(mp[1]):null,status_effects:statuses,conditions,ex:/\bEX\b|ＥＸ/.test(q),raw:q,source:'full_detail_screenshot_ocr'});
 }
 return skills.filter(s=>s.name.length<=80).slice(0,30)
}
function bestExisting(name,title,chars){
 const combo=title?norm(name+'（'+title+'）'):norm(name);
 return chars.find(c=>norm(c.name)===combo||norm(c.name)===norm(name)||((norm(c.base_name||'')===norm(name))&&(title?norm(c.title||c.variant_title||'')===norm(title):true)))||null;
}
function featureVector(src){return loadImg(src).then(im=>{const c=document.createElement('canvas');c.width=c.height=16;c.getContext('2d').drawImage(im,0,0,16,16);const p=c.getContext('2d').getImageData(0,0,16,16).data,v=[];for(let i=0;i<p.length;i+=4)v.push(Math.round(p[i]/32),Math.round(p[i+1]/32),Math.round(p[i+2]/32));return v})}
async function ocrRegion(src,psm=7){await ensureOCR();try{const r=await Tesseract.recognize(src,'jpn+eng',{tessedit_pageseg_mode:psm});return r.data?.text||''}catch{return ''}}
function cropNorm(im,x,y,w,h){return cropData(im,im.width*x,im.height*y,im.width*w,im.height*h)}
function detectElementVisual(im){
 const c=document.createElement('canvas'),ctx=c.getContext('2d');
 const regions=[
  [.255,.090,.105,.075],
  [.270,.082,.085,.090],
  [.285,.095,.070,.065]
 ];
 const scores={光:0,闇:0,風:0};
 for(const [rx,ry,rw,rh] of regions){
  const x=Math.round(im.width*rx),y=Math.round(im.height*ry),w=Math.max(1,Math.round(im.width*rw)),h=Math.max(1,Math.round(im.height*rh));
  c.width=w;c.height=h;ctx.clearRect(0,0,w,h);ctx.drawImage(im,x,y,w,h,0,0,w,h);
  const p=ctx.getImageData(0,0,w,h).data;
  let counts={光:0,闇:0,風:0};
  for(let i=0;i<p.length;i+=4){
   const r=p[i],g=p[i+1],b=p[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
   if(mx<55||d<35)continue;
   const max=mx/255,min=mn/255,delta=max-min;let hue=0;
   if(delta){if(max===r/255)hue=60*(((g/255-b/255)/delta)%6);else if(max===g/255)hue=60*((b/255-r/255)/delta+2);else hue=60*((r/255-g/255)/delta+4);if(hue<0)hue+=360}
   // 実画像の3属性アイコンを色相で分類：黄色=光、紫=闇、緑=風
   if((hue>=35&&hue<75)&&r>120&&g>95)counts.光++;
   else if(hue>=245&&hue<=335&&b>80)counts.闇++;
   else if(hue>=75&&hue<170&&g>75)counts.風++;
  }
  for(const k of Object.keys(scores))scores[k]+=counts[k]/Math.max(1,p.length/4);
 }
 const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
 return ranked[0]&&ranked[0][1]>0.035?ranked[0][0]:'';
}
function cleanNameOCR(t){return lines(t).map(cleanLine).filter(x=>/[一-龯ぁ-んァ-ヶ]/.test(x)).sort((a,b)=>b.length-a.length)[0]||''}
function levenshtein(a,b){a=norm(a);b=norm(b);const m=a.length,n=b.length,d=Array.from({length:m+1},()=>Array(n+1).fill(0));for(let i=0;i<=m;i++)d[i][0]=i;for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
function preprocessName(src,mode){return loadImg(src).then(im=>{const c=document.createElement('canvas'),ctx=c.getContext('2d');c.width=im.width*3;c.height=im.height*3;ctx.drawImage(im,0,0,c.width,c.height);const img=ctx.getImageData(0,0,c.width,c.height),p=img.data;for(let i=0;i<p.length;i+=4){const y=.299*p[i]+.587*p[i+1]+.114*p[i+2];let v=y;if(mode===1)v=Math.max(0,Math.min(255,(y-128)*2+128));if(mode===2)v=y>150?255:0;if(mode===3)v=y>125?255:0;p[i]=p[i+1]=p[i+2]=v}ctx.putImageData(img,0,0);return c.toDataURL('image/png')})}
function fuzzyBest(value,list){
 const v=norm(value);if(!v)return {item:null,ratio:1};
 let best=null,ratio=1;
 for(const item of list){const x=norm(item);if(!x)continue;const r=levenshtein(v,x)/Math.max(1,v.length,x.length);if(r<ratio){ratio=r;best=item}}
 return {item:best,ratio};
}
async function repeatedFieldOCR(crop,psms=[7,6,13]){
 const variants=[crop,...await Promise.all([0,1,2,3].map(m=>preprocessName(crop,m)))];
 const raw=[];
 for(const src of variants)for(const psm of psms){const t=await ocrRegion(src,psm);for(const x of lines(t).map(cleanLine).filter(Boolean))raw.push(x)}
 return [...new Set(raw)];
}
async function repeatedNameOCR(crop,chars,title){
 const raw=await repeatedFieldOCR(crop);
 const candidates=[...new Set(chars.map(c=>c.base_name||String(c.name||'').replace(/（.*$/,'')).filter(Boolean))];
 // OCR単独では誤読しやすいため、同一タイトルを持つマスターを最優先する
 if(title){
   const titleNorm=norm(title);
   const exact=chars.filter(c=>norm(c.title||c.variant_title||'')===titleNorm);
   if(exact.length===1){
     const n=exact[0].base_name||String(exact[0].name||'').replace(/（.*$/,'');
     return {value:n,confidence:.99,raw,source:'title_exact',matched_id:exact[0].id};
   }
   const tf=fuzzyBest(title,chars.map(c=>c.title||c.variant_title||'').filter(Boolean));
   if(tf.item&&tf.ratio<=.28){
     const hits=chars.filter(c=>norm(c.title||c.variant_title||'')===norm(tf.item));
     if(hits.length===1){
       const n=hits[0].base_name||String(hits[0].name||'').replace(/（.*$/,'');
       return {value:n,confidence:Math.max(.88,1-tf.ratio),raw,source:'title_fuzzy',matched_id:hits[0].id};
     }
   }
 }
 // タイトルで決まらない場合だけ、複数OCR結果をマスター名へ投票照合
 let best='',score=1e9,hits=0;
 for(const x of raw){
   const fb=fuzzyBest(x,candidates);
   if(fb.item&&fb.ratio<score){score=fb.ratio;best=fb.item;hits=1}
   else if(fb.item&&fb.item===best)hits++;
 }
 if(best&&score<=.45)return {value:best,confidence:Math.max(.55,1-score),raw,source:'name_fuzzy',hits};
 return {value:'',confidence:0,raw,source:'unresolved'};
}
async function analyze(file){
 const db=await openDB(),chars=await all(db,'characters');db.close();
 const src=await fileData(file),im=await loadImg(src);
 const titleCrop=cropNorm(im,.335,.087,.30,.035);
 const nameCrop=cropNorm(im,.335,.103,.30,.042);
 const roleCrop=cropNorm(im,.335,.127,.38,.045);
 const mpCrop=cropNorm(im,.335,.160,.30,.040);
 const rarityCrop=cropNorm(im,.065,.050,.105,.065);
 const skillCrop=cropNorm(im,.065,.125,.88,.430);
 const titleRaw=await repeatedFieldOCR(titleCrop,[7,6,13]);
 const titleCandidates=chars.map(c=>c.title||c.variant_title||'').filter(Boolean);
 const titleExact=titleRaw.find(x=>titleCandidates.some(t=>norm(t)===norm(x)))||'';
 const titleFuzzy=fuzzyBest(titleRaw[0]||'',titleCandidates);
 const title=titleExact||(titleFuzzy.item&&titleFuzzy.ratio<=.35?titleFuzzy.item:cleanNameOCR(titleRaw.join('\n')));
 const nameResult=await repeatedNameOCR(nameCrop,chars,title);
 const name=nameResult.value;
 const roleText=await ocrRegion(roleCrop,7),mpText=await ocrRegion(mpCrop,7),rarityText=await ocrRegion(rarityCrop,6),skillText=await ocrRegion(skillCrop,6);
 const rarityRaw=await repeatedFieldOCR(rarityCrop,[7,8,6,13]);
 const rarityWhitelistRaw=[];
 for(const rr of [rarityCrop,...await Promise.all([0,1,2,3].map(m=>preprocessName(rarityCrop,m)))]){await ensureOCR();try{const z=await Tesseract.recognize(rr,'eng',{tessedit_pageseg_mode:7,tessedit_char_whitelist:'SR'});rarityWhitelistRaw.push(z.data?.text||'')}catch{}}
 const rarityVotes=[...rarityRaw,...rarityWhitelistRaw].map(normalizeRarity).filter(Boolean);
 const rarityCounts=rarityVotes.reduce((m,x)=>(m[x]=(m[x]||0)+1,m),{});
 let rarity=Object.entries(rarityCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||findRarity(rarityText);
 const role=findRole(roleText),mp=6;
 const element=detectElementVisual(im)||findElement(await ocrRegion(cropNorm(im,.255,.090,.105,.075),6));
 const skills=parseSkills(skillText);
 const existing=bestExisting(name,title,chars);
 if(existing?.rarity&&['SSR','SR','R'].includes(existing.rarity))rarity=existing.rarity;
 const cardCrop=cropNorm(im,.065,.085,.095,.075,'image/jpeg',.95);
 return {version:'2.2.0',filename:file.name,source_image:src,card_image:cardCrop,name,title,rarity,element,role,max_mp:6,skills,
  name_ocr_confidence:nameResult.confidence,name_ocr_candidates:nameResult.raw,
  header_ocr:[title,name,roleText,mpText,rarityText].join('\n'),
  rarity_ocr_candidates:[...rarityRaw,...rarityWhitelistRaw],rarity_ocr_votes:rarityVotes,
  title_ocr_candidates:titleRaw,name_ocr_source:nameResult.source,name_ocr_match_id:nameResult.matched_id||null,skill_ocr:skillText,
  ocr_text:[title,name,roleText,mpText,rarityText,skillText].join('\n'),
  existing_id:existing?.id||null,created_at:new Date().toISOString()};
}
function installUI(){
 const head=document.querySelector('#characters .section-head');if(!head)return;
 if($('#ocrFullCharacterButton'))return;
 const b=document.createElement('button');b.type='button';b.className='small';b.id='ocrFullCharacterButton';b.textContent='📷 1枚から全情報登録';head.appendChild(b);
 const box=document.createElement('div');box.id='ocrFullCharacterBox';box.className='card hidden';
 box.innerHTML='<h3>📷 詳細スクショ1枚からキャラクターDB登録</h3><p class="hint">上部からキャラ名・種別・レアリティ・属性・役割・最大MP、下部からパッシブ／アクティブスキルを抽出します。キャラ画像も画像マスターへ保存します。</p><label class="upload"><input id="ocrFullCharacterFile" type="file" accept="image/*">キャラクター詳細スクショ</label><button type="button" class="wide primary" id="ocrFullCharacterAnalyze">🔍 1枚を解析</button><div id="ocrFullCharacterStatus" class="hint"></div><div id="ocrFullCharacterPreview"></div>';
 $('#characters').insertBefore(box,$('#characterForm'));b.onclick=()=>{box.classList.toggle('hidden');if(!box.classList.contains('hidden'))box.scrollIntoView({behavior:'smooth',block:'start'})};$('#ocrFullCharacterAnalyze').onclick=run;
}
async function run(){
 const f=$('#ocrFullCharacterFile')?.files?.[0];if(!f)return alert('キャラクター詳細スクショを選択してください。');
 const st=$('#ocrFullCharacterStatus'),pv=$('#ocrFullCharacterPreview');st.textContent='画像全体を解析中…';pv.innerHTML='';
 try{
  const r=await analyze(f);window.__ocrFullCharacterLast=r;const dup=r.existing_id;
  st.textContent=dup?'⚠️ 既存候補が見つかりました。':'🟡 OCRから新規登録候補を作成しました。';
  pv.innerHTML='<div class="notice"><b>キャラ名:</b> '+esc(r.name||'未検出')+'<br><b>OCR照合:</b> '+Math.round((r.name_ocr_confidence||0)*100)+'%<br><b>統合名:</b> '+esc(r.name+(r.title?'（'+r.title+'）':''))+'<br><b>種別:</b> '+esc(r.title||'未検出')+'<br><b>レアリティ:</b> '+esc(r.rarity||'未検出')+' / <b>属性:</b> '+esc(r.element||'未検出')+' / <b>役割:</b> '+esc(r.role||'未検出')+'<br><b>最大MP:</b> '+(r.max_mp||'未検出')+'</div>'+
  '<div class="meta-grid"><label>自動発行ID<input id="ocrFullId" readonly></label><label>キャラ名<input id="ocrFullName" value="'+esc(r.name)+'"></label><label>種別（タイトル）<input id="ocrFullTitle" value="'+esc(r.title)+'"></label><label>レアリティ<input id="ocrFullRarity" value="'+esc(r.rarity)+'"></label><label>属性<input id="ocrFullElement" value="'+esc(r.element)+'"></label><label>役割<input id="ocrFullRole" value="'+esc(r.role)+'"></label><label>最大MP<input id="ocrFullMP" type="number" value="'+(r.max_mp||0)+'"></label></div>'+
  '<label>スキル解析結果<textarea id="ocrFullSkills" rows="12">'+esc(JSON.stringify(r.skills,null,2))+'</textarea></label>'+
  '<label>OCR全文（項目別領域）<textarea id="ocrFullRaw" rows="8">'+esc(r.ocr_text)+'</textarea></label>'+
  '<div class="notice">'+(dup?('⚠️ 既存候補: '+esc(dup)+'。既存キャラなら新規作成ではなくスクショ結び付けを使用します。'):'保存時に空いているCHR-IDを自動採番します。')+'</div>'+
  '<button type="button" class="wide primary" id="ocrFullConfirm">✅ 内容を確認して登録</button>';
  $('#ocrFullId').value=dup||'保存時自動採番';$('#ocrFullConfirm').onclick=()=>confirmSave(r,dup);
 }catch(e){console.error(e);st.textContent='解析エラー: '+(e?.message||String(e))}
}
async function confirmSave(r,dup){
 const d=await openDB(),chars=await all(d,'characters');
 const name=$('#ocrFullName')?.value.trim(),title=$('#ocrFullTitle')?.value.trim()||'';
 if(!name){d.close();return alert('キャラクター名が取得できていません。')}
 const rarity=normalizeRarity($('#ocrFullRarity')?.value||r.rarity);
 if(!['SSR','SR','R'].includes(rarity)){d.close();return alert('レアリティをSSR / SR / Rのいずれかに確定してください。')}
 const element=findElement($('#ocrFullElement')?.value||r.element);
 if(!['闇','風','光'].includes(element)){d.close();return alert('属性を闇 / 風 / 光のいずれかに確定してください。')}
 const existing=bestExisting(name,title,chars)||chars.find(c=>c.id===dup);
 if(existing){d.close();return alert('既存キャラクター候補があります。新規作成は行わず、既存キャラクターの「📷 スクショ登録」で画像・スキルを結び付けてください。\\n候補: '+existing.id)}
 let n=1;while(chars.some(c=>c.id==='CHR-'+String(n).padStart(4,'0')))n++;
 const id='CHR-'+String(n).padStart(4,'0'),ts=new Date().toISOString();
 let skills=[];try{skills=JSON.parse($('#ocrFullSkills')?.value||'[]')}catch{skills=r.skills||[]}
 const obj={id,name:title?name+'（'+title+'）':name,base_name:name,title,variant_title:title,rarity,element,role:$('#ocrFullRole')?.value.trim()||r.role||'',max_mp:6,base_hp:0,base_attack:0,base_defense:0,base_speed:0,skills,skill_data:{skills},battle_profile:{skills},passives:skills.filter(s=>s.type==='passive'),status_effects:[...new Set(skills.flatMap(s=>s.status_effects||[]))],version:1,source:'full_detail_screenshot_ocr',verification_status:'ocr_created_unverified',verification_required:true,screenshot_confirmed:false,ocr_source_filename:r.filename,ocr_text:r.ocr_text,created_at:ts,updated_at:ts,active:true};
 await put(d,'characters',obj);
 if(d.objectStoreNames.contains('characterScreenshots'))await put(d,'characterScreenshots',{id:'cs_'+crypto.randomUUID(),character_id:id,match_status:'CREATED_UNVERIFIED',match_stage:5,match_confidence:r.name_ocr_confidence||.9,filename:r.filename,blob:r.source_image,ocr_text:r.ocr_text,created_at:ts,source:'full_detail_screenshot_ocr'});
 if(d.objectStoreNames.contains('characterImages'))await put(d,'characterImages',{id:'img_'+crypto.randomUUID(),character_id:id,image_type:'card',blob:r.card_image,verified:false,verification_source:'full_detail_screenshot_ocr',created_at:ts});\n if(window.GitHubImageStore?.uploadCharacterImage){await window.GitHubImageStore.uploadCharacterImage(id,r.card_image,{name:obj.name,title:obj.title||'',verification_source:'full_detail_screenshot_ocr'}).catch(e=>console.warn('GitHub character image upload:',e.message));}
 if(d.objectStoreNames.contains('characterSkillSources'))await put(d,'characterSkillSources',{id:'skill_'+crypto.randomUUID(),character_id:id,source:'full_detail_screenshot_ocr',filename:r.filename,ocr_text:r.skill_ocr,skills,created_at:ts});
 d.close();
 if($('#ocrFullCharacterBox'))$('#ocrFullCharacterBox').classList.add('hidden');
 if(window.renderCharacters)await window.renderCharacters();
 if(window.refreshStats)await window.refreshStats();
 alert((title?name+'（'+title+'）':name)+'（'+id+'）を詳細スクショ1枚から登録しました。\\n画像・スキル・OCR証拠も保存済み。\\n検証状態: 未確認');
}
window.ParanoiseOCRNewCharacter={VERSION:'2.3.0',analyze,confirmCreate:confirmSave,installUI};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI);else installUI();
new MutationObserver(()=>installUI()).observe(document.body,{childList:true,subtree:true});
})();
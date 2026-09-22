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
function findRarity(t){const x=String(t).toUpperCase().replace(/ＳＳＲ/g,'SSR').replace(/ＳＲ/g,'SR');return x.match(/\b(SSR|SR|R)\b/)?.[1]||''}
function findElement(t){const x=String(t);for(const e of ['風','光','闇','火','水','地'])if(new RegExp('(?:属性|エレメント)?\\s*'+e).test(x))return e;return ''}
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
 const x=Math.round(im.width*.165),y=Math.round(im.height*.052),w=Math.round(im.width*.075),h=Math.round(im.height*.075);
 c.width=w;c.height=h;ctx.drawImage(im,x,y,w,h,0,0,w,h);
 const p=ctx.getImageData(0,0,w,h).data;let rS=0,gS=0,bS=0,n=0;
 for(let i=0;i<p.length;i+=4){const r=p[i],g=p[i+1],b=p[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn>45&&mx>80){rS+=r;gS+=g;bS+=b;n++}}
 if(!n)return '';
 const r=rS/n,g=gS/n,b=bS/n;
 if(g>r*1.15&&g>b*1.12)return '風';
 if(r>g*1.25&&r>b*1.25)return '火';
 if(b>r*1.15&&b>g*1.05)return '水';
 if(r>100&&g>100&&b<100)return '光';
 if(r>g*1.15&&b>g*1.05)return '闇';
 return '';
}
function cleanNameOCR(t){return lines(t).map(cleanLine).filter(x=>/[一-龯ぁ-んァ-ヶ]/.test(x)).sort((a,b)=>b.length-a.length)[0]||''}
async function analyze(file){
 const db=await openDB(),chars=await all(db,'characters');db.close();
 const src=await fileData(file),im=await loadImg(src);
 // 1320x2868実画面を基準に、項目ごとに専用OCR領域を設定
 const titleCrop=cropNorm(im,.205,.052,.30,.035);
 const nameCrop=cropNorm(im,.205,.075,.30,.040);
 const roleCrop=cropNorm(im,.205,.105,.36,.045);
 const mpCrop=cropNorm(im,.32,.145,.25,.040);
 const rarityCrop=cropNorm(im,.065,.052,.095,.075);
 const skillCrop=cropNorm(im,.065,.125,.88,.430);
 const title=cleanNameOCR(await ocrRegion(titleCrop,7));
 const name=cleanNameOCR(await ocrRegion(nameCrop,7));
 const roleText=await ocrRegion(roleCrop,7);
 const mpText=await ocrRegion(mpCrop,7);
 const rarityText=await ocrRegion(rarityCrop,6);
 const skillText=await ocrRegion(skillCrop,6);
 const role=findRole(roleText),mp=findMaxMP(mpText),rarity=findRarity(rarityText);
 const element=detectElementVisual(im)||findElement(await ocrRegion(cropNorm(im,.155,.045,.10,.095),6));
 const skills=parseSkills(skillText);
 const existing=bestExisting(name,title,chars);
 const cardCrop=cropNorm(im,.065,.052,.095,.075,'image/jpeg',.95);
 return {version:'2.1.0',filename:file.name,source_image:src,card_image:cardCrop,name,title,rarity,element,role,max_mp:mp,skills,
  header_ocr:[title,name,roleText,mpText,rarityText].join('\n'),skill_ocr:skillText,
  ocr_text:[title,name,roleText,mpText,rarityText,skillText].join('\n'),
  existing_id:existing?.id||null,created_at:new Date().toISOString()};
}
function installUI(){
 const head=document.querySelector('#characters .section-head');if(!head)return;
 if($('#ocrFullCharacterButton'))return;
 const b=document.createElement('button');b.type='button';b.className='small';b.id='ocrFullCharacterButton';b.textContent='📷 1枚から全情報登録';head.appendChild(b);
 const box=document.createElement('div');box.id='ocrFullCharacterBox';box.className='card hidden';
 box.innerHTML='<h3>📷 詳細スクショ1枚からキャラクターDB登録</h3><p class="hint">上部からキャラ名・種別・属性・役割・最大MP・レベル・戦力、下部からパッシブ／アクティブスキルを抽出します。キャラ画像も画像マスターへ保存します。</p><label class="upload"><input id="ocrFullCharacterFile" type="file" accept="image/*">キャラクター詳細スクショ</label><button type="button" class="wide primary" id="ocrFullCharacterAnalyze">🔍 1枚を解析</button><div id="ocrFullCharacterStatus" class="hint"></div><div id="ocrFullCharacterPreview"></div>';
 $('#characters').insertBefore(box,$('#characterForm'));b.onclick=()=>{box.classList.toggle('hidden');if(!box.classList.contains('hidden'))box.scrollIntoView({behavior:'smooth',block:'start'})};$('#ocrFullCharacterAnalyze').onclick=run;
}
async function run(){
 const f=$('#ocrFullCharacterFile')?.files?.[0];if(!f)return alert('キャラクター詳細スクショを選択してください。');
 const st=$('#ocrFullCharacterStatus'),pv=$('#ocrFullCharacterPreview');st.textContent='画像全体を解析中…';pv.innerHTML='';
 try{
  const r=await analyze(f);window.__ocrFullCharacterLast=r;const dup=r.existing_id;
  st.textContent=dup?'⚠️ 既存候補が見つかりました。':'🟡 OCRから新規登録候補を作成しました。';
  pv.innerHTML='<div class="notice"><b>キャラ名:</b> '+esc(r.name||'未検出')+'<br><b>種別:</b> '+esc(r.title||'未検出')+'<br><b>レアリティ:</b> '+esc(r.rarity||'未検出')+' / <b>属性:</b> '+esc(r.element||'未検出')+' / <b>役割:</b> '+esc(r.role||'未検出')+'<br><b>最大MP:</b> '+(r.max_mp||'未検出')+'</div>'+
  '<div class="meta-grid"><label>自動発行ID<input id="ocrFullId" readonly></label><label>キャラ名<input id="ocrFullName" value="'+esc(r.name)+'"></label><label>種別（タイトル）<input id="ocrFullTitle" value="'+esc(r.title)+'"></label><label>レアリティ<input id="ocrFullRarity" value="'+esc(r.rarity)+'"></label><label>属性<input id="ocrFullElement" value="'+esc(r.element)+'"></label><label>役割<input id="ocrFullRole" value="'+esc(r.role)+'"></label><label>最大MP<input id="ocrFullMP" type="number" value="'+(r.max_mp||0)+'"></label></div>'+
  '<label>スキル解析結果<textarea id="ocrFullSkills" rows="12">'+esc(JSON.stringify(r.skills,null,2))+'</textarea></label>'+
  '<label>OCR全文（項目別領域）<textarea id="ocrFullRaw" rows="8">'+esc(r.ocr_text)+'</textarea></label>'+
  '<div class="notice">'+(dup?('⚠️ 既存候補: '+esc(dup)+'。既存キャラなら新規作成ではなくスクショ結び付けを使用します。'):'保存時に空いているCHR-IDを自動採番します。')+'</div>'+
  '<button type="button" class="wide primary" id="ocrFullConfirm">✅ 内容を確認して登録</button>';
  $('#ocrFullId').value=dup||'保存時自動採番';$('#ocrFullConfirm').onclick=()=>confirmSave(r,dup);
 }catch(e){console.error(e);st.textContent='解析エラー: '+(e?.message||String(e))}
}
async function confirmSave(r,dup){
 const d=await openDB(),chars=await all(d,'characters'),name=$('#ocrFullName')?.value.trim(),title=$('#ocrFullTitle')?.value.trim()||'';
 if(!name){d.close();return alert('キャラクター名が取得できていません。')}
 const existing=bestExisting(name,title,chars)||chars.find(c=>c.id===dup);
 if(existing){d.close();return alert('既存キャラクター候補があります。新規作成は行わず、既存キャラクターの「📷 スクショ登録」で画像・スキルを結び付けてください。\n候補: '+existing.id)}
 let n=1;while(chars.some(c=>c.id==='CHR-'+String(n).padStart(4,'0')))n++;
 const id='CHR-'+String(n).padStart(4,'0'),ts=new Date().toISOString();
 let skills=[];try{skills=JSON.parse($('#ocrFullSkills')?.value||'[]')}catch{skills=r.skills||[]}
 const obj={id,name:title?name+'（'+title+'）':name,base_name:name,title,variant_title:title,rarity:$('#ocrFullRarity')?.value.trim()||'',element:$('#ocrFullElement')?.value.trim()||'',role:$('#ocrFullRole')?.value.trim()||'',max_mp:Number($('#ocrFullMP')?.value)||0,base_hp:r.stats.base_hp||0,base_attack:r.stats.base_attack||0,base_defense:r.stats.base_defense||0,base_speed:r.stats.base_speed||0,skills,skill_data:{skills},battle_profile:{skills},passives:skills.filter(s=>s.type==='passive'),status_effects:[...new Set(skills.flatMap(s=>s.status_effects||[]))],version:1,source:'full_detail_screenshot_ocr',verification_status:'ocr_created_unverified',verification_required:true,screenshot_confirmed:false,observed_level:r.level||0,observed_power:r.power||0,observed_awakening:r.observed_awakening,ocr_source_filename:r.filename,ocr_text:r.ocr_text,created_at:ts,updated_at:ts,active:true};
 await put(d,'characters',obj);
 if(d.objectStoreNames.contains('characterScreenshots'))await put(d,'characterScreenshots',{id:'cs_'+crypto.randomUUID(),character_id:id,match_status:'CREATED_UNVERIFIED',match_stage:5,match_confidence:.9,filename:r.filename,blob:r.source_image,ocr_text:r.ocr_text,created_at:ts,source:'full_detail_screenshot_ocr'});
 if(d.objectStoreNames.contains('characterImages'))await put(d,'characterImages',{id:'img_'+crypto.randomUUID(),character_id:id,image_type:'card',blob:r.card_image,verified:false,verification_source:'full_detail_screenshot_ocr',created_at:ts});
 if(d.objectStoreNames.contains('characterSkillSources'))await put(d,'characterSkillSources',{id:'skill_'+crypto.randomUUID(),character_id:id,source:'full_detail_screenshot_ocr',filename:r.filename,ocr_text:r.skill_ocr,skills,created_at:ts});
 d.close();if($('#ocrFullCharacterBox'))$('#ocrFullCharacterBox').classList.add('hidden');if(window.renderCharacters)await window.renderCharacters();if(window.refreshStats)await window.refreshStats();
 alert((title?name+'（'+title+'）':name)+'（'+id+'）を詳細スクショ1枚から登録しました。\n画像・スキル・OCR証拠も保存済み。\n検証状態: 未確認');
}
window.ParanoiseOCRNewCharacter={VERSION:'2.0.0',analyze,confirmCreate:confirmSave,installUI};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI);else installUI();
new MutationObserver(()=>installUI()).observe(document.body,{childList:true,subtree:true});
})();
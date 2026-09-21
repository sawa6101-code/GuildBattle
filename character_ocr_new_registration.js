/* GuildBattle - OCR New Character Registration */
(function(){
'use strict';
const DB='paranoise-guildbattle', V=4;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s　・･「」『』()（）［］【】]/g,'').toLowerCase();
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,V);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function all(d,n){return new Promise((ok,no)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function put(d,n,x){return new Promise((ok,no)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>ok(x);r.onerror=()=>no(r.error)})}
function fileData(f){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)})}
async function ensureOCR(){if(window.Tesseract)return;const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';document.head.appendChild(s);await new Promise((ok,no)=>{s.onload=ok;s.onerror=no})}
async function ocr(src){await ensureOCR();const r=await Tesseract.recognize(src,'jpn+eng');return r.data?.text||''}
const lines=text=>String(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
function findRarity(text){const t=String(text).toUpperCase().replace(/ＳＳＲ/g,'SSR').replace(/ＳＲ/g,'SR');const m=t.match(/\b(SSR|SR|R)\b/);return m?m[1]:''}
function findElement(text){const t=String(text);for(const x of ['風','光','闇','火','水'])if(new RegExp('(?:属性|元素|エレメント)?\\s*'+x).test(t))return x;return ''}
function findName(text,chars){
 const ls=lines(text);
 for(const l of ls){const hit=chars.find(c=>norm(c.name)===norm(l));if(hit)return {name:l,title:'',existing:hit}}
 for(const l of ls){const m=l.match(/(?:キャラクター名|名前|Name)\s*[:：]\s*(.+)$/i);if(m&&m[1].trim())return {name:m[1].trim(),title:'',existing:null}}
 const bad=/スキル|HP|攻撃|防御|速度|TU|倍率|Lv|レベル|覚醒|限界突破|パッシブ|アタック|EX|MP|状態異常|ターゲット/;
 const candidates=ls.filter(l=>/[一-龯ぁ-んァ-ヶ]/.test(l)&&l.length<=40&&!bad.test(l));
 return {name:candidates.sort((a,b)=>a.length-b.length)[0]||'',title:'',existing:null}
}
function findTitle(text,name){const ls=lines(text);for(const l of ls){if(l===name)continue;const m=l.match(/(?:二つ名|タイトル|Title)\s*[:：]\s*(.+)$/i);if(m)return m[1].trim()}const m=String(name).match(/^(.+?)[（(](.+?)[）)]$/);return m?m[2]:''}
function numberAfter(text,label){const m=String(text).match(new RegExp(label+'[^0-9]{0,15}([0-9][0-9,]*)','i'));return m?Number(m[1].replace(/,/g,'')):0}
function parseStats(text){return{base_hp:numberAfter(text,'(?:基礎)?(?:HP|体力)'),base_attack:numberAfter(text,'(?:基礎)?(?:攻撃|ATK|攻撃力)'),base_defense:numberAfter(text,'(?:基礎)?(?:防御|DEF|防御力)'),base_speed:numberAfter(text,'(?:基礎)?(?:速度|SPD|スピード)')}}
function parseSkills(text){
 const ls=lines(text),out=[];
 for(let i=0;i<ls.length;i++){const q=ls.slice(i,i+5).join(' ');if(!/(アタック|サバイバー|シリアル|タイムストライク|ドリーム|ポイズン|スタン|スリープ|睡眠|毒|ヒール|回復|EX|根性|ガッツ|スキン|復讐|反転|ドレイン|ハンター)/i.test(q))continue;
  const mm=q.match(/([0-9]+(?:\.[0-9]+)?)\s*[x×倍]/i),tm=q.match(/([0-9]{1,3})\s*TU/i);
  const target=(q.match(/全体|2体|2人|ランダム2|敵1体|単体|味方全体|味方1体|自分/)||[])[0]||'';
  const statuses=['毒','睡眠','スタン','火傷','凍結','麻痺','スロウ','眠り'].filter(x=>q.includes(x));
  const condition=(q.match(/(?:HP|TU|撃破|生存|条件|MP).{0,60}/)||[])[0]||'';
  const rawName=ls[i].replace(/^[-・●◆▶]+/,'').trim();
  if(!rawName||out.some(s=>norm(s.name)===norm(rawName)))continue;
  out.push({name:rawName,type:/回復|ヒール/.test(q)?'heal':'damage',target,multiplier:mm?Number(mm[1]):null,tu:tm?Number(tm[1]):null,status_effects:statuses,conditions:condition?[condition]:[],ex:/\bEX\b|ＥＸ/.test(q),raw:q,source:'screenshot_ocr_new_registration'});
 }
 return out.slice(0,30)
}
function nextId(chars){let n=1;while(chars.some(c=>c.id==='CHR-'+String(n).padStart(4,'0')))n++;return 'CHR-'+String(n).padStart(4,'0')}
function installUI(){
 const head=document.querySelector('#characters .section-head');if(!head||$('#ocrNewCharacterButton'))return;
 const b=document.createElement('button');b.type='button';b.className='small';b.id='ocrNewCharacterButton';b.textContent='📷 OCR新規登録';head.appendChild(b);
 const box=document.createElement('div');box.id='ocrNewCharacterBox';box.className='card hidden';
 box.innerHTML='<h3>📷 未登録キャラクターをスクショから自動作成</h3><p class="hint">スクショのOCR結果から名前・タイトル・レアリティ・属性・基礎値・スキル候補を作成します。確定前に必ず確認してください。</p><label class="upload"><input id="ocrNewCharacterFile" type="file" accept="image/*">キャラクタースクショ</label><label class="upload"><input id="ocrNewSkillFiles" type="file" accept="image/*" multiple>スキルスクショ（任意・複数可）</label><button type="button" class="wide primary" id="ocrNewCharacterAnalyze">🔍 OCR解析して登録候補を作成</button><div id="ocrNewCharacterStatus" class="hint"></div><div id="ocrNewCharacterPreview"></div>';
 $('#characters').insertBefore(box,$('#characterForm'));
 b.onclick=()=>{box.classList.toggle('hidden');if(!box.classList.contains('hidden'))box.scrollIntoView({behavior:'smooth',block:'start'})};
 $('#ocrNewCharacterAnalyze').onclick=analyze
}
async function analyze(){
 const f=$('#ocrNewCharacterFile')?.files?.[0];if(!f)return alert('キャラクタースクショを選択してください。');
 const status=$('#ocrNewCharacterStatus'),preview=$('#ocrNewCharacterPreview');status.textContent='OCR解析中…';preview.innerHTML='';
 try{
  const d=await openDB(),chars=await all(d,'characters');d.close(),blob=await fileData(f),text=await ocr(blob),info=findName(text,chars);
  const skills=[];for(const sf of [...($('#ocrNewSkillFiles')?.files||[])])skills.push(...parseSkills(await ocr(await fileData(sf))));
  const stats=parseStats(text),rarity=findRarity(text),element=findElement(text),title=findTitle(text,info.name),duplicate=info.existing;
  window.__ocrNewCharacterCtx={blob,text,chars,duplicate,skills,stats,rarity,element,title,name:info.name,filename:f.name};
  if(duplicate){status.textContent='⚠️ OCR名が既存キャラクターと一致しました。新規登録を停止しました。';preview.innerHTML='<div class="notice"><b>既存ID:</b> '+esc(duplicate.id)+' / '+esc(duplicate.name)+'<br>既存キャラのスクショ結びつけは「📷 スクショ登録」を使用してください。</div>';return}
  const suggestedId=nextId(chars);status.textContent='🟡 登録候補を作成しました。内容を確認してから確定してください.';
  preview.innerHTML='<div class="meta-grid"><label>自動発行ID<input id="ocrNewId" value="'+esc(suggestedId)+'" readonly></label><label>キャラクター名<input id="ocrNewName" value="'+esc(info.name)+'"></label><label>タイトル<input id="ocrNewTitle" value="'+esc(title)+'"></label><label>レアリティ<input id="ocrNewRarity" value="'+esc(rarity)+'" placeholder="OCR未検出なら手入力"></label><label>属性<input id="ocrNewElement" value="'+esc(element)+'" placeholder="OCR未検出なら手入力"></label><label>基礎HP<input id="ocrNewHp" type="number" value="'+(stats.base_hp||0)+'"></label><label>基礎攻撃<input id="ocrNewAtk" type="number" value="'+(stats.base_attack||0)+'"></label><label>基礎防御<input id="ocrNewDef" type="number" value="'+(stats.base_defense||0)+'"></label><label>基礎速度<input id="ocrNewSpeed" type="number" value="'+(stats.base_speed||0)+'"></label></div><label>OCR全文<textarea id="ocrNewRaw" rows="7">'+esc(text)+'</textarea></label><div class="notice"><b>🧩 OCRスキル候補: '+skills.length+'件</b><br>'+(skills.length?skills.map(s=>'・'+esc(s.name)+' / '+esc(s.target||'—')+' / '+(s.multiplier??'—')+'x / '+(s.tu??'—')+'TU / '+esc(s.status_effects.join(','))).join('<br>'):'スキル情報なし')+'</div><button type="button" class="wide primary" id="ocrNewCharacterConfirm">✅ この内容で新規キャラクターを作成</button>';
  $('#ocrNewCharacterConfirm').onclick=confirmCreate
 }catch(e){console.error(e);status.textContent='OCR解析に失敗しました: '+(e?.message||String(e))}
}
async function confirmCreate(){
 const ctx=window.__ocrNewCharacterCtx;if(!ctx)return;const name=$('#ocrNewName')?.value.trim();if(!name)return alert('キャラクター名を入力してください。');
 const d=await openDB(),chars=await all(d,'characters');if(chars.some(c=>norm(c.name)===norm(name))){d.close();return alert('同名キャラクターが既に存在します。新規作成を中止しました。既存キャラのスクショ結びつけを使用してください。')}
 const id=nextId(chars),ts=new Date().toISOString(),obj={id,name,title:$('#ocrNewTitle')?.value.trim()||'',rarity:$('#ocrNewRarity')?.value.trim()||'',element:$('#ocrNewElement')?.value.trim()||'',base_hp:Number($('#ocrNewHp')?.value)||0,base_attack:Number($('#ocrNewAtk')?.value)||0,base_defense:Number($('#ocrNewDef')?.value)||0,base_speed:Number($('#ocrNewSpeed')?.value)||0,skills:ctx.skills,skill_data:{skills:ctx.skills},battle_profile:{skills:ctx.skills},status_effects:'',version:1,source:'screenshot_ocr_new_registration',verification_status:'ocr_created_unverified',verification_required:true,screenshot_confirmed:false,ocr_source_filename:ctx.filename,ocr_text:ctx.text,created_at:ts,updated_at:ts,active:true};
 await put(d,'characters',obj);
 if(d.objectStoreNames.contains('characterScreenshots'))await put(d,'characterScreenshots',{id:'cs_'+crypto.randomUUID(),character_id:id,match_status:'CREATED_UNVERIFIED',match_stage:5,match_confidence:1,filename:ctx.filename,blob:ctx.blob,ocr_text:ctx.text,created_at:ts,source:'screenshot_ocr_new_registration'});
 if(d.objectStoreNames.contains('characterImages'))await put(d,'characterImages',{id:'img_'+crypto.randomUUID(),character_id:id,image_type:'card',blob:ctx.blob,verified:false,verification_source:'ocr_new_registration',created_at:ts});
 if(ctx.skills.length&&d.objectStoreNames.contains('characterSkillSources'))await put(d,'characterSkillSources',{id:'skill_'+crypto.randomUUID(),character_id:id,source:'screenshot_ocr_new_registration',created_at:ts,skills:ctx.skills});
 d.close();if($('#ocrNewCharacterBox'))$('#ocrNewCharacterBox').classList.add('hidden');if(window.renderCharacters)await window.renderCharacters();if(window.refreshStats)await window.refreshStats();alert(name+'（'+id+'）をOCR結果から新規登録しました。\\n検証状態: 未確認');
}
window.ParanoiseOCRNewCharacter={VERSION:'1.0',analyze,confirmCreate,installUI};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI);else installUI();
new MutationObserver(()=>installUI()).observe(document.body,{childList:true,subtree:true});
})();
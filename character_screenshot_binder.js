/* GuildBattle Character Screenshot Binder v2
   Screenshot -> OCR + visual reference matching -> candidate -> user confirmation
   Character screenshot and skill screenshot are stored as evidence.
*/
(function(){
'use strict';
const DB='paranoise-guildbattle', V=6;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s　]+/g,'').replace(/[・･]/g,'').toLowerCase();

function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,V);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function all(d,n){return new Promise((ok,no)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function get(d,n,k){return new Promise((ok,no)=>{const r=d.transaction(n).objectStore(n).get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function put(d,n,x){return new Promise((ok,no)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>ok(x);r.onerror=()=>no(r.error)})}
function fileData(f){return new Promise((ok,no)=>{const r=new FileReader;r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)})}

async function imageFeatures(src){
 return new Promise(resolve=>{
  const im=new Image();
  im.onload=()=>{
   const out=[];
   const crops=[
    [0,0,1,1,'full'],[0,0,.6,.7,'top-left'],[.2,0,.8,.8,'top-center'],
    [.4,0,.6,.8,'top-right'],[0,.15,1,.7,'center']
   ];
   for(const [px,py,pw,ph,label] of crops){
    const c=document.createElement('canvas');c.width=c.height=32;
    const x=c.getContext('2d',{willReadFrequently:true});
    const sx=im.width*px,sy=im.height*py,sw=im.width*pw,sh=im.height*ph;
    x.drawImage(im,sx,sy,sw,sh,0,0,32,32);
    const p=x.getImageData(0,0,32,32).data,v=[];
    for(let i=0;i<p.length;i+=4)v.push(Math.round(p[i]/16),Math.round(p[i+1]/16),Math.round(p[i+2]/16));
    out.push({label,vector:v});
   }
   resolve(out);
  };
  im.onerror=()=>resolve([]);
  im.src=src;
 })
}
function visual(a,b){if(!a||!b||a.length!==b.length)return 0;let e=0;for(let i=0;i<a.length;i++)e+=Math.abs(a[i]-b[i]);return Math.max(0,1-e/(a.length*15))}
async function ocr(src){
 if(!window.Tesseract){
  const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  document.head.appendChild(s);await new Promise((a,b)=>{s.onload=a;s.onerror=b})
 }
 const r=await Tesseract.recognize(src,'jpn+eng');return r.data?.text||''
}
function extractName(text,chars){
 const lines=String(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 let best='';
 for(const line of lines){
  const n=norm(line);
  if(chars.some(c=>norm(c.name)===n))return line;
  if(/[一-龯ぁ-んァ-ヶ]/.test(line)&&line.length<=40&&!/スキル|HP|攻撃|防御|速度|TU|Lv|レベル|倍率/.test(line))best ||= line;
 }
 return best;
}
function parseSkills(text){
 const lines=String(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out=[];
 for(let i=0;i<lines.length;i++){
  const q=lines.slice(i,i+5).join(' ');
  if(!/(アタック|サバイバー|シリアル|タイムストライク|ドリーム|ポイズン|スタン|スリープ|睡眠|毒|ヒール|回復|EX|根性|ガッツ)/i.test(q))continue;
  const mm=q.match(/(\d+(?:\.\d+)?)\s*[x×倍]/i),tm=q.match(/(\d{1,3})\s*TU/i);
  const target=(q.match(/全体|2体|2人|ランダム2|敵1体|単体|味方全体|味方1体|自分/)||[])[0]||'';
  const statuses=['毒','睡眠','スタン','火傷','凍結','麻痺','スロウ','眠り'].filter(x=>q.includes(x));
  const condition=q.match(/(?:HP|TU|撃破|生存|条件|MP).{0,50}/)?.[0]||'';
  const name=lines[i].replace(/^[-・●◆▶]+/,'').slice(0,100);
  if(!out.some(s=>norm(s.name)===norm(name)))out.push({
    name,type:/回復|ヒール/.test(q)?'heal':'damage',target,
    multiplier:mm?Number(mm[1]):null,tu:tm?Number(tm[1]):null,
    status_effects:statuses,conditions:condition?[condition]:[],
    ex:/\bEX\b|ＥＸ/.test(q),raw:q,source:'screenshot_ocr'
  });
 }
 return out;
}
function bestImage(refs,features,characterId){
 const rs=refs.filter(x=>x.character_id===characterId&&x.verified!==false&&Array.isArray(x.features));
 let best=0,referenceId=null;
 for(const r of rs)for(const a of features)for(const b of r.features){
  const s=visual(a.vector,b.vector);
  if(s>best){best=s;referenceId=r.id;}
 }
 return {score:best,referenceId,count:rs.length};
}
function editRatio(a,b){
 a=norm(a);b=norm(b);if(!a||!b)return 1;
 const m=a.length,n=b.length,d=Array.from({length:m+1},()=>Array(n+1).fill(0));
 for(let i=0;i<=m;i++)d[i][0]=i;
 for(let j=0;j<=n;j++)d[0][j]=j;
 for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
 return d[m][n]/Math.max(m,n);
}
function parts(c){
 const m=String(c.name||'').match(/^(.*?)[（(](.*)[）)]$/);
 return {base:norm(m?m[1]:c.name),title:norm(m?m[2]:(c.title||'')),full:norm(c.name)};
}
function candidateRows(chars,refs,name,features,ocrText=''){
 const raw=norm(ocrText), input=norm(name);
 return chars.map(c=>{
  const p=parts(c);
  const full=input&&input===p.full?1:0;
  const base=(input&&input===p.base)?0.98:0;
  const title=(input&&p.title&&input===p.title)?0.96:0;
  const fullIn=raw.includes(p.full)?1:0;
  const baseIn=(raw.includes(p.base)&&p.base.length>=3)?0.92:0;
  const titleIn=(raw.includes(p.title)&&p.title.length>=3)?0.94:0;
  const fuzzyName=Math.max(full,base,title,fullIn,baseIn,titleIn,
    input&&p.base?Math.max(0,1-editRatio(input,p.base))*.72:0,
    input&&p.title?Math.max(0,1-editRatio(input,p.title))*.70:0);
  const im=bestImage(refs,features,c.id),image=im.score;
  const score=Math.max(fuzzyName,image*.95);
  return {id:c.id,name:c.name,rarity:c.rarity,exact:full,image,reference_id:im.referenceId,reference_count:im.count,score,name_score:fuzzyName};
 }).sort((a,b)=>b.score-a.score||b.name_score-a.name_score);
}
function renderCandidateList(rows,query=''){
 const q=norm(query);
 const filtered=q?rows.filter(x=>norm(x.id).includes(q)||norm(x.name).includes(q)||norm(parts({name:x.name}).base).includes(q)||norm(parts({name:x.name}).title).includes(q)):rows;
 return filtered.slice(0,50).map((x,i)=>'<label style="display:block;margin:.35rem 0"><input type="radio" name="csCandidate" value="'+esc(x.id)+'"> '+(i===0&&!q?'⭐ ':'')+esc(x.id)+' '+esc(x.name)+' / 名前 '+Math.round(x.name_score*100)+'% / 画像 '+Math.round(x.image*100)+'% / 参照'+x.reference_count+'件 / 総合 '+Math.round(x.score*100)+'%</label>').join('')||'<p class="hint">該当候補なし。ID・キャラクター名・種別で検索できます。</p>';
}
async function analyze(){
 const cf=$('#csCharFile')?.files?.[0], sf=[...($('#csSkillFile')?.files||[])];
 if(!cf)return alert('キャラクタースクショを選択してください。');
 const out=$('#csResult'), skillOut=$('#csSkillResult');out.textContent='画像・OCRを解析中…';skillOut.textContent='';
 const d=await openDB(),chars=await all(d,'characters'),refs=await all(d,'characterImages');d.close();
 const blob=await fileData(cf),features=await imageFeatures(blob),text=await ocr(blob),name=extractName(text,chars);
 const rows=candidateRows(chars,refs,name,features,text),top=rows[0],second=rows[1];
 const margin=(top?.score||0)-(second?.score||0);
 const auto=!!top&&((top.exact===1&&margin>=.12)||(top.image>=.90&&top.reference_count>0&&margin>=.06));
 const skillRecords=[];
 for(const f of sf){const z=await fileData(f),st=await ocr(z);skillRecords.push({filename:f.name,blob:z,ocr_text:st,skills:parseSkills(st)})}
 const skills=skillRecords.flatMap(x=>x.skills);
 const rec={id:'cs_'+Date.now(),character_id:auto?top.id:null,match_status:auto?'CONFIRMED':'CANDIDATE',
  match_stage:auto?5:4,match_confidence:top?.score||0,ocr_text:text,filename:cf.name,
  blob,features,skill_screenshot_count:sf.length,created_at:new Date().toISOString()};
 window.__csCtx={chars,refs,rec,features,skills,skillRecords};
 out.innerHTML='<div class="notice"><b>OCR:</b> '+esc(name||'未検出')+'<br><b>内部判定:</b> '+(auto?'🟢 自動確定':'🟡 候補・手動確認')+'<br><span class="hint">登録済みIDをOCRだけで見つけられない場合に備え、種別・タイトル一致、あいまい一致、画像参照を総合して候補化しています。</span></div>'+
  '<label>候補検索（ID・キャラクター名・種別）<input id="csCandidateSearch" type="search" placeholder="例：その視線の先に / 橘結衣 / CHR-"></label>'+
  '<div class="match-candidates" id="csCandidateRows">'+renderCandidateList(rows)+'</div>'+
  '<p class="hint" id="csCandidateCount">'+rows.length+'件の登録キャラクターを検索可能</p>'+
  '<p class="hint">🟢 自動確定条件を満たした場合も、選択中のIDを変更して手動修正できます。</p><button class="wide primary" id="csConfirm">✅ このIDで確定して登録</button>';
 $('#csCandidateSearch').oninput=e=>{$('#csCandidateRows').innerHTML=renderCandidateList(rows,e.target.value);const first=document.querySelector('input[name="csCandidate"]');if(first)first.checked=true;};
 skillOut.innerHTML=skills.length?'<div class="notice"><b>🧩 スキル解析 '+skills.length+'件</b><br>'+skills.map(s=>'・'+esc(s.name)+' / '+esc(s.target||'—')+' / '+(s.multiplier??'—')+'x / '+(s.tu??'—')+'TU / '+esc(s.status_effects.join(','))).join('<br>')+'</div>':'<p class="hint">スキルスクショから解析できたスキルはありません。画像を追加して再解析できます。</p>';
 $('#csConfirm').onclick=confirmRegistration;
}
async function confirmRegistration(){
 const ctx=window.__csCtx;if(!ctx)return;
 const selected=document.querySelector('input[name="csCandidate"]:checked')?.value;
 if(!selected)return alert('キャラクターIDを選択してください。');
 const c=ctx.chars.find(x=>x.id===selected);if(!c)return alert('選択したIDがDBにありません。');
 const d=await openDB(),ts=new Date().toISOString();
 ctx.rec.character_id=selected;ctx.rec.match_status='CONFIRMED';ctx.rec.match_stage=5;ctx.rec.match_confidence=1;ctx.rec.confirmed_at=ts;
 await put(d,'characterScreenshots',ctx.rec);
 await put(d,'characterImages',{id:'img_'+crypto.randomUUID(),character_id:selected,image_type:'card',blob:ctx.blob,features:ctx.features,verified:true,reference_scope:'character_variant',reference_name:c.name,reference_title:c.title||'',feature_version:'binder-v3',verification_source:'user_confirmed',created_at:ts});\n const githubUpload=window.GitHubImageStore?.uploadCharacterImage?await window.GitHubImageStore.uploadCharacterImage(selected,ctx.blob,{name:c.name,title:c.title||'',verification_source:'user_confirmed'}).catch(e=>({ok:false,error:e.message})):null;
 if(ctx.skills.length){
  const old=Array.isArray(c.skill_data?.skills)?c.skill_data.skills:[];
  const merged=[...old];
  for(const s of ctx.skills){
   const key=norm(s.name)+'|'+norm(s.target)+'|'+String(s.multiplier)+'|'+String(s.tu);
   if(!merged.some(x=>norm(x.name)+'|'+norm(x.target)+'|'+String(x.multiplier)+'|'+String(x.tu)===key))merged.push({...s,verification_status:'user_confirmed'});
  }
  c.skill_data=c.skill_data||{};c.skill_data.skills=merged;
  c.battle_profile=c.battle_profile||{};c.battle_profile.skills=merged;
  c.skills=merged;
  c.skill_screenshot_updated_at=ts;
  c.skill_source='character_screenshot_binder';
  await put(d,'characters',c);
  for(const s of ctx.skillRecords)await put(d,'characterSkillSources',{id:'skill_'+crypto.randomUUID(),character_id:selected,blob:s.blob,ocr_text:s.ocr_text,parsed_skills:s.skills,verified:true,verification_source:'user_confirmed',created_at:ts});
 }
 d.close();
 const out=$('#csResult');out.insertAdjacentHTML('beforeend','<div class="notice"><b>✅ 確定完了</b><br>'+esc(c.name)+' ['+esc(selected)+'] にキャラクター画像とスキル情報を登録しました。<br>次回以降、このスクショ画像を照合参照として使用します。</div>');
}
function install(){
 const sec=$('#characters');if(!sec||$('#characterScreenshotBinder'))return;
 const b=document.createElement('button');b.className='small primary';b.type='button';b.textContent='📷 スクショ登録';b.onclick=()=>$('#characterScreenshotBinder').classList.remove('hidden');
 sec.querySelector('.section-head')?.appendChild(b);
 const box=document.createElement('div');box.id='characterScreenshotBinder';box.className='card hidden';
 box.innerHTML='<h3>📷 キャラクター／スキル スクショ登録</h3>'+
 '<p class="hint">①キャラクタースクショを添付 → ②OCR＋登録済みのキャラクター別画像参照で内部判定 → ③画像一致が高信頼ならOCRなしでもIDを自動確定 → ④必要なら正しいIDを選択して確定。スキル掲載ページも複数添付すると、確定したキャラクターへスキル・倍率・TU・状態異常・条件を紐付けます。</p>'+
 '<label>キャラクタースクショ<input id="csCharFile" type="file" accept="image/*"></label>'+
 '<label>スキル掲載スクショ（複数可）<input id="csSkillFile" type="file" accept="image/*" multiple></label>'+
 '<button class="wide primary" id="csAnalyze">🔍 内部判定</button><div id="csResult"></div><div id="csSkillResult"></div>';
 sec.insertBefore(box,$('#characterForm'));
 $('#csAnalyze').onclick=()=>analyze().catch(e=>{$('#csResult').textContent='解析エラー: '+e.message});
}
window.GuildBattleCharacterScreenshot={analyze,confirmRegistration,parseSkills};
document.addEventListener('DOMContentLoaded',install);
})();

/* Guaranteed one-photo character registration UI v2026-10-06
   Character OCR bootstrap: if the main OCR module is missing, load it explicitly.
*/
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let modulePromise=null;

async function ensureOCRModule(){
  if(window.ParanoiseOCRNewCharacter?.analyze) return window.ParanoiseOCRNewCharacter;
  if(modulePromise) return modulePromise;
  modulePromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='character_ocr_new_registration.js?v=20261006-4';
    s.async=false;
    s.onload=()=>{
      if(window.ParanoiseOCRNewCharacter?.analyze) resolve(window.ParanoiseOCRNewCharacter);
      else reject(new Error('character_ocr_new_registration.js は読み込まれましたがOCR APIが登録されませんでした。'));
    };
    s.onerror=()=>reject(new Error('character_ocr_new_registration.js の読み込みに失敗しました。'));
    document.head.appendChild(s);
  }).catch(e=>{modulePromise=null;throw e});
  return modulePromise;
}

function ensure(){
 const section=$('#characters'),head=section?.querySelector('.section-head');
 if(!section||!head)return;
 let button=$('#oneShotCharacterRestoreButton');
 if(!button){
   button=document.createElement('button');button.type='button';button.id='oneShotCharacterRestoreButton';
   button.className='small primary';button.textContent='📷 1枚から登録';head.appendChild(button);
 }
 let box=$('#oneShotCharacterRestoreBox');
 if(!box){
   box=document.createElement('div');box.id='oneShotCharacterRestoreBox';box.className='card hidden';
   box.innerHTML=
    '<h3>📷 キャラクター詳細スクショ1枚登録</h3>'+
    '<p class="hint">1枚の詳細スクショ全体から、キャラクター名・種別・レアリティ・属性・役割・最大MP・スキル・キャラ画像をまとめて読み取ります。</p>'+
    '<label class="upload"><input id="oneShotCharacterFile" type="file" accept="image/*">詳細スクショを選択</label>'+
    '<button type="button" class="wide primary" id="oneShotCharacterAnalyze">🔍 画像全体を解析</button>'+
    '<div id="oneShotCharacterStatus" class="hint"></div>'+
    '<div id="oneShotCharacterFields"></div>';
   const form=$('#characterForm');section.insertBefore(box,form||null);
 }
 button.onclick=()=>{box.classList.toggle('hidden');if(!box.classList.contains('hidden'))box.scrollIntoView({behavior:'smooth',block:'start'})};
 const analyze=$('#oneShotCharacterAnalyze');
 if(analyze&&!analyze.dataset.bound){
   analyze.dataset.bound='1';
   analyze.onclick=async()=>{
    const f=$('#oneShotCharacterFile')?.files?.[0],st=$('#oneShotCharacterStatus'),fields=$('#oneShotCharacterFields');
    if(!f)return alert('キャラクター詳細スクショを選択してください。');
    analyze.disabled=true;st.textContent='OCRモジュールを確認しています…';fields.innerHTML='';
    try{
      const api=await ensureOCRModule();
      st.textContent='画像全体を解析しています…';
      const r=await api.analyze(f);window.__oneShotCharacterRestore=r;
      fields.innerHTML='<div class="notice"><b>キャラ名:</b> '+esc(r.name||'未検出')+
       '<br><b>統合名:</b> '+esc((r.name||'')+(r.title?'（'+r.title+'）':''))+
       '<br><b>種別:</b> '+esc(r.title||'未検出')+
       '<br><b>レアリティ:</b> '+esc(r.rarity||'未検出')+
       '<br><b>属性:</b> '+esc(r.element||'未検出')+
       '<br><b>役割:</b> '+esc(r.role||'未検出')+
       '<br><b>最大MP:</b> 6'+
       '<br><b>名前OCR信頼度:</b> '+Math.round((r.name_ocr_confidence||0)*100)+'%</div>'+
       '<div class="meta-grid">'+
       '<label>キャラクター名<input id="ocrFullName" value="'+esc(r.name)+'"></label>'+
       '<label>種別<input id="ocrFullTitle" value="'+esc(r.title||'')+'"></label>'+
       '<label>レアリティ<input id="ocrFullRarity" value="'+esc(r.rarity||'')+'"></label>'+
       '<label>属性<input id="ocrFullElement" value="'+esc(r.element||'')+'"></label>'+
       '<label>役割<input id="ocrFullRole" value="'+esc(r.role||'')+'"></label>'+
       '<label>最大MP<input id="ocrFullMP" value="6" readonly></label></div>'+
       '<label>スキル解析<textarea id="ocrFullSkills" rows="10">'+esc(JSON.stringify(r.skills||[],null,2))+'</textarea></label>'+
       '<label>OCR全文<textarea id="ocrFullRaw" rows="8">'+esc(r.ocr_text||'')+'</textarea></label>'+
       '<button type="button" class="wide primary" id="oneShotCharacterConfirm">✅ 内容を確認してキャラクターDBへ登録</button>';
      st.textContent='解析完了。内容を確認してから登録してください。';
      $('#oneShotCharacterConfirm').onclick=async()=>{
        try{
          const currentApi=await ensureOCRModule();
          if(!currentApi.confirmCreate)throw new Error('登録APIが利用できません');
          await currentApi.confirmCreate(r,r.existing_id||null);
          st.textContent='登録完了';
          fields.innerHTML='<div class="notice">✅ キャラクターDBへ登録しました。画像参照・スキルOCR・スクショ証拠も保存対象です。</div>';
          window.dispatchEvent(new CustomEvent('character-db-repository-recovered'));
        }catch(e){alert('登録エラー: '+(e.message||e));}
      };
    }catch(e){
      console.error('Character OCR bootstrap:',e);
      st.textContent='OCR起動エラー: '+(e.message||e);
    }finally{analyze.disabled=false}
   };
 }
}
document.addEventListener('DOMContentLoaded',ensure);
setTimeout(ensure,500);setTimeout(ensure,1500);setTimeout(ensure,3000);
new MutationObserver(ensure).observe(document.body,{childList:true,subtree:true});
window.GuildBattleOneShotCharacterUI={ensure,ensureOCRModule};
})();
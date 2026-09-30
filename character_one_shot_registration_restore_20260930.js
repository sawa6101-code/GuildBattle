/* Guaranteed one-photo character registration UI v2026-09-30
   Repairs the button/card even if the older OCR module failed to mount its UI.
   Uses ParanoiseOCRNewCharacter.analyze/confirmCreate when available.
*/
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function ensure(){
 const section=$('#characters'),head=section?.querySelector('.section-head');
 if(!section||!head)return;
 let button=$('#oneShotCharacterRestoreButton');
 if(!button){
   button=document.createElement('button');button.type='button';button.id='oneShotCharacterRestoreButton';button.className='small primary';button.textContent='📷 1枚から登録';head.appendChild(button);
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
    if(!window.ParanoiseOCRNewCharacter?.analyze)return st.textContent='OCRモジュールを読み込めません。ページを再読み込みしてください。';
    analyze.disabled=true;st.textContent='画像全体を解析しています…';fields.innerHTML='';
    try{
      const r=await window.ParanoiseOCRNewCharacter.analyze(f);window.__oneShotCharacterRestore=r;
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
          if(!window.ParanoiseOCRNewCharacter?.confirmCreate)throw new Error('登録モジュールを読み込めません');
          await window.ParanoiseOCRNewCharacter.confirmCreate(r,r.existing_id||null);
          st.textContent='登録完了';
          fields.innerHTML='<div class="notice">✅ キャラクターDBへ登録しました。画像参照・スキルOCR・スクショ証拠も保存対象です。</div>';
          window.dispatchEvent(new CustomEvent('character-db-repository-recovered'));
        }catch(e){alert('登録エラー: '+(e.message||e));}
      };
    }catch(e){st.textContent='解析エラー: '+(e.message||e);console.error(e)}
    finally{analyze.disabled=false}
   };
 }
}
document.addEventListener('DOMContentLoaded',ensure);
setTimeout(ensure,500);setTimeout(ensure,1500);setTimeout(ensure,3000);
new MutationObserver(ensure).observe(document.body,{childList:true,subtree:true});
window.GuildBattleOneShotCharacterUI={ensure};
})();
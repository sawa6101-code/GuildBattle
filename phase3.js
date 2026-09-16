/* Phase 3: screenshot OCR -> character name matching -> character ID -> PT update */
(function(){
  let imageFile=null;
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const escapeHtml=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const normalize=s=>String(s||'').normalize('NFKC').replace(/[\s　\-‐‑–—_:：,.、。・·]/g,'').toLowerCase();
  function similarity(a,b){a=normalize(a);b=normalize(b);if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return Math.min(a.length,b.length)/Math.max(a.length,b.length)*.96;let prev=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur}return 1-prev[b.length]/Math.max(a.length,b.length)}
  async function targets(){
    const gs=await all('guilds'),own=gs.find(g=>g.side==='OWN'),en=gs.filter(g=>g.side==='ENEMY').sort((a,b)=>a.guild_no-b.guild_no);
    q('#ocrGuild').innerHTML=en.map(g=>`<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join('');
    q('#ocrSide').value=q('#ocrSide').value||'own';
    await members();
  }
  async function members(){
    const side=q('#ocrSide').value,gs=await all('guilds'),gid=side==='own'?gs.find(g=>g.side==='OWN')?.id:q('#ocrGuild').value;
    const ms=(await all('members')).filter(m=>m.guild_id===gid).sort((a,b)=>a.member_no-b.member_no);
    q('#ocrMember').innerHTML=ms.map(m=>`<option value="${escapeHtml(m.id)}">${String(m.member_no).padStart(2,'0')} ${escapeHtml(m.name||'未登録')}</option>`).join('');
    q('#ocrGuildWrap').classList.toggle('hidden',side==='own');
  }
  function preview(){const f=q('#screenshotInput').files?.[0];imageFile=f||null;q('#imagePreview').innerHTML=f?`<img class="preview" src="${URL.createObjectURL(f)}">`:''}
  function lines(text){return [...new Set(text.split(/\n+/).map(x=>x.trim()).filter(x=>x.length>=2))].slice(0,80)}
  async function run(){
    if(!imageFile)return alert('スクリーンショットを選択してください。');
    const chars=await all('characters');if(!chars.length)return alert('先にキャラクターDBへキャラクター名とIDを登録してください。');
    const memberId=q('#ocrMember').value,partyNo=Number(q('#ocrParty').value);if(!memberId)return alert('更新先メンバーを選択してください.');
    const btn=q('#runOCR');btn.disabled=true;q('#ocrResults').innerHTML='';q('#ocrProgress').textContent='OCRエンジン起動中…';
    try{
      const result=await Tesseract.recognize(imageFile,'jpn+eng',{logger:m=>{if(m.status==='recognizing text')q('#ocrProgress').textContent=`OCR解析中 ${Math.round((m.progress||0)*100)}%`;else if(m.status)q('#ocrProgress').textContent=m.status}});
      const raw=result.data.text||'';
      const matches=lines(raw).map(line=>{let best=null;for(const c of chars){const s=similarity(line,c.name);if(!best||s>best.score)best={c,score:s}}return{line,...best}}).filter(x=>x.score>=.40).sort((a,b)=>b.score-a.score);
      const chosen=[];for(const m of matches){if(!chosen.some(x=>x.c.id===m.c.id))chosen.push(m);if(chosen.length===6)break}
      render(chosen,memberId,partyNo,raw,chars);
      q('#ocrProgress').textContent=`認識 ${lines(raw).length}行 / 候補 ${chosen.length}件`;
    }catch(e){console.error(e);q('#ocrProgress').textContent='';alert('OCR解析に失敗しました。画像を確認して再試行してください。')}finally{btn.disabled=false}
  }
  function render(chosen,memberId,partyNo,raw,chars){
    const opts=chars.sort((a,b)=>String(a.name).localeCompare(String(b.name),'ja'));
    const optionHtml=(sel)=>`<option value="">-- 未登録 --</option>`+opts.map(c=>`<option value="${escapeHtml(c.id)}" ${c.id===sel?'selected':''}>${escapeHtml(c.name)} [${escapeHtml(c.id)}]</option>`).join('');
    q('#ocrResults').innerHTML=`<div class="card"><h3>🔎 OCR認識結果</h3><p class="hint">信頼度70%以上を「高信頼」と表示。自動登録前に各枠を確認・変更できます。</p>${[0,1,2,3,4,5].map(i=>{const m=chosen[i];return `<div class="ocr-row"><b>${i+1}</b><div class="ocr-main">${m?`<span>OCR: ${escapeHtml(m.line)}</span><span>候補: <strong>${escapeHtml(m.c.name)}</strong> [${escapeHtml(m.c.id)}] ・ ${Math.round(m.score*100)}%</span>`:'<span>候補なし</span>'}</div><select data-ocr-slot="${i+1}">${optionHtml(m?.c.id||'')}</select></div>`}).join('')}<button class="wide primary" id="applyOCR">PT${partyNo}へ反映</button><details><summary>OCR生テキスト</summary><pre>${escapeHtml(raw)}</pre></details></div>`;
    q('#applyOCR').onclick=()=>apply(memberId,partyNo,imageFile.name);
  }
  async function apply(memberId,partyNo,fileName){
    const p=(await all('parties')).find(x=>x.member_id===memberId&&x.party_no===partyNo);if(!p)return alert('対象PTが見つかりません。');
    const chars=await all('characters'),pcs=await all('partyCharacters');let count=0;
    for(const sel of qa('[data-ocr-slot]')){const cid=sel.value;if(!cid)continue;const pos=Number(sel.dataset.ocrSlot);let pc=pcs.find(x=>x.party_id===p.id&&x.position===pos);if(!pc)pc={id:uid('pc'),party_id:p.id,position:pos};pc.character_id=cid;pc.character_name=chars.find(c=>c.id===cid)?.name||'';pc.source='screenshot_ocr';pc.source_file=fileName;pc.source_updated_at=now();pc.updated_at=now();await put('partyCharacters',pc);count++}
    await put('screenshots',{id:uid('shot'),target:`member:${memberId}:party:${partyNo}`,target_member_id:memberId,target_party_id:p.id,file_name:fileName,recognized_count:count,method:'tesseract-jpn+eng',created_at:now()});
    alert(`${count}枠をPT${partyNo}へ反映しました。`);if(typeof openMember==='function')openMember(memberId,'own');
  }
  function init(){
    q('#screenshotInput')?.addEventListener('change',preview);q('#runOCR')?.addEventListener('click',run);q('#ocrSide')?.addEventListener('change',targets);q('#ocrGuild')?.addEventListener('change',members);
    if(q('#import'))targets();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

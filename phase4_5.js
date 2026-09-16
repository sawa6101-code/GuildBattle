/* Phase 4.5 - 実戦ログ・動画/スクショ照合
 * 実測ログとシミュレーションイベントを行単位で正規化・整列し、差分を分類する。
 * 実測値は「事実」、シミュレーター側は「仮説」として扱い、差分から仕様候補を生成する。
 */
(function(){
  const $=s=>document.querySelector(s), arr=v=>Array.isArray(v)?v:[];
  const num=(v,d=null)=>{const n=Number(v);return Number.isFinite(n)?n:d};
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const norm=v=>String(v??'').trim().replace(/\s+/g,' ').toLowerCase();
  const keys=['tu','actor','skill','targets','damage','status','passive'];

  function parseLine(line){
    const raw=String(line||'').trim(); if(!raw)return null;
    try{const o=JSON.parse(raw);return normalize(o,'actual')}catch{}
    let m=raw.match(/^(?:(\d+(?:\.\d+)?)\s*TU[｜| ]*)?([^｜|:]+?)(?:\s*[→＞>]\s*([^｜|:]+?))?(?:\s*[｜|]\s*(.+))?$/);
    if(!m)return {raw,source:'actual',parse_status:'unparsed'};
    const tail=m[4]||'';
    const skill=(tail.match(/(?:skill|スキル)\s*[:：]?\s*([^｜|,]+)/i)||[])[1]||tail.match(/([^｜|]+?)(?:\s+)(\d+(?:\.\d+)?)\s*(?:damage|ダメージ)/i)?.[1]||'';
    const dmg=(tail.match(/(?:damage|ダメージ)\s*[:：]?\s*(\d+(?:\.\d+)?)/i)||[])[1]||tail.match(/(\d+(?:\.\d+)?)\s*(?:damage|ダメージ)/i)?.[1];
    const status=(tail.match(/(?:status|状態異常)\s*[:：]?\s*([^｜|,]+)/i)||[])[1]||'';
    const passive=(tail.match(/(?:passive|パッシブ)\s*[:：]?\s*([^｜|,]+)/i)||[])[1]||'';
    return normalize({tu:m[1],actor:m[2],targets:m[3]?[m[3]]:[],skill,damage:dmg,status,passive,raw},'actual');
  }
  function normalize(e,source){
    const o={...e,source:source||e.source||'actual'};
    o.tu=num(o.tu);o.actor=String(o.actor||'').trim();o.skill=String(o.skill||'').trim();o.targets=Array.isArray(o.targets)?o.targets.map(x=>String(x).trim()).filter(Boolean):String(o.targets||'').split(/[,、/]/).map(x=>x.trim()).filter(Boolean);o.damage=num(o.damage);o.status=String(o.status||'').trim();o.passive=String(o.passive||'').trim();return o;
  }
  function simEvents(){const r=window.__phase45SimResult;if(r?.events)return r.events.map(e=>normalize(e,'sim'));const p=window.ParanoisePhase44;if(p?.lastResult?.events)return p.lastResult.events.map(e=>normalize(e,'sim'));return []}
  function actualRows(){const ta=$('#actualLog45');if(!ta)return[];return ta.value.split(/\n+/).map(parseLine).filter(Boolean)}
  function fieldDiff(a,b,k){if(k==='targets'){const x=arr(a.targets).map(norm).sort(),y=arr(b.targets).map(norm).sort();return JSON.stringify(x)!==JSON.stringify(y)}if(k==='tu'){return a.tu!=null&&b.tu!=null&&Math.abs(a.tu-b.tu)>num($('#tuTolerance45')?.value,0)}if(k==='damage'){return a.damage!=null&&b.damage!=null&&a.damage!==b.damage}return norm(a[k])!==norm(b[k]);}
  function compare(actual,sim){
    const out=[], used=new Set(), windowSize=num($('#alignWindow45')?.value,2);
    for(let i=0;i<actual.length;i++){
      const a=actual[i];let best=-1,bestScore=-1;
      for(let j=Math.max(0,i-windowSize);j<Math.min(sim.length,i+windowSize+1);j++)if(!used.has(j)){
        const s=sim[j];let score=0;if(a.actor&&s.actor&&norm(a.actor)===norm(s.actor))score+=4;if(a.skill&&s.skill&&norm(a.skill)===norm(s.skill))score+=4;if(a.targets.length&&s.targets.length&&JSON.stringify(a.targets.map(norm).sort())===JSON.stringify(s.targets.map(norm).sort()))score+=3;if(a.tu!=null&&s.tu!=null&&Math.abs(a.tu-s.tu)<=num($('#tuTolerance45')?.value,0))score+=2;if(a.damage!=null&&s.damage!=null&&a.damage===s.damage)score+=2;if(score>bestScore){bestScore=score;best=j}}
      if(best<0||bestScore<2){out.push({row:i+1,actual:a,sim:null,diffs:['NO_MATCH']});continue}
      used.add(best);const s=sim[best],diffs=[];for(const k of keys)if(fieldDiff(a,s,k))diffs.push(k.toUpperCase());out.push({row:i+1,actual:a,sim:s,diffs});
    }
    for(let j=0;j<sim.length;j++)if(!used.has(j))out.push({row:actual.length+j+1,actual:null,sim:sim[j],diffs:['SIM_EXTRA']});
    return out;
  }
  function summarize(rows){const c={TOTAL:rows.length,MATCH:0,DIFF:0,NO_MATCH:0,SIM_EXTRA:0,TU:0,TARGETS:0,SKILL:0,DAMAGE:0,STATUS:0,PASSIVE:0};for(const r of rows){if(r.diffs.length===0)c.MATCH++;else c.DIFF++;for(const d of r.diffs){if(c[d]!=null)c[d]++;}}return c}
  function render(rows){const host=$('#diff45');if(!host)return;const s=summarize(rows);host.innerHTML=`<div class="card"><h3>🔎 Phase 4.5 照合結果</h3><div class="meta-grid">${Object.entries(s).map(([k,v])=>`<div><b>${esc(k)}</b><span>${v}</span></div>`).join('')}</div><div class="table-wrap"><table><thead><tr><th>#</th><th>実測</th><th>シミュレーター</th><th>差分</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.row}</td><td>${esc(fmt(r.actual))}</td><td>${esc(fmt(r.sim))}</td><td>${r.diffs.length?r.diffs.map(x=>`<span class="tag danger">${esc(x)}</span>`).join(' '):'<span class="tag">一致</span>'}</td></tr>`).join('')}</tbody></table></div><details><summary>仕様確定候補</summary><pre>${esc(JSON.stringify(proposals(rows),null,2))}</pre></details></div>`}
  function fmt(e){if(!e)return'—';return [e.tu!=null?`${e.tu}TU`:'',e.actor,e.skill,e.targets.length?`→${e.targets.join('/')}`:'',e.damage!=null?`${e.damage}dmg`:'',e.status,e.passive].filter(Boolean).join(' ')}
  function proposals(rows){const p=[];for(const r of rows){if(!r.sim||!r.actual)continue;for(const d of r.diffs){p.push({row:r.row,type:d,observed:r.actual[d.toLowerCase()],simulated:r.sim[d.toLowerCase()],status:'VERIFY'})}}return p}
  async function runCompare(){let actual=actualRows();if(!actual.length){const j=$('#actualJson45')?.value.trim();if(j)try{const x=JSON.parse(j);actual=Array.isArray(x)?x.map(e=>normalize(e,'actual')):arr(x.events).map(e=>normalize(e,'actual'))}catch(e){alert('実戦ログJSONを解析できません。')}}const sim=simEvents();if(!sim.length){alert('先にPhase 4.4のシミュレーションを実行してください。');return}const rows=compare(actual,sim);render(rows);window.__phase45Last={actual,sim,rows};try{await put('settings',{key:'phase4_5_last_comparison',updated_at:new Date().toISOString(),summary:summarize(rows),rows})}catch{}}
  function usePhase44(){const p=window.ParanoisePhase44;if(!p)return alert('Phase 4.4が読み込まれていません。');if(p.lastResult)window.__phase45SimResult=p.lastResult;else alert('Phase 4.4の検証結果を保持するには再実行してください。')}
  function ocrFiles(files){const input=files?.[0];if(!input||!window.Tesseract)return;const status=$('#ocr45Status');status.textContent='OCR解析中…';Tesseract.recognize(input,'jpn+eng',{logger:m=>{if(m.status&&m.progress)status.textContent=`OCR ${m.status} ${Math.round(m.progress*100)}%`}}).then(({data})=>{$('#actualLog45').value=data.text;status.textContent='OCR完了。行を確認して照合してください。'}).catch(e=>status.textContent='OCR失敗: '+e.message)}
  function install(){if($('#phase45'))return;const battle=$('#battle');if(!battle)return;const box=document.createElement('div');box.id='phase45';box.className='card';box.innerHTML=`<h3>🧪 Phase 4.5 実戦ログ照合</h3><p class="hint">実戦スクショのOCR、手入力ログ、JSONログを実測値として取り込み、Phase 4.4のイベント列と行単位で整列します。</p><label>実戦スクショ<input id="actualShot45" type="file" accept="image/*"></label><span id="ocr45Status" class="hint"></span><label>実戦ログ（1行=1イベント）<textarea id="actualLog45" rows="8" placeholder="例: 130TU｜橘 結衣｜アタック｜対象:敵A｜ダメージ:1200\n260TU｜敵A｜スタンアサルト｜対象:橘 結衣｜ダメージ:900｜状態異常:stun"></textarea></label><label>実戦JSON（任意）<textarea id="actualJson45" rows="5" placeholder='[{"tu":130,"actor":"橘 結衣","skill":"アタック","targets":["敵A"],"damage":1200}]'></textarea></label><div class="meta-grid"><label>TU許容差<input id="tuTolerance45" type="number" min="0" value="0"></label><label>行ズレ許容幅<input id="alignWindow45" type="number" min="0" max="10" value="2"></label></div><button id="captureSim45" class="wide">↻ Phase 4.4結果を照合対象へ</button><button id="runCompare45" class="wide primary">🔬 実戦 vs シミュレーター照合</button><div id="diff45"></div></div>`;battle.appendChild(box);$('#actualShot45').onchange=e=>ocrFiles(e.target.files);$('#captureSim45').onclick=usePhase44;$('#runCompare45').onclick=runCompare}
  window.ParanoisePhase45={parseLine,normalize,compare,runCompare,proposals};setTimeout(install,1200);new MutationObserver(install).observe(document.body,{subtree:true,childList:true});
})();

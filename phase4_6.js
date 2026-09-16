/* Phase 4.6 - 仕様学習・確定システム
 * Phase 4.5 の観測差分を集約し、反復して観測された差分から
 * 「仕様候補」を生成する。自動で公式仕様へ上書きせず、
 * 信頼度・観測回数・一貫性を条件にレビュー可能な候補として保存する。
 */
(function(){
  const $=s=>document.querySelector(s), arr=v=>Array.isArray(v)?v:[];
  const num=(v,d=null)=>{const n=Number(v);return Number.isFinite(n)?n:d};
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const norm=v=>String(v??'').trim().replace(/\s+/g,' ').toLowerCase();
  const pct=(n,d)=>d?Math.round(n/d*100):0;
  const RULE_KEY={TU:'tu',TARGETS:'targets',SKILL:'skill',DAMAGE:'damage',STATUS:'status',PASSIVE:'passive'};

  function observations(){
    const c=window.__phase45Last;
    if(c?.rows)return c.rows;
    return [];
  }
  function extract(rows){
    const map=new Map();
    for(const r of rows){
      if(!r.actual||!r.sim)continue;
      for(const d of arr(r.diffs)){
        if(!RULE_KEY[d])continue;
        const k=RULE_KEY[d], av=r.actual[k], sv=r.sim[k];
        if(av==null||av==='')continue;
        const scope=[r.actual.actor,r.actual.skill,k].map(norm).join('|');
        const sig=scope+'|OBS:'+JSON.stringify(av)+'|SIM:'+JSON.stringify(sv);
        if(!map.has(sig))map.set(sig,{id:'',type:d,scope,observed:av,simulated:sv,observations:0,consistent:0,rows:[],first_seen:null,last_seen:null});
        const x=map.get(sig);x.observations++;x.consistent++;x.rows.push(r.row);x.first_seen=x.first_seen||new Date().toISOString();x.last_seen=new Date().toISOString();
      }
    }
    return [...map.values()].map((x,i)=>({...x,id:'SPEC-'+String(i+1).padStart(4,'0'),consistency:x.observations?x.consistent/x.observations:0,confidence:Math.min(0.99,(1-Math.exp(-x.observations/3))*x.consistent/x.observations)}));
  }
  function classify(x){
    if(x.observations>=5&&x.confidence>=.9)return 'READY_REVIEW';
    if(x.observations>=3&&x.confidence>=.75)return 'REPEATED';
    return 'OBSERVED';
  }
  function makeCandidates(){return extract(observations()).map(x=>({...x,status:classify(x),recommendation:x.type==='DAMAGE'?'battle_rule_candidate':'character_db_candidate'}));}
  async function saveCandidates(){
    const c=makeCandidates();
    window.__phase46Candidates=c;
    try{await put('settings',{key:'phase4_6_candidates',updated_at:new Date().toISOString(),candidates:c})}catch(e){}
    render(c);return c;
  }
  function render(c){
    const h=$('#phase46List');if(!h)return;
    const counts=c.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});
    h.innerHTML=`<div class="meta-grid">${Object.entries(counts).map(([k,v])=>`<div><b>${esc(k)}</b><span>${v}</span></div>`).join('')}</div><div class="table-wrap"><table><thead><tr><th>ID</th><th>項目</th><th>対象</th><th>実測</th><th>現在値</th><th>回数</th><th>信頼度</th><th>状態</th><th>反映</th></tr></thead><tbody>${c.map(x=>`<tr><td>${x.id}</td><td>${esc(x.type)}</td><td>${esc(x.scope)}</td><td>${esc(JSON.stringify(x.observed))}</td><td>${esc(JSON.stringify(x.simulated))}</td><td>${x.observations}</td><td>${Math.round(x.confidence*100)}%</td><td><span class="tag">${x.status}</span></td><td><button data-promote="${x.id}">候補として保存</button></td></tr>`).join('')}</tbody></table></div>`;
    h.querySelectorAll('[data-promote]').forEach(b=>b.onclick=()=>promote(b.dataset.promote));
  }
  function candidate(id){return (window.__phase46Candidates||makeCandidates()).find(x=>x.id===id)}
  async function promote(id){
    const x=candidate(id);if(!x)return;
    if(x.status!=='READY_REVIEW'){if(!confirm('観測回数・一貫性がまだ十分ではありません。候補として保存しますか？'))return;}
    const record={id:x.id,type:x.type,scope:x.scope,observed:x.observed,simulated:x.simulated,observations:x.observations,confidence:x.confidence,status:'PENDING_REVIEW',created_at:new Date().toISOString()};
    try{await put('settings',{key:'spec_candidate_'+x.id,...record});}catch(e){}
    alert(`${x.id} を仕様候補として保存しました。\n自動で公式仕様へ上書きはしません。`);
  }
  function learnFromLast(){
    const c=makeCandidates();
    if(!c.length){alert('Phase 4.5の比較結果がありません。実戦ログとシミュレーターを比較してください。');return;}
    render(c);window.__phase46Candidates=c;
    saveCandidates();
  }
  function install(){
    if($('#phase46'))return;const battle=$('#battle');if(!battle)return;
    const box=document.createElement('div');box.id='phase46';box.className='card';
    box.innerHTML=`<h3>🧠 Phase 4.6 仕様学習・確定</h3><p class="hint">繰り返し観測された実戦差分を集約し、仕様候補を抽出します。観測事実と仮説を分離し、十分な反復確認がある候補だけレビュー対象にします。</p><button id="learn46" class="wide primary">🧠 差分から仕様候補を抽出</button><div id="phase46List"></div>`;
    battle.appendChild(box);$('#learn46').onclick=learnFromLast;
  }
  window.ParanoisePhase46={extract,makeCandidates,learnFromLast,promote};
  setTimeout(install,1600);new MutationObserver(install).observe(document.body,{subtree:true,childList:true});
})();

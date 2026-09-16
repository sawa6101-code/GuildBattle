/* Phase 4.8 - 実戦ケース自動生成・承認フロー
 * Phase 4.5 の比較結果を「実測値」を正とする回帰テスト候補へワンタップ登録する。
 * 自動で公式仕様へ反映せず、PENDING_APPROVAL -> APPROVED -> LOCKED の承認状態を持つ。
 */
(function(){
  const $=s=>document.querySelector(s), A=v=>Array.isArray(v)?v:[];
  const N=v=>String(v??'').trim().replace(/\s+/g,' ').toLowerCase();
  const num=(v,d=null)=>Number.isFinite(Number(v))?Number(v):d;
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const now=()=>new Date().toISOString();

  function partyId(side){
    const ids=side==='attack'?['#adv44Attack','#simAttack']:['#adv44Defense','#simDefense'];
    for(const id of ids){const el=$(id);if(el?.value)return el.value;}
    return null;
  }
  function event(e){
    return {
      time:num(e?.time??e?.tu), actor:e?.actor??e?.actorName??'', skill:e?.skill??e?.skillName??'',
      targets:A(e?.targets??e?.targetNames).map(x=>String(x)), damage:num(e?.damage),
      status:e?.status??e?.statusesApplied??'', passive:e?.passive??e?.passiveName??''
    };
  }
  function makeCase(name,comparison){
    const sim=window.ParanoisePhase44?.lastResult||window.__phase45SimResult||{};
    const actual=A(comparison?.actual).map(event);
    if(!actual.length)throw new Error('Phase 4.5 の実測イベントがありません。');
    const attack=partyId('attack'), defense=partyId('defense');
    if(!attack||!defense)throw new Error('攻撃側・防衛側PTを特定できません。戦闘シミュレーションのPTを選択してください。');
    return {
      id:'CASE-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
      name:name||('実戦ケース '+new Date().toLocaleString('ja-JP')),
      created_at:now(), source:'phase4_5_actual', approval_status:'PENDING_APPROVAL',
      attack_party_id:attack, defense_party_id:defense,
      expected_result:comparison.actual_result??null,
      expected_time:comparison.actual_time??null,
      expected_actions:comparison.actual_actions??null,
      expected_events:actual,
      actual_snapshot:{events:actual,summary:comparison.summary||null,rows:comparison.rows||[]},
      simulator_snapshot:{events:A(comparison.sim).map(event),result:sim.result??null,actions:sim.actions??null,time:sim.time??null,rules:sim.rules||{}},
      engine_version:'4.8',
      approved_at:null, locked_at:null
    };
  }
  async function save(x){
    if(typeof put!=='function')throw new Error('IndexedDB保存APIが利用できません。');
    await put('settings',{key:'phase4_7_case_'+x.id,...x});
    await put('settings',{key:'phase4_8_case_'+x.id,...x});
    return x;
  }
  async function registerFromLast(){
    const c=window.__phase45Last;
    if(!c?.actual?.length){alert('先にPhase 4.5で実戦ログとシミュレーターを照合してください。');return null;}
    let name=prompt('回帰テスト名','実戦ケース '+new Date().toLocaleString('ja-JP'));
    if(name===null)return null;
    try{
      const x=makeCase(name,c);
      await save(x);
      render([x,...await load()]);
      alert('実戦ケースを回帰テスト候補として登録しました。\n状態：承認待ち');
      return x;
    }catch(e){alert('登録できません：'+e.message);return null;}
  }
  async function load(){
    if(typeof all!=='function')return[];
    try{return (await all('settings')).filter(x=>String(x.key||'').startsWith('phase4_8_case_'));}catch{return[];}
  }
  async function updateStatus(x,status){
    const y={...x,approval_status:status};
    if(status==='APPROVED')y.approved_at=now();
    if(status==='LOCKED')y.locked_at=now();
    await save(y);return y;
  }
  async function approve(id){
    const x=(await load()).find(q=>q.id===id);if(!x)return;
    if(!confirm('この実戦ログを回帰テストの基準値として承認しますか？\n承認後も公式仕様DBは自動変更しません。'))return;
    await updateStatus(x,'APPROVED');render(await load());
  }
  async function lock(id){
    const x=(await load()).find(q=>q.id===id);if(!x)return;
    if(x.approval_status!=='APPROVED')return alert('先に承認してください。');
    if(!confirm('承認済みケースを回帰テストとしてロックしますか？'))return;
    await updateStatus(x,'LOCKED');render(await load());
  }
  async function remove(id){
    const x=(await load()).find(q=>q.id===id);if(!x)return;
    if(x.approval_status==='LOCKED')return alert('ロック済みケースは削除できません。');
    if(!confirm('この候補を削除しますか？'))return;
    try{await put('settings',{key:'phase4_8_case_'+id,deleted_at:now(),approval_status:'DELETED'});await put('settings',{key:'phase4_7_case_'+id,deleted_at:now(),approval_status:'DELETED'});}catch{}
    render(await load());
  }
  function render(list){
    const h=$('#phase48List');if(!h)return;
    h.innerHTML=`<div class="table-wrap"><table><thead><tr><th>ケース</th><th>状態</th><th>実戦イベント</th><th>操作</th></tr></thead><tbody>${list.map(x=>`<tr><td>${esc(x.name)}<br><small>${esc(x.id)}</small></td><td><span class="tag ${x.approval_status==='LOCKED'?'':'danger'}">${esc(x.approval_status)}</span></td><td>${A(x.expected_events).length}行</td><td>${x.approval_status==='PENDING_APPROVAL'?`<button data-approve="${x.id}">✅ 承認</button><button data-remove="${x.id}">削除</button>`:x.approval_status==='APPROVED'?`<button data-lock="${x.id}">🔒 回帰テストとしてロック</button>`:'🔒 固定済み'}</td></tr>`).join('')}</tbody></table></div>`;
    h.querySelectorAll('[data-approve]').forEach(b=>b.onclick=()=>approve(b.dataset.approve));
    h.querySelectorAll('[data-lock]').forEach(b=>b.onclick=()=>lock(b.dataset.lock));
    h.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>remove(b.dataset.remove));
  }
  async function install(){
    if($('#phase48'))return;const b=$('#battle');if(!b)return;
    const x=document.createElement('div');x.id='phase48';x.className='card';
    x.innerHTML=`<h3>📌 Phase 4.8 実戦ケース自動生成・承認</h3><p class="hint">Phase 4.5の実測イベントを基準値として回帰テスト候補を自動生成します。実測値をシミュレーター結果で上書きせず、承認・ロック後にPhase 4.7の回帰テストとして利用します。</p><div id="phase48List"></div>`;
    b.appendChild(x);render(await load());
  }
  window.ParanoisePhase48={makeCase,registerFromLast,load,approve,lock};
  setTimeout(install,2600);new MutationObserver(install).observe(document.body,{subtree:true,childList:true});
})();

/* Phase 4: battle simulation engine
 * Fixed rules: attacker TU=0, defender TU=50, auto battle, winner HP recovery,
 * fatigue accumulation, draw => defense win. Unknown game-specific formulas are
 * deliberately isolated as configurable provisional functions.
 */
(function(){
  const q=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const RULE={attackInitialTU:0,defenseInitialTU:50,maxTurns:500,fatigueIncrement:1};
  let initialized=false;

  async function partyLabel(p){
    const m=await get('members',p.member_id),g=m?await get('guilds',m.guild_id):null;
    return `${g?.side==='OWN'?'自軍':(g?.name||'敵ギルド')} / ${m?.name||`メンバー${m?.member_no??''}`} / PT${p.party_no}`;
  }
  async function populate(){
    if(typeof db==='undefined'||!db)return;
    const ps=await all('parties'),gs=await all('guilds'),ms=await all('members');
    const own=gs.find(g=>g.side==='OWN');
    const ownMs=ms.filter(m=>m.guild_id===own?.id);
    const ownPs=ps.filter(p=>ownMs.some(m=>m.id===p.member_id)).sort((a,b)=>a.member_id.localeCompare(b.member_id));
    const enemyPs=ps.filter(p=>{const m=ms.find(x=>x.id===p.member_id),g=gs.find(x=>x.id===m?.guild_id);return g?.side==='ENEMY'});
    const make=async p=>`<option value="${esc(p.id)}">${esc(await partyLabel(p))}</option>`;
    q('#simAttack').innerHTML=ownPs.length?await Promise.all(ownPs.map(make)).then(x=>x.join('')):'<option value="">自軍PTがありません</option>';
    q('#simDefense').innerHTML=enemyPs.length?await Promise.all(enemyPs.map(make)).then(x=>x.join('')):'<option value="">敵PTがありません</option>';
  }

  async function loadParty(partyId){
    const p=await get('parties',partyId); if(!p)throw new Error('PTが見つかりません');
    const pcs=(await all('partyCharacters')).filter(x=>x.party_id===partyId).sort((a,b)=>a.position-b.position);
    const chars=await all('characters');
    const units=pcs.map(pc=>{const c=chars.find(x=>x.id===pc.character_id);return {position:pc.position,id:pc.character_id,name:c?.name||pc.character_name||'未登録',maxHp:Number(c?.base_hp||0),attack:Number(c?.base_attack||0),defense:Number(c?.base_defense||0),speed:Number(c?.base_speed||0)}}).filter(u=>u.id);
    return {party:p,units};
  }

  // Provisional model only. It is intentionally isolated so official/game-specific
  // formulas can replace it later without changing the DB or UI.
  function effectiveStats(u,fatigue){
    // No numerical fatigue debuff is assumed because the supplied rule does not
    // specify its coefficient. fatigue is tracked, but multiplier remains 1.
    return {hp:Math.max(1,u.maxHp),attack:Math.max(0,u.attack),defense:Math.max(0,u.defense),speed:Math.max(1,u.speed)};
  }
  function damage(attacker,target){
    // Generic placeholder physical damage model. If stats are absent, total power
    // is not silently converted into damage; that would invent game mechanics.
    const raw=attacker.attack-(target.defense*0.5);
    return Math.max(1,Math.round(raw));
  }
  function runOnce(a,d,maxTurns){
    const A=a.units.map(u=>({...u,hp:effectiveStats(u,a.party.fatigue_value).hp,tu:RULE.attackInitialTU,alive:true}));
    const D=d.units.map(u=>({...u,hp:effectiveStats(u,d.party.fatigue_value).hp,tu:RULE.defenseInitialTU,alive:true}));
    const allUnits=()=>[...A.map(u=>({...u,side:'A'})),...D.map(u=>({...u,side:'D'}))].filter(u=>u.alive);
    let actions=0,log=[];
    while(actions<maxTurns && A.some(u=>u.alive) && D.some(u=>u.alive)){
      const actor=allUnits().sort((x,y)=>x.tu-y.tu || x.position-y.position || x.side.localeCompare(y.side))[0];
      const enemies=actor.side==='A'?D.filter(x=>x.alive):A.filter(x=>x.alive);
      const target=enemies.slice().sort((x,y)=>x.hp-y.hp || x.position-y.position)[0];
      if(!target)break;
      const st=effectiveStats(actor,actor.side==='A'?a.party.fatigue_value:d.party.fatigue_value);
      const dmg=damage(st,effectiveStats(target,target.side==='A'?a.party.fatigue_value:d.party.fatigue_value));
      target.hp=Math.max(0,target.hp-dmg);if(target.hp===0)target.alive=false;
      // Speed-to-TU relation is also provisional: faster units accumulate less TU.
      actor.tu+=Math.max(1,Math.round(1000/st.speed));
      actions++;
      if(log.length<80)log.push({actor:actor.name,target:target.name,damage:dmg,targetHp:target.hp,tu:actor.tu});
    }
    const aAlive=A.some(u=>u.alive),dAlive=D.some(u=>u.alive);
    let result=aAlive&&!dAlive?'ATTACK_WIN':dAlive&&!aAlive?'DEFENSE_WIN':'DRAW';
    if(result==='DRAW')result='DEFENSE_WIN';
    const attackHp=A.reduce((s,u)=>s+u.hp,0),defenseHp=D.reduce((s,u)=>s+u.hp,0);
    return {result,rawResult:(aAlive&&dAlive?'DRAW':result),actions,attackHp,defenseHp,log,A,D};
  }

  async function simulate(){
    const aid=q('#simAttack').value,did=q('#simDefense').value;if(!aid||!did)return alert('攻撃側と防衛側のPTを選択してください。');
    const max=Math.min(10000,Math.max(10,Number(q('#simMaxTurns').value)||RULE.maxTurns));
    const runs=Math.min(100,Math.max(1,Number(q('#simRuns').value)||1));
    const btn=q('#runSimulation');btn.disabled=true;q('#battleResult').innerHTML='<div class="card">シミュレーション中…</div>';
    try{
      const a=await loadParty(aid),d=await loadParty(did),results=[];
      for(let i=0;i<runs;i++)results.push(runOnce(a,d,max));
      const aw=results.filter(r=>r.result==='ATTACK_WIN').length,dw=results.length-aw;
      const rawDraw=results.filter(r=>r.rawResult==='DRAW').length;
      const first=results[0];
      const nextFatigueA=aw>dw?Number(a.party.fatigue_value||0)+RULE.fatigueIncrement:Number(a.party.fatigue_value||0);
      const nextFatigueD=dw>aw?Number(d.party.fatigue_value||0)+RULE.fatigueIncrement:Number(d.party.fatigue_value||0);
      const html=`<div class="card battle-result"><h3>📊 シミュレーション結果</h3><div class="result-main"><div><span>攻撃側</span><strong>${Math.round(aw/runs*100)}%</strong></div><div><span>防衛側</span><strong>${Math.round(dw/runs*100)}%</strong></div></div><div class="meta-grid"><div class="sim-stat"><span>攻撃勝利</span><b>${aw}/${runs}</b></div><div class="sim-stat"><span>防衛勝利</span><b>${dw}/${runs}</b></div><div class="sim-stat"><span>引き分け発生</span><b>${rawDraw}</b></div><div class="sim-stat"><span>第1回の行動数</span><b>${first.actions}</b></div></div><div class="battle-sides"><div><b>攻撃側残HP（第1回）</b><span>${first.attackHp}</span></div><div><b>防衛側残HP（第1回）</b><span>${first.defenseHp}</span></div></div><p class="hint">引き分けは確定ルールに従い、防衛側勝利として集計しています。勝利側は次戦開始時にHP回復。疲労は勝利側に+${RULE.fatigueIncrement}（暫定的な管理単位）として次状態へ引き継ぐ表示です。具体的な疲労減衰率は未確定のためステータス補正には適用していません。</p><details><summary>第1回の行動ログ</summary><div class="log">${first.log.map(x=>`<div>${esc(x.actor)} → ${esc(x.target)}　${x.damage} damage　残HP ${x.targetHp}</div>`).join('')}</div></details></div><div class="card"><h3>🔄 次戦状態（シミュレーション上）</h3><div class="battle-sides"><div><b>攻撃側疲労度</b><span>${nextFatigueA}</span><small>勝利時のみ蓄積</small></div><div><b>防衛側疲労度</b><span>${nextFatigueD}</span><small>勝利時のみ蓄積</small></div></div><p class="hint">勝利部隊のHPは回復状態で次戦へ進む、というルールを適用します。HP回復後の具体的な値は最大HPまで回復するモデルです。</p></div>`;
      q('#battleResult').innerHTML=html;
      await record(a,d,first,aw,runs);
    }catch(e){console.error(e);q('#battleResult').innerHTML=`<div class="card"><b>エラー</b><p>${esc(e.message||e)}</p></div>`}finally{btn.disabled=false}
  }

  async function record(a,d,r,aw,runs){
    const id=uid('match');
    await put('battleMatches',{id,sequence_no:1,attack_party_id:a.party.id,defense_party_id:d.party.id,attack_initial_tu:RULE.attackInitialTU,defense_initial_tu:RULE.defenseInitialTU,attack_fatigue:Number(a.party.fatigue_value||0),defense_fatigue:Number(d.party.fatigue_value||0),attack_hp:a.units.reduce((s,u)=>s+u.maxHp,0),defense_hp:d.units.reduce((s,u)=>s+u.maxHp,0),prediction_attack_rate:aw/runs,prediction_defense_rate:1-aw/runs,prediction_confidence:runs>1?'simulation':'baseline',status:'SIMULATED',created_at:new Date().toISOString()});
    await put('battleResults',{id:uid('result'),match_id:id,result:r.rawResult,attack_remaining_hp:r.attackHp,defense_remaining_hp:r.defenseHp,battle_turns:r.actions,attack_won:r.result==='ATTACK_WIN',defense_won:r.result==='DEFENSE_WIN',is_draw:r.rawResult==='DRAW',recorded_at:new Date().toISOString()});
  }

  function bind(){
    if(initialized)return;initialized=true;
    const navButtons=[...document.querySelectorAll('[data-view="battle"]')];navButtons.forEach(b=>b.addEventListener('click',()=>setTimeout(populate,50)));
    q('#runSimulation')?.addEventListener('click',simulate);
    setTimeout(populate,300);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();

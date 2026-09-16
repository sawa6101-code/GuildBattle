/* Phase 4.1 - advanced six-unit battle simulator
 * Uses per-character configurable skill/status/TU/target profiles.
 * IMPORTANT: only mechanics explicitly stored in the character profile are simulated.
 * Missing game-specific formulas fall back to transparent basic attacks; no invented
 * official values are silently applied.
 */
(function(){
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const RULE={attackTU:0,defenseTU:50,maxActions:500};
  const STATUS={poison:{type:'dot'},burn:{type:'dot'},stun:{type:'skip'},sleep:{type:'skip'},freeze:{type:'skip'},slow:{type:'speed'},attack_down:{type:'attack'},defense_down:{type:'defense'}};
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
  function parseProfile(c){
    let p={};
    for(const key of ['skill_data','battle_profile','tu_data']){if(c&&typeof c[key]==='object')Object.assign(p,c[key]);}
    const text=String(c?.skills||'').trim();
    if(text.startsWith('{')){try{Object.assign(p,JSON.parse(text))}catch{}}
    const effects=String(c?.status_effects||'').trim();
    if(effects.startsWith('{')){try{Object.assign(p,JSON.parse(effects))}catch{}}
    return p;
  }
  async function loadParty(id){
    const p=await get('parties',id);if(!p)throw Error('PTが見つかりません');
    const pcs=(await all('partyCharacters')).filter(x=>x.party_id===id).sort((a,b)=>a.position-b.position),cs=await all('characters');
    const units=pcs.map(pc=>{const c=cs.find(x=>x.id===pc.character_id);if(!c)return null;const prof=parseProfile(c);return {position:pc.position,id:c.id,name:c.name,maxHp:num(pc.hp||c.base_hp,1),hp:num(pc.hp||c.base_hp,1),attack:num(pc.attack||c.base_attack),defense:num(pc.defense||c.base_defense),speed:num(pc.speed||c.base_speed,1),profile:prof,alive:true,tu:0,statuses:[]}}).filter(Boolean);
    return {party:p,units};
  }
  function targets(actor,team,enemy){
    const rule=actor.profile?.target||actor.profile?.target_rule||'lowest_hp';
    const alive=(rule==='self'?team:enemy).filter(x=>x.alive);
    if(!alive.length)return null;
    if(rule==='highest_hp')return alive.slice().sort((a,b)=>b.hp-a.hp)[0];
    if(rule==='lowest_hp')return alive.slice().sort((a,b)=>a.hp-b.hp)[0];
    if(rule==='lowest_defense')return alive.slice().sort((a,b)=>effectiveDefense(a)-effectiveDefense(b))[0];
    if(rule==='highest_attack')return alive.slice().sort((a,b)=>effectiveAttack(b)-effectiveAttack(a))[0];
    if(rule==='front')return alive.slice().sort((a,b)=>a.position-b.position)[0];
    if(rule==='back')return alive.slice().sort((a,b)=>b.position-a.position)[0];
    return alive[0];
  }
  function hasStatus(u,s){return u.statuses.some(x=>x.name===s&&x.remaining>0)}
  function effectiveAttack(u){let v=u.attack;for(const s of u.statuses)if(s.name==='attack_down')v*=num(s.multiplier,.8);return Math.max(0,v)}
  function effectiveDefense(u){let v=u.defense;for(const s of u.statuses)if(s.name==='defense_down')v*=num(s.multiplier,.8);return Math.max(0,v)}
  function effectiveSpeed(u){let v=u.speed;for(const s of u.statuses)if(s.name==='slow')v*=num(s.multiplier,.8);return Math.max(1,v)}
  function applyStatus(target,spec){if(!spec)return;const name=String(spec.name||spec.type||'').toLowerCase();if(!name)return;target.statuses=target.statuses.filter(x=>x.name!==name);target.statuses.push({name,remaining:num(spec.turns??spec.duration,1),damage:num(spec.damage,0),multiplier:num(spec.multiplier,.8)});}
  function tickStatuses(u){for(const s of u.statuses){if(s.damage>0)u.hp=Math.max(0,u.hp-s.damage);s.remaining--;}u.statuses=u.statuses.filter(s=>s.remaining>0);if(u.hp<=0)u.alive=false}
  function cast(actor,target,log){
    const sk=actor.profile?.skill||actor.profile?.skills?.[0]||actor.profile?.active_skill;
    const skill=typeof sk==='object'?sk:null;
    if(!skill){const dmg=Math.max(1,Math.round(effectiveAttack(actor)-effectiveDefense(target)*.5));target.hp=Math.max(0,target.hp-dmg);if(target.hp===0)target.alive=false;log.push(`${actor.name} → ${target.name} 基本攻撃 ${dmg}`);return;}
    const type=skill.type||'damage',power=num(skill.power,1),mult=num(skill.multiplier,1),dmg=Math.max(0,Math.round(effectiveAttack(actor)*mult+power-effectiveDefense(target)*num(skill.defense_ratio,.5)));
    if(type==='heal'){const amount=Math.max(0,Math.round(effectiveAttack(actor)*mult+power));target.hp=Math.min(target.maxHp,target.hp+amount);log.push(`${actor.name} → ${target.name} 回復 ${amount}`)}
    else {target.hp=Math.max(0,target.hp-dmg);if(target.hp===0)target.alive=false;log.push(`${actor.name} → ${target.name} ${skill.name||'スキル'} ${dmg}`);if(skill.status)applyStatus(target,skill.status)}
  }
  function sim(A,D){
    const a=A.units.map((u,i)=>({...u,tu:RULE.attackTU+(i===0?0:i*.01)})),d=D.units.map((u,i)=>({...u,tu:RULE.defenseTU+(i===0?0:i*.01)}));
    const log=[];let actions=0;
    while(actions<RULE.maxActions&&a.some(x=>x.alive)&&d.some(x=>x.alive)){
      const alive=[...a.map(x=>({...x,side:'A'})),...d.map(x=>({...x,side:'D'}))].filter(x=>x.alive);
      alive.sort((x,y)=>x.tu-y.tu||x.position-y.position);
      const actor=alive[0],team=actor.side==='A'?a:d,enemy=actor.side==='A'?d:a;
      if(hasStatus(actor,'stun')||hasStatus(actor,'sleep')||hasStatus(actor,'freeze')){log.push(`${actor.name} 行動不能`);actor.tu+=Math.max(1,100/effectiveSpeed(actor));tickStatuses(actor);actions++;continue}
      const target=targets(actor,team,enemy);if(!target)break;
      tickStatuses(actor);if(!actor.alive)continue;cast(actor,target,log);actor.tu+=Math.max(1,100/effectiveSpeed(actor));actions++;
    }
    const aw=a.some(x=>x.alive),dw=d.some(x=>x.alive);const raw=aw&&!dw?'ATTACK_WIN':dw&&!aw?'DEFENSE_WIN':'DRAW';return {result:raw==='DRAW'?'DEFENSE_WIN':raw,raw,actions,A:a,D:d,log};
  }
  async function fill(){const ps=await all('parties'),gs=await all('guilds'),ms=await all('members');const own=gs.find(g=>g.side==='OWN'),om=ms.filter(m=>m.guild_id===own?.id);const ownps=ps.filter(p=>om.some(m=>m.id===p.member_id));const eps=ps.filter(p=>{const m=ms.find(x=>x.id===p.member_id),g=gs.find(x=>x.id===m?.guild_id);return g?.side==='ENEMY'});const label=async p=>{const m=ms.find(x=>x.id===p.member_id),g=gs.find(x=>x.id===m?.guild_id);return `${g?.side==='OWN'?'自軍':g?.name} / ${m?.name||'未登録'} / PT${p.party_no}`};for(const [id,list] of [['advAttack',ownps],['advDefense',eps]])$( '#'+id).innerHTML=list.length?(await Promise.all(list.map(async p=>`<option value="${p.id}">${esc(await label(p))}</option>`))).join(''):'<option value="">PTなし</option>'}
  async function run(){const aid=$('#advAttack').value,did=$('#advDefense').value;if(!aid||!did)return alert('攻撃側と防衛側のPTを選択してください。');const A=await loadParty(aid),D=await loadParty(did),r=sim(A,D);$('#advancedResult').innerHTML=`<div class="card"><h3>🧠 Phase 4.1 結果</h3><div class="result-main"><div><span>攻撃側</span><strong>${r.result==='ATTACK_WIN'?'勝利':'敗北'}</strong></div><div><span>防衛側</span><strong>${r.result==='DEFENSE_WIN'?'勝利':'敗北'}</strong></div></div><div class="meta-grid"><div class="sim-stat"><span>行動数</span><b>${r.actions}</b></div><div class="sim-stat"><span>判定前</span><b>${r.raw==='DRAW'?'引き分け':r.raw}</b></div><div class="sim-stat"><span>攻撃側残HP</span><b>${r.A.reduce((s,u)=>s+u.hp,0)}</b></div><div class="sim-stat"><span>防衛側残HP</span><b>${r.D.reduce((s,u)=>s+u.hp,0)}</b></div></div><details open><summary>戦闘ログ</summary><div class="log">${r.log.slice(0,150).map(x=>`<div>${esc(x)}</div>`).join('')}</div></details><p class="hint">引き分けは防衛側勝利。TU初期値は攻撃0 / 防衛50。スキル・状態異常・ターゲット指定はキャラクターDBのJSONプロフィールが存在する場合に使用します。未登録の詳細仕様は基本攻撃にフォールバックします。</p></div>`}
  function install(){if($('#advancedPanel'))return;const host=$('#battle');if(!host)return;const panel=document.createElement('div');panel.id='advancedPanel';panel.innerHTML=`<div class="card"><h3>🧠 Phase 4.1 詳細戦闘シミュレーション</h3><p class="hint">6キャラ個別のスキル、状態異常、TU、ターゲットルールをDBプロフィールから再現します。</p><label>攻撃側（自軍）<select id="advAttack"></select></label><label>防衛側（敵軍）<select id="advDefense"></select></label><button class="wide primary" id="runAdvanced">🧠 詳細シミュレーション</button></div><div id="advancedResult"></div>`;host.insertBefore(panel,host.querySelector('#battleResult'));$('#runAdvanced').onclick=run;fill()}
  const observer=new MutationObserver(()=>{if($('#battle')?.classList.contains('active')){install();fill()}});observer.observe(document.body,{attributes:true,subtree:true,attributeFilter:['class']});setTimeout(install,500);
})();

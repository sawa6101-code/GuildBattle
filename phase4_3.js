/* Phase 4.3 - Paranoise skill AI / target engine
 * Source-backed mechanics are represented when present in character DB.
 * Unknown game-internal AI priorities are configurable and never silently
 * presented as official behavior.
 */
(function(){
  const $=s=>document.querySelector(s);
  const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const alive=u=>u.alive&&u.hp>0;
  const pct=u=>u.maxHp?u.hp/u.maxHp:0;
  const arr=v=>Array.isArray(v)?v:[];
  const profile=c=>{let p={};for(const k of ['skill_data','battle_profile','tu_data'])if(c&&typeof c[k]==='object')Object.assign(p,c[k]);if(typeof c?.skills==='string'&&c.skills.trim().startsWith('{'))try{Object.assign(p,JSON.parse(c.skills))}catch{};return p};

  function normSkill(s){
    if(!s)return null;
    const name=String(s.name||'');
    const target=String(s.target||'enemy_single');
    let count=s.count;
    if(count==null){if(/全体/.test(name)||target==='enemy_all')count=99;else if(/2体|二体/.test(name)||target==='enemy_2')count=2;else count=1;}
    return {...s,name,target,count,tu:num(s.tu,130),multiplier:num(s.multiplier,1),ex:!!s.ex,uses:s.uses==null?null:num(s.uses)};
  }
  function canUse(skill,a,state){
    const c=skill.condition||{};
    if(c.hp_below_percent!=null&&!(pct(a)<num(c.hp_below_percent)/100))return false;
    if(c.hp_at_or_below_percent!=null&&!(pct(a)<=num(c.hp_at_or_below_percent)/100))return false;
    if(c.hp_above_percent!=null&&!(pct(a)>num(c.hp_above_percent)/100))return false;
    if(c.survive_tu!=null&&a.tu<num(c.survive_tu))return false;
    if(c.kills_gte!=null&&a.kills<num(c.kills_gte))return false;
    if(skill.ex&&skill._used)return false;
    if(skill.unlock_level!=null&&num(a.level,999)<num(skill.unlock_level))return false;
    if(c.enemy_tu_gte!=null&&!state.enemy.some(e=>alive(e)&&e.tu>=num(c.enemy_tu_gte)))return false;
    if(skill.target==='enemy_poisoned_single'&&!state.enemy.some(e=>alive(e)&&has(e,'poison')))return false;
    if(skill.target==='enemy_sleeping_single'&&!state.enemy.some(e=>alive(e)&&has(e,'sleep')))return false;
    return true;
  }
  function has(u,name){return arr(u.statuses).some(s=>s.name===name&&num(s.remaining,0)>0)}
  function targetPool(skill,a,team,enemy){
    const t=skill.target||'enemy_single';
    if(t==='self')return [a];
    if(t==='ally_single'||t==='ally_single_and_self')return team.filter(alive);
    return enemy.filter(alive);
  }
  function scoreTarget(u,skill){
    let s=0;
    if(skill.target==='enemy_sleeping_single'||skill.condition?.sleeping_target_multiplier)s+=has(u,'sleep')?1000:-1000;
    if(skill.target==='enemy_poisoned_single')s+=has(u,'poison')?1000:-1000;
    if(skill.target==='enemy_single')s+=(1-pct(u))*100;
    if(skill.target==='enemy_2'||skill.target==='enemy_all')s+=(1-pct(u))*10;
    return s;
  }
  function chooseTargets(skill,a,team,enemy){
    const pool=targetPool(skill,a,team,enemy).slice();
    if(!pool.length)return [];
    if(skill.target==='self')return [a];
    if(skill.target==='ally_single_and_self')return [pool.sort((x,y)=>pct(x)-pct(y))[0]];
    pool.sort((x,y)=>scoreTarget(y,skill)-scoreTarget(x,skill)||x.position-y.position);
    return skill.count>=99?pool:pool.slice(0,skill.count);
  }
  function chooseSkill(a,team,enemy,state){
    const skills=arr(a.profile?.skills||a.profile?.active_skills).map(normSkill).filter(Boolean).filter(s=>canUse(s,a,{enemy}));
    if(!skills.length)return {name:'アタック',target:'enemy_single',count:1,tu:130,multiplier:1,type:'damage',basic:true};
    // Deterministic AI priority: immediately available conditional skills > EX > special/status > attack.
    // Priority is an engine policy, not claimed as undocumented official AI logic.
    const rank=s=>{
      let r=0;
      const c=s.condition||{};
      if(c.hp_below_percent!=null)r+=50;
      if(c.survive_tu!=null)r+=45;
      if(c.kills_gte!=null)r+=45;
      if(c.enemy_tu_gte!=null)r+=40;
      if(s.target==='enemy_sleeping_single'||s.target==='enemy_poisoned_single'||c.sleeping_target_multiplier)r+=35;
      if(s.status||s.type==='status'||s.type==='damage_status')r+=25;
      if(s.heal_percent||s.type==='heal'||s.type==='heal_cleanse')r+=20;
      if(s.ex)r+=10;
      r+=num(s.multiplier,1)*2;
      r-=num(s.tu,130)/1000;
      return r;
    };
    skills.sort((x,y)=>rank(y)-rank(x));
    return skills[0];
  }
  function applyDamage(target,dmg,attacker,log){
    const was=target.hp;target.hp=Math.max(0,target.hp-dmg);
    if(target.hp<=0&&was>0){
      const root=target.profile?.passives||[];const guts=root.find(p=>p.name==='根性');
      if(guts&&was>1){target.hp=1;target.alive=true;log.push(`${target.name} 根性でHP1生存`)}else{target.hp=0;target.alive=false;attacker.kills=(attacker.kills||0)+1;log.push(`${target.name} 戦闘不能`);triggerDeathPassives(target,attacker,log)}
    }
  }
  function status(target,spec,log){if(!spec)return;const name=String(spec.name||spec.type||'').toLowerCase();if(!name)return;const chance=num(spec.chance,1);if(Math.random()>chance)return;target.statuses=target.statuses.filter(x=>x.name!==name);target.statuses.push({name,remaining:num(spec.tu??spec.duration,100),tuBased:true,damage:num(spec.damage,0)});log.push(`${target.name} に${name}付与`)}
  function triggerHitPassives(target,attacker,log){
    for(const p of arr(target.profile?.passives)){
      if(!/攻撃|被攻撃|攻撃された/.test(String(p.trigger||'')))continue;
      const n=String(p.name||'');const chance=Array.isArray(p.awakening)?num(p.awakening[Math.min(num(target.awakening,4),4)],0)/100:1;
      if(Math.random()>chance)continue;
      if(n.includes('反撃体勢')){attacker.tu=Math.max(0,attacker.tu-100);log.push(`${target.name} 反撃体勢 → 次回行動を獲得`)}
      if(n.includes('スタンスキン'))status(attacker,{name:'stun',tu:100,chance:1},log);
      if(n.includes('ポイズンスキン'))status(attacker,{name:'poison',chance:1},log);
      if(n.includes('スリープスキン'))status(attacker,{name:'sleep',chance:1},log);
    }
  }
  function triggerDeathPassives(dead,killer,log){
    for(const p of arr(dead.profile?.passives)){
      if(!/戦闘不能|致命傷/.test(String(p.trigger||'')))continue;
      const n=String(p.name||'');const chance=Array.isArray(p.awakening)?num(p.awakening[Math.min(num(dead.awakening,4),4)],0)/100:1;if(Math.random()>chance)continue;
      if(n.includes('復讐スリープ')){status(killer,{name:'sleep',chance:1},log)}
      if(n.includes('復讐スタン')){status(killer,{name:'stun',tu:150,chance:1},log)}
    }
  }
  function execute(skill,a,team,enemy,state,log){
    const targets=chooseTargets(skill,a,team,enemy);if(!targets.length)return false;
    const c=skill.conditions||[];let mult=num(skill.multiplier,1);
    if(c.length){for(const x of c){if(x.enemy_tu_gte!=null&&targets.some(t=>t.tu>=num(x.enemy_tu_gte)))mult=num(x.multiplier,mult);if(x.sleeping_target_multiplier&&targets.some(t=>has(t,'sleep')))mult=num(x.sleeping_target_multiplier,mult)}}
    for(const t of targets){
      if(skill.type==='heal'||skill.type==='heal_cleanse'){const amount=Math.round(t.maxHp*num(skill.heal_percent,0)/100);t.hp=Math.min(t.maxHp,t.hp+amount);if(skill.cleanse)t.statuses=[];log.push(`${a.name} → ${t.name} 回復 ${amount}`);continue}
      if(skill.type==='hp_swap'){const old=a.hp;a.hp=clamp(a.maxHp-old,1,a.maxHp);log.push(`${a.name} HP反転`);continue}
      const dmg=Math.max(1,Math.round(num(a.attack)*mult));applyDamage(t,dmg,a,log);log.push(`${a.name} → ${t.name} ${skill.name||'攻撃'} ${dmg}`);if(skill.status)status(t,skill.status,log);if(skill.target==='enemy_sleeping_single'&&has(t,'sleep')){}
    }
    if(skill.heal_percent){a.hp=Math.min(a.maxHp,a.hp+Math.round(a.maxHp*num(skill.heal_percent)/100))}
    if(skill.ex)skill._used=true;
    return true;
  }
  function simulate(A,D){
    const a=A.units.map(u=>({...u,statuses:[],tu:u.tu||0,kills:0,awakening:num(u.awakening,4)})),d=D.units.map(u=>({...u,statuses:[],tu:(u.tu||0)+50,kills:0,awakening:num(u.awakening,4)}));
    const log=[];let actions=0;const state={enemy:d};
    while(actions<500&&a.some(alive)&&d.some(alive)){
      const all=[...a.map(x=>({...x,side:'A'})),...d.map(x=>({...x,side:'D'}))].filter(alive).sort((x,y)=>x.tu-y.tu||x.position-y.position);const actor=all[0];const team=actor.side==='A'?a:d,enemy=actor.side==='A'?d:a;state.enemy=enemy;
      const blocked=has(actor,'stun')||has(actor,'sleep')||has(actor,'freeze');
      if(blocked){log.push(`${actor.name} 行動不能`);actor.tu+=100;actions++;continue}
      const skill=chooseSkill(actor,team,enemy,state);if(!execute(skill,actor,team,enemy,state,log)){actor.tu+=100;actions++;continue}
      triggerHitPassives(enemy.find(e=>e===chooseTargets(skill,actor,team,enemy)[0])||enemy[0],actor,log);
      actor.tu+=Math.max(1,num(skill.tu,130));actions++;
    }
    return {result:a.some(alive)&&!d.some(alive)?'ATTACK_WIN':d.some(alive)?'DEFENSE_WIN':'DRAW',actions,log,A:a,D:d};
  }
  async function load(id){const p=await get('parties',id);const pcs=(await all('partyCharacters')).filter(x=>x.party_id===id);const cs=await all('characters');const units=pcs.map(pc=>{const c=cs.find(x=>x.id===pc.character_id);if(!c)return null;const pr=profile(c);return {position:pc.position,id:c.id,name:c.name,maxHp:num(pc.hp||c.base_hp,1),hp:num(pc.hp||c.base_hp,1),attack:num(pc.attack||c.base_attack),defense:num(pc.defense||c.base_defense),speed:num(pc.speed||c.base_speed,1),profile:pr,level:pc.level||999,awakening:pc.awakening??4,alive:true,tu:0}}).filter(Boolean);return {party:p,units}}
  window.ParanoisePhase43={simulate,chooseSkill,chooseTargets};
  const old=window.ParanoisePhase41;
  async function run43(){const ai=$('#advAttack')?.value,di=$('#advDefense')?.value;if(!ai||!di)return alert('攻撃側と防衛側のPTを選択してください。');const A=await load(ai),D=await load(di),r=simulate(A,D);const host=$('#advancedResult');if(!host)return;host.insertAdjacentHTML('afterbegin',`<div class="card"><h3>🧠 Phase 4.3 スキルAI戦闘結果</h3><p><b>${r.result}</b> / 行動数 ${r.actions}</p><details open><summary>AI戦闘ログ</summary><div class="log">${r.log.slice(0,200).map(x=>`<div>${String(x).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}</div>`).join('')}</div></details><p class="hint">条件付きスキル、複数/全体対象、睡眠・毒特効、スタン、反撃、根性、HP/TU/生存TU/キル条件、EX1回制限、パッシブをDB定義に基づいて処理します。AI優先順位など未公開仕様はエンジン規則として明示的に扱います。</p></div>`)}
  function install(){const b=$('#advancedPanel');if(!b||$('#run43'))return;const btn=document.createElement('button');btn.id='run43';btn.className='wide primary';btn.textContent='🧠 Phase 4.3 実戦AIシミュレーション';btn.onclick=run43;b.appendChild(btn)}
  setTimeout(install,700);new MutationObserver(install).observe(document.body,{subtree:true,childList:true});
})();

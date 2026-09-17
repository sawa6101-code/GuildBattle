/* Phase 6.3 - 実戦進行・戦闘履歴・残存PT・疲労・HP時系列管理 */
(function(){
'use strict';

const VERSION='6.3.0';
const KEY='guildbattle_phase63_history';
const MAX_HISTORY=20;

function esc(v){
  return String(v==null?'':v).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
  });
}
function num(v,d){
  const n=Number(v);
  return Number.isFinite(n)?n:d;
}
function clone(v){
  try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}
}
function loadHistory(){
  try{
    const a=JSON.parse(localStorage.getItem(KEY)||'[]');
    return Array.isArray(a)?a:[];
  }catch(e){return [];}
}
function saveHistory(a){
  localStorage.setItem(KEY,JSON.stringify(a.slice(0,MAX_HISTORY)));
}
function partyId(p){
  return p&&p.id!=null?p.id:null;
}
function partyName(p){
  return p&&((p.name)||('PT-'+partyId(p)))||'';
}
function maxHp(p){
  const n=num(p&&p.hp_max,0);
  if(n>0)return n;
  return num(p&&p.hp_current,0);
}
function currentHp(p){
  const n=num(p&&p.__currentHp,NaN);
  return Number.isFinite(n)?n:maxHp(p);
}
function fatigue(p){
  return num(p&&p.__fatigue,0);
}
function fatigueRate(){
  const el=document.getElementById('p63FatigueRate');
  return Math.max(0,num(el&&el.value,0));
}
function applyFatigue(p){
  const base=clone(p);
  const f=fatigue(p);
  const mult=Math.max(0,1-f*fatigueRate());
  base.__fatigue=f;
  base.__fatigueMultiplier=mult;
  if(Array.isArray(base.characters)){
    base.characters.forEach(function(c){
      ['attack','defense','speed'].forEach(function(k){
        if(c[k]!=null)c[k]=num(c[k],0)*mult;
      });
    });
  }
  return base;
}
function snapshot(pool){
  return pool.map(function(p){
    return {
      id:partyId(p),name:partyName(p),hp_current:Math.max(0,currentHp(p)),
      hp_max:maxHp(p),fatigue:fatigue(p),fatigue_multiplier:
        Math.max(0,1-fatigue(p)*fatigueRate())
    };
  });
}
async function getAll(kind){
  if(typeof all==='function')return await all(kind);
  if(window.ParanoisePhase5&&typeof window.ParanoisePhase5.getAll==='function')
    return await window.ParanoisePhase5.getAll(kind);
  return [];
}
async function loadParty(id){
  if(window.ParanoisePhase44&&typeof window.ParanoisePhase44.load==='function')
    return await window.ParanoisePhase44.load(id);
  if(typeof get==='function')return await get('parties',id);
  return null;
}
async function simulate(a,d){
  if(!window.ParanoisePhase44||typeof window.ParanoisePhase44.simulate!=='function')
    throw new Error('Phase 4.4 エンジンが読み込まれていません');
  return await window.ParanoisePhase44.simulate(a,d,{});
}
function choose(pool,mode){
  if(!pool.length)return null;
  if(mode==='LOW_FATIGUE')
    return pool.slice().sort(function(a,b){return fatigue(a)-fatigue(b);})[0];
  if(mode==='HIGH_HP')
    return pool.slice().sort(function(a,b){return currentHp(b)-currentHp(a);})[0];
  return pool[0];
}
function resultOf(r){
  if(r&&r.result==='ATTACK_WIN')return 'ATTACK_WIN';
  if(r&&r.result==='DEFENSE_WIN')return 'DEFENSE_WIN';
  return 'DRAW';
}
function restoreWinner(p){
  p.__currentHp=maxHp(p);
}
function removeById(pool,id){
  return pool.filter(function(p){return partyId(p)!==id;});
}
function row(x){
  return '<tr><td>'+x.fight+'</td><td>'+esc(x.attackPartyName)+'</td><td>'+esc(x.defensePartyName)+'</td>'+
    '<td>'+x.attackHpBefore+'</td><td>'+x.defenseHpBefore+'</td>'+
    '<td>'+x.attackFatigue+'</td><td>'+x.defenseFatigue+'</td>'+
    '<td>'+esc(x.result)+'</td><td>'+x.attackHpAfter+'</td><td>'+x.defenseHpAfter+'</td>'+
    '<td>'+x.ownRemainingAfter+'</td><td>'+x.enemyRemainingAfter+'</td></tr>';
}
async function run(options){
  options=options||{};
  let rows=await getAll('parties');
  rows=Array.isArray(rows)?rows:[];
  let own=rows.filter(function(p){return p.side==='own'||p.side==='attack'||p.guild_no===0;});
  let enemy=rows.filter(function(p){return p.side==='enemy'||p.side==='defense'||(p.side!=='own'&&p.side!=='attack'&&p.guild_no!==0);});
  if(options.own&&options.own.length)own=options.own;
  if(options.enemy&&options.enemy.length)enemy=options.enemy;
  own=own.map(function(p){p=clone(p);p.__currentHp=maxHp(p);p.__fatigue=num(p.fatigue_value,0);return p;});
  enemy=enemy.map(function(p){p=clone(p);p.__currentHp=maxHp(p);p.__fatigue=num(p.fatigue_value,0);return p;});
  const maxBattles=Math.max(1,Math.min(500,num(options.maxBattles,100)));
  const modeA=options.attackMode||'ROUND_ROBIN';
  const modeD=options.defenseMode||'ROUND_ROBIN';
  const history=[];
  let fight=0;
  while(own.length&&enemy.length&&fight<maxBattles){
    fight++;
    const ap=choose(own,modeA);
    const dp=choose(enemy,modeD);
    const attackHpBefore=currentHp(ap), defenseHpBefore=currentHp(dp);
    const attackFatigue=fatigue(ap), defenseFatigue=fatigue(dp);
    const A=await loadParty(partyId(ap));
    const D=await loadParty(partyId(dp));
    if(!A||!D)throw new Error('PTデータを取得できません: '+partyId(!A?ap:dp));
    A.__currentHp=attackHpBefore;A.__fatigue=attackFatigue;
    D.__currentHp=defenseHpBefore;D.__fatigue=defenseFatigue;
    const r=await simulate(applyFatigue(A),applyFatigue(D));
    const result=resultOf(r);
    let attackHpAfter=0,defenseHpAfter=0;
    if(result==='ATTACK_WIN'){
      attackHpAfter=maxHp(ap);
      defenseHpAfter=0;
      ap.__currentHp=attackHpAfter;
      ap.__fatigue=attackFatigue+1;
      own=own.slice();
      enemy=removeById(enemy,partyId(dp));
    }else{
      attackHpAfter=0;
      defenseHpAfter=maxHp(dp);
      dp.__currentHp=defenseHpAfter;
      dp.__fatigue=defenseFatigue+1;
      own=removeById(own,partyId(ap));
      enemy=enemy.slice();
    }
    history.push({
      fight:fight,attackPartyId:partyId(ap),attackPartyName:partyName(ap),
      defensePartyId:partyId(dp),defensePartyName:partyName(dp),
      attackFatigue:attackFatigue,defenseFatigue:defenseFatigue,
      attackHpBefore:attackHpBefore,defenseHpBefore:defenseHpBefore,
      result:result,actions:num(r&&r.actions,0),time:num(r&&r.time,0),
      attackHpAfter:attackHpAfter,defenseHpAfter:defenseHpAfter,
      ownRemainingAfter:own.length,enemyRemainingAfter:enemy.length,
      ownSnapshot:snapshot(own),enemySnapshot:snapshot(enemy),
      rulesSnapshot:{attackStartTU:0,defenseStartTU:50,drawAsDefenseWin:true,
        winnerHpRestore:true,fatigueRate:fatigueRate()},
      engineVersion:(window.ParanoisePhase44&&window.ParanoisePhase44.VERSION)||'4.4',
      source:'phase6_3_simulation',timestamp:new Date().toISOString()
    });
  }
  const result={
    version:VERSION,createdAt:new Date().toISOString(),fightCount:history.length,
    rows:history,ownRemaining:snapshot(own),enemyRemaining:snapshot(enemy),
    settings:{maxBattles:maxBattles,attackMode:modeA,defenseMode:modeD,fatigueRate:fatigueRate()}
  };
  window.__phase63Last=result;
  return result;
}
function csv(result){
  const head=['fight','attackParty','defenseParty','attackHpBefore','defenseHpBefore','attackFatigue','defenseFatigue','result','attackHpAfter','defenseHpAfter','ownRemaining','enemyRemaining'];
  const out=[head.join(',')];
  (result.rows||[]).forEach(function(x){
    out.push([x.fight,x.attackPartyName,x.defensePartyName,x.attackHpBefore,x.defenseHpBefore,x.attackFatigue,x.defenseFatigue,x.result,x.attackHpAfter,x.defenseHpAfter,x.ownRemainingAfter,x.enemyRemainingAfter].map(function(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"';}).join(','));
  });
  return out.join('\n');
}
function download(text,name){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
  a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
}
function install(){
  if(document.getElementById('phase63'))return;
  const host=document.getElementById('phase53')||document.getElementById('battle')||document.getElementById('settings')||document.body;
  const box=document.createElement('section');box.id='phase63';box.className='card';
  box.innerHTML='<div class="section-head"><h2>🧭 Phase 6.3 実戦進行・時系列管理</h2></div>'+
    '<p class="hint">各戦闘のHP・疲労・残存PTを時系列で保持します。勝利PTは次戦前にHP最大値へ回復します。疲労係数は仮設定です。</p>'+
    '<div class="form-grid"><label>攻撃側方式<select id="p63AttackMode"><option>ROUND_ROBIN</option><option>LOW_FATIGUE</option><option>HIGH_HP</option></select></label>'+
    '<label>防衛側方式<select id="p63DefenseMode"><option>ROUND_ROBIN</option><option>LOW_FATIGUE</option><option>HIGH_HP</option></select></label>'+
    '<label>最大戦闘数<input id="p63Max" type="number" min="1" max="500" value="100"></label>'+
    '<label>疲労係数<input id="p63FatigueRate" type="number" min="0" max="1" step="0.001" value="0"></label></div>'+
    '<div class="actions"><button id="p63Run">▶ 実戦進行を開始</button><button id="p63Csv">CSV出力</button><button id="p63History">履歴表示</button></div>'+
    '<div id="p63Summary"></div><div style="overflow:auto"><table><thead><tr><th>戦</th><th>攻撃PT</th><th>防衛PT</th><th>攻撃HP前</th><th>防衛HP前</th><th>攻撃疲労</th><th>防衛疲労</th><th>結果</th><th>攻撃HP後</th><th>防衛HP後</th><th>自軍残存</th><th>敵軍残存</th></tr></thead><tbody id="p63Rows"></tbody></table></div>';
  host.appendChild(box);
  document.getElementById('p63Run').onclick=async function(){
    const b=this;b.disabled=true;
    try{
      const r=await run({attackMode:document.getElementById('p63AttackMode').value,defenseMode:document.getElementById('p63DefenseMode').value,maxBattles:num(document.getElementById('p63Max').value,100)});
      const h=loadHistory();h.unshift(r);saveHistory(h);
      document.getElementById('p63Summary').innerHTML='<p>戦闘数: '+r.fightCount+' / 自軍残存: '+r.ownRemaining.length+' / 敵軍残存: '+r.enemyRemaining.length+'</p>';
      document.getElementById('p63Rows').innerHTML=r.rows.map(row).join('');
    }catch(e){document.getElementById('p63Summary').textContent='エラー: '+e.message;}
    b.disabled=false;
  };
  document.getElementById('p63Csv').onclick=function(){if(window.__phase63Last)download(csv(window.__phase63Last),'guildbattle-phase6_3.csv');};
  document.getElementById('p63History').onclick=function(){
    const h=loadHistory();document.getElementById('p63Summary').innerHTML=h.length?h.map(function(x,i){return '<div>履歴 '+(i+1)+': '+esc(x.createdAt)+' / '+x.fightCount+'戦</div>';}).join(''):'履歴なし';
  };
}
window.ParanoisePhase63={run:run,loadHistory:loadHistory,saveHistory:saveHistory,csv:csv,install:install,VERSION:VERSION};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else setTimeout(install,0);
})();
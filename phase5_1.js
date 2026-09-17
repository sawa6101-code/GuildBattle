/* Phase 5.1 - 850PT対戦マトリクス・一括シミュレーション */
(function(){
 const $=s=>document.querySelector(s), A=v=>Array.isArray(v)?v:[], now=()=>new Date().toISOString();
 let rows=[],running=false;
 const getAll=()=>Promise.all(['guilds','members','parties'].map(all));
 async function load(){const [g,m,p]=await getAll(),gm=new Map(g.map(x=>[x.id,x])),mm=new Map(m.map(x=>[x.id,x]));
  rows=p.map(x=>{const mem=mm.get(x.member_id)||{},gu=gm.get(mem.guild_id)||{};return{p:x,m:mem,g:gu}});return rows}
 function candidates(r){const own=r.filter(x=>x.g.side==='OWN'),enemy=r.filter(x=>x.g.side==='ENEMY');return{own,enemy}}
 function ensure(){if($('#phase51'))return;const host=$('#settings')||$('#dashboard');if(!host)return;
  const x=document.createElement('div');x.id='phase51';x.className='card';x.innerHTML=`<h3>⚔️ Phase 5.1｜850PT対戦マトリクス</h3>
  <p class="hint">自軍50PT・敵軍最大800PTを対象に、対戦候補の抽出と一括シミュレーションを行います。全850PTを同時描画せず、結果は集計表示します。</p>
  <div id="p51Stats"></div><div class="meta-grid"><label>対象敵ギルド<select id="p51Guild"><option value="ALL">全ギルド</option></select></label>
  <label>試行回数<select id="p51Runs"><option>1</option><option selected>10</option><option>30</option><option>100</option></select></label></div>
  <div class="actions-inline"><button id="p51Build" class="primary">対戦候補を作成</button><button id="p51Run">一括シミュレーション</button></div>
  <div id="p51Progress" class="hint"></div><div id="p51Result" class="list"></div>`;host.appendChild(x);
  $('#p51Build').onclick=build;$('#p51Run').onclick=run;load().then(r=>{rows=r;const {own,enemy}=candidates(r);$('#p51Stats').innerHTML=`自軍 ${own.length} PT / 敵軍 ${enemy.length} PT / 最大組合せ ${own.length*enemy.length}`;const gs=[...new Map(enemy.map(x=>[x.g.id,x.g])).values()];$('#p51Guild').innerHTML='<option value="ALL">全ギルド</option>'+gs.sort((a,b)=>a.guild_no-b.guild_no).map(g=>`<option value="${g.id}">敵${g.guild_no} ${g.name||''}</option>`).join('')})}
 async function build(){const r=await load();rows=r;const {own,enemy}=candidates(r),gid=$('#p51Guild').value,es=gid==='ALL'?enemy:enemy.filter(x=>x.g.id===gid);const n=own.length*es.length;$('#p51Result').innerHTML=`<div class="row"><div class="row-main"><div class="row-title">対戦候補 ${n.toLocaleString()} 組</div><div class="row-sub">自軍 ${own.length}PT × 対象敵 ${es.length}PT</div></div></div>`;return{own,enemy:es}}
 async function run(){if(running)return;running=true;const {own,enemy}=await build(),runs=Number($('#p51Runs').value)||10,total=own.length*enemy.length,sim=window.ParanoisePhase44?.simulate,loadParty=window.ParanoisePhase44?.load;
  if(!sim||!loadParty){$('#p51Progress').textContent='戦闘エンジンを先に開いてください。';running=false;return}
  const results=[];let done=0;const started=performance.now();
  for(const a of own){for(const d of enemy){let win=0,draw=0;try{const ap=await loadParty(a.p.id),dp=await loadParty(d.p.id);for(let i=0;i<runs;i++){const z=sim(ap,dp,{});if(z?.winner==='ATTACK')win++;else if(z?.winner!=='DEFENSE')draw++}}catch(e){}done++;if(done%10===0||done===total)$('#p51Progress').textContent=`進捗 ${done.toLocaleString()} / ${total.toLocaleString()}（${((performance.now()-started)/1000).toFixed(1)}秒）`;results.push({a,d,win,draw,runs})}}
  results.sort((x,y)=>(y.win/y.runs)-(x.win/x.runs));const top=results.slice(0,50);$('#p51Result').innerHTML=top.map(x=>`<div class="row"><div class="badge">${(100*x.win/x.runs).toFixed(0)}%</div><div class="row-main"><div class="row-title">${x.a.g.name||'自軍'} / ${x.a.m.name||x.a.p.id} ↔ ${x.d.g.name||'敵'} / ${x.d.m.name||x.d.p.id}</div><div class="row-sub">試行 ${x.runs}回 ・ 攻撃側勝利 ${x.win} ・ 防衛側/未決着 ${x.runs-x.win}</div></div></div>`).join('')||'結果なし';running=false;return results}
 window.ParanoisePhase51={load,build,run};ensure();
})();
/* Phase 6.2 - 戦術パターン一括比較 */
(function(){
 const $=s=>document.querySelector(s);let running=false;
 function ensure(){
  if($('#phase62'))return;
  const host=$('#phase61')||$('#phase6')||$('#settings')||$('#dashboard');if(!host)return;
  const x=document.createElement('div');x.id='phase62';x.className='card';
  x.innerHTML='<h3>📈 Phase 6.2｜戦術パターン一括比較</h3><p class="hint">複数のPT選択戦術を同一条件で実行し、各試行の残存PT・戦闘数・結果を比較します。これはシミュレーション結果であり、ゲーム内仕様が未確定の部分は仮定値です。</p><div class="actions-inline"><button id="p62Run" class="primary">全パターン比較</button><button id="p62Clear">履歴消去</button></div><div id="p62Progress" class="hint"></div><div id="p62Result" class="list"></div>';
  host.appendChild(x);$('#p62Run').onclick=run;$('#p62Clear').onclick=()=>{localStorage.removeItem('guildbattle_phase62_history');$('#p62Result').innerHTML='';$('#p62Progress').textContent='履歴を消去しました。'};
 }
 async function run(){
  if(running)return;running=true;
  if(!window.ParanoisePhase61?.run){$('#p62Progress').textContent='Phase 6.1を先に読み込んでください。';running=false;return}
  const a=$('#p61A'),d=$('#p61D'),runs=$('#p61Runs'),max=$('#p61Max');if(!a||!d||!runs||!max){running=false;return}
  const patterns=[['ROUND_ROBIN','ROUND_ROBIN'],['LOW_FATIGUE','ROUND_ROBIN'],['HIGH_HP','ROUND_ROBIN'],['ROUND_ROBIN','LOW_FATIGUE'],['ROUND_ROBIN','HIGH_HP'],['LOW_FATIGUE','LOW_FATIGUE'],['HIGH_HP','HIGH_HP']];
  const original=[a.value,d.value,runs.value,max.value],out=[];
  for(let i=0;i<patterns.length;i++){
   a.value=patterns[i][0];d.value=patterns[i][1];runs.value='10';
   const z=await window.ParanoisePhase61.run();
   out.push({attack:patterns[i][0],defense:patterns[i][1],runs:z.runs,max:z.max,cleared:z.out.filter(x=>x.result==='ATTACK_SIDE_CLEARED').length,avgFights:z.out.reduce((s,x)=>s+x.fights,0)/z.out.length,avgOwn:z.out.reduce((s,x)=>s+x.ownRemaining,0)/z.out.length,avgEnemy:z.out.reduce((s,x)=>s+x.enemyRemaining,0)/z.out.length});
   $('#p62Progress').textContent='比較 '+(i+1)+' / '+patterns.length;
  }
  [a.value,d.value,runs.value,max.value]=original;
  const hist=JSON.parse(localStorage.getItem('guildbattle_phase62_history')||'[]');hist.push({at:new Date().toISOString(),results:out});localStorage.setItem('guildbattle_phase62_history',JSON.stringify(hist.slice(-20)));
  $('#p62Result').innerHTML=out.map(x=>'<div class="row"><div class="badge">'+x.cleared+'/'+x.runs+'</div><div class="row-main"><div class="row-title">'+x.attack+' × '+x.defense+'</div><div class="row-sub">平均戦闘数 '+x.avgFights.toFixed(1)+' ・自軍残 '+x.avgOwn.toFixed(1)+'PT ・敵軍残 '+x.avgEnemy.toFixed(1)+'PT</div></div></div>').join('');
  running=false;
 }
 window.ParanoisePhase62={run};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure);else ensure();
})();
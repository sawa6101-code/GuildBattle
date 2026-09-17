/* Phase 5.3 - 対戦結果マトリクス＋自動分析 */
(function(){
 const $=s=>document.querySelector(s),DB='phase5_2_cache',STORE='results';let data=[];
 const open=()=>new Promise((res,rej)=>{const q=indexedDB.open(DB,1);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
 const getAllCache=async()=>{const db=await open();return new Promise((r,j)=>{const q=db.transaction(STORE).objectStore(STORE).getAll();q.onsuccess=()=>r(q.result||[]);q.onerror=()=>j(q.error)})};
 async function loadRows(){return window.ParanoisePhase51?.load?.()||[]}
 function ensure(){
  if($('#phase53'))return;const host=$('#phase52')||$('#settings')||$('#dashboard');if(!host)return;
  const x=document.createElement('div');x.id='phase53';x.className='card';
  x.innerHTML='<h3>📊 Phase 5.3｜対戦結果マトリクス＋自動分析</h3><p class="hint">Phase 5.2で保存した結果を再計算せず、PT別・敵ギルド別に集計します。</p><div class="actions-inline"><button id="p53Refresh" class="primary">マトリクス更新</button><button id="p53Export">CSV出力</button></div><div id="p53Stats"></div><div class="meta-grid"><label>自軍PT<select id="p53Own"></select></label><label>敵ギルド<select id="p53Guild"><option value="ALL">全ギルド</option></select></label></div><div id="p53Summary" class="list"></div><div id="p53GuildSummary" class="list"></div>';
  host.appendChild(x);$('#p53Refresh').onclick=refresh;$('#p53Export').onclick=exportCSV;$('#p53Own').onchange=render;$('#p53Guild').onchange=render;refresh()
 }
 async function refresh(){
  const rows=await loadRows(),cache=await getAllCache(),map=new Map(rows.map(x=>[x.p.id,x]));data=[];
  for(const c of cache){const [a,d,runs]=String(c.key).split('|');if(!map.has(a)||!map.has(d)||c.error)continue;data.push({...c,runs:Number(runs)||c.runs||1,a:map.get(a),d:map.get(d)})}
  const own=[...new Map(data.map(x=>[x.a.p.id,x.a])).values()];
  $('#p53Own').innerHTML='<option value="ALL">全自軍PT</option>'+own.map(x=>'<option value="'+x.p.id+'">'+(x.m.name||x.p.id)+' / PT'+x.p.party_no+'</option>').join('');
  const gs=[...new Map(data.map(x=>[x.d.g.id,x.d.g])).values()];
  $('#p53Guild').innerHTML='<option value="ALL">全ギルド</option>'+gs.map(g=>'<option value="'+g.id+'">'+(g.name||'敵ギルド')+' ('+(g.guild_no||'')+')</option>').join('');
  $('#p53Stats').textContent='保存済み対戦結果 '+data.length.toLocaleString()+'件 / 対戦可能最大 40,000件';render();window.__phase53Data=data
 }
 function render(){
  const aid=$('#p53Own').value||'ALL',gid=$('#p53Guild').value||'ALL';
  let a=data.filter(x=>(aid==='ALL'||x.a.p.id===aid)&&(gid==='ALL'||x.d.g.id===gid));
  a.sort((x,y)=>(y.attack/y.runs)-(x.attack/x.runs));
  $('#p53Summary').innerHTML='<h4>PT別対戦結果</h4>'+a.slice(0,100).map(x=>'<div class="row"><div class="badge">'+(100*x.attack/x.runs).toFixed(0)+'%</div><div class="row-main"><div class="row-title">'+(x.a.m.name||x.a.p.id)+' / PT'+x.a.p.party_no+' ↔ '+(x.d.g.name||'敵')+' / '+(x.d.m.name||x.d.p.id)+' / PT'+x.d.p.party_no+'</div><div class="row-sub">攻撃勝利 '+x.attack+' ・ 防衛勝利 '+x.defense+' ・ 引分 '+x.draw+' ・ '+x.runs+'回</div></div></div>').join('')||'保存済み結果なし';
  const gm=new Map();for(const x of a){const k=x.d.g.id,v=gm.get(k)||{g:x.d.g,n:0,w:0,d:0,dr:0};v.n+=x.runs;v.w+=x.attack;v.d+=x.defense;v.dr+=x.draw;gm.set(k,v)}
  $('#p53GuildSummary').innerHTML='<h4>敵ギルド別集計</h4>'+[...gm.values()].map(v=>'<div class="row"><div class="badge">'+(100*v.w/v.n).toFixed(0)+'%</div><div class="row-main"><div class="row-title">'+(v.g.name||'敵ギルド')+' / '+(v.g.guild_no||'')+'</div><div class="row-sub">攻撃勝利 '+v.w+' ・ 防衛勝利 '+v.d+' ・ 引分 '+v.dr+' ・ '+v.n+'試行</div></div></div>').join('')||'集計なし'
 }
 function exportCSV(){const lines=['own_pt,own_member,enemy_guild,enemy_member,enemy_pt,runs,attack_win,defense_win,draw'];for(const x of data)lines.push([x.a.p.id,x.a.m.name||'',x.d.g.name||'',x.d.m.name||'',x.d.p.id,x.runs,x.attack,x.defense,x.draw].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','));const b=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='guildbattle_phase5_3_matrix.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
 window.ParanoisePhase53={refresh,exportCSV};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure);else ensure();
})();
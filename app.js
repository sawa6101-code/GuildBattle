const DB_NAME='paranoise-guildbattle';
const DB_VERSION=4;
const STORES=['guilds','members','parties','partyCharacters','characters','battleMatches','battleResults','fatigueHistory','screenshots','settings'];
let db=null,currentGuildId=null,currentMemberId=null,memberReturnView='own';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const uid=p=>`${p}_${crypto.randomUUID()}`;
const now=()=>new Date().toISOString();
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;const defs={guilds:'id',members:'id',parties:'id',partyCharacters:'id',characters:'id',battleMatches:'id',battleResults:'id',fatigueHistory:'id',screenshots:'id',settings:'key'};for(const [n,k] of Object.entries(defs)){let st;if(!d.objectStoreNames.contains(n))st=d.createObjectStore(n,{keyPath:k});else st=r.transaction.objectStore(n);if(n==='members'&&!st.indexNames.contains('guild_id'))st.createIndex('guild_id','guild_id');if(n==='parties'&&!st.indexNames.contains('member_id'))st.createIndex('member_id','member_id');if(n==='partyCharacters'){if(!st.indexNames.contains('party_id'))st.createIndex('party_id','party_id');if(!st.indexNames.contains('character_id'))st.createIndex('character_id','character_id')}if(n==='characters'){if(!st.indexNames.contains('name'))st.createIndex('name','name');if(!st.indexNames.contains('element'))st.createIndex('element','element');if(!st.indexNames.contains('rarity'))st.createIndex('rarity','rarity')}if(n==='screenshots'&&!st.indexNames.contains('target'))st.createIndex('target','target')}};r.onsuccess=()=>{db=r.result;db.onversionchange=()=>db.close();resolve(db)};r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('データベース更新が別タブでブロックされています。GuildBattleを他のタブでも開いている場合は閉じてください。'))})}
function store(name,mode='readonly'){return db.transaction(name,mode).objectStore(name)}
function all(name){return new Promise((res,rej)=>{const r=store(name).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function get(name,key){return new Promise((res,rej)=>{const r=store(name).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(name,obj){return new Promise((res,rej)=>{const r=store(name,'readwrite').put(obj);r.onsuccess=()=>res(obj);r.onerror=()=>rej(r.error)})}
function remove(name,key){return new Promise((res,rej)=>{const r=store(name,'readwrite').delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function clear(name){return new Promise((res,rej)=>{const r=store(name,'readwrite').clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function show(view){$$('.view').forEach(v=>v.classList.remove('active'));$('#'+view)?.classList.add('active');window.scrollTo({top:0,behavior:'smooth'});if(view==='dashboard')refreshStats();if(view==='own')renderOwn();if(view==='enemies')renderGuilds();if(view==='characters')renderCharacters()}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
async function createMemberSlot(guildId,no){const m={id:uid('member'),guild_id:guildId,member_no:no,name:'',active:true,memo:'',created_at:now(),updated_at:now()};await put('members',m);for(let n=1;n<=2;n++)await put('parties',{id:uid('party'),member_id:m.id,party_no:n,name:`PT${n}`,total_power:0,hp_current:0,hp_max:0,fatigue_value:0,fatigue_multiplier:1,battle_count:0,win_count:0,loss_count:0,draw_count:0,active:true,created_at:now(),updated_at:now()});return m}
async function ensureOwn(){let g=(await all('guilds')).find(x=>x.side==='OWN'||x.side==='own');if(!g){g={id:uid('guild'),name:'自軍ギルド',side:'OWN',guild_no:0,active:true,created_at:now(),updated_at:now()};await put('guilds',g)}return g}
async function deleteMember(id){
 const m=await get('members',id);if(!m)return;
 const label=m.name?.trim()?m.name.trim():'未登録';
 if(!confirm(`「${label}」を削除しますか？\\nメンバー情報・PT1/PT2・PT内キャラクター配置も削除されます。`))return;
 const pw=prompt('削除を実行するにはパスワードを入力してください。');
 if(pw!=='4323')return alert('パスワードが正しくありません。削除しませんでした。');
 const ps=(await all('parties')).filter(p=>p.member_id===id),pcs=await all('partyCharacters');
 for(const p of ps){for(const pc of pcs.filter(x=>x.party_id===p.id))await remove('partyCharacters',pc.id);await remove('parties',p.id);}
 await remove('members',id);
 if(window.currentMemberId===id)window.currentMemberId=null;
 await refreshStats();await renderOwn();await renderGuilds();
 alert(`「${label}」を削除しました。`);
}
async function addOwnMember(){try{const g=await ensureOwn();let ms=(await all('members')).filter(m=>m.guild_id===g.id).sort((a,b)=>a.member_no-b.member_no);let m=ms.find(x=>!String(x.name||'').trim());if(!m){if(ms.length>=25)return alert('自軍は最大25人です。');m=await createMemberSlot(g.id,ms.length+1)}const name=prompt('プレイヤー名');if(name===null||!name.trim())return;const level=Number(prompt('Lv（不明なら0）','0'))||0;const power=Number((prompt('戦力（不明なら0）','0')||'0').replace(/,/g,''))||0;const points=Number((prompt('野望ポイント（不明なら0）','0')||'0').replace(/,/g,''))||0;m.name=name.trim();m.profile_level=level;m.battle_power=power;m.ambition_points=points;m.source='manual';m.updated_at=now();await put('members',m);await renderOwn();await refreshStats();alert(name.trim()+'を自軍に登録しました。PT1/PT2を編集できます。')}catch(err){console.error('addOwnMember error',err);alert('自軍メンバー追加に失敗しました。\n'+(err?.message||String(err)))}}
async function addGuild(){const gs=(await all('guilds')).filter(g=>g.side==='ENEMY');if(gs.length>=16)return alert('敵ギルドは最大16ギルドです。');const name=prompt('ギルド名',`ギルド${String.fromCharCode(65+gs.length)}`);if(name===null)return;const no=gs.length+1;const g={id:uid('guild'),name:name.trim()||`ギルド${no}`,side:'ENEMY',guild_no:no,active:true,created_at:now(),updated_at:now()};await put('guilds',g);for(let i=1;i<=25;i++)await createMemberSlot(g.id,i);await renderGuilds();await refreshStats()}
async function refreshStats(){const gs=await all('guilds'),ms=await all('members'),ps=await all('parties'),cs=await all('characters');const own=gs.find(g=>g.side==='OWN');$('#ownCount').textContent=`${ms.filter(m=>m.guild_id===own?.id).length} / 25`;$(`#guildCount`).textContent=`${gs.filter(g=>g.side==='ENEMY').length} / 16`;const pc=$('#partyCount');if(pc)pc.textContent=ps.length;const cc=$('#characterCount');if(cc)cc.textContent=cs.length}
function memberRow(m,side){return `<div class="row"><div class="badge">${String(m.member_no).padStart(2,'0')}</div><div class="row-main"><div class="row-title">${esc(m.name)||'未登録'}</div><div class="row-sub">PT1 / PT2</div></div><div class="row-actions"><button onclick="openMember('${m.id}','${side}')">編集</button><button class="danger" onclick="deleteMember('${m.id}')">削除</button></div></div>`}
async function renderOwn(){const g=await ensureOwn();const ms=(await all('members')).filter(m=>m.guild_id===g.id).sort((a,b)=>a.member_no-b.member_no);$('#ownList').innerHTML=ms.map(m=>memberRow(m,'own')).join('');bindPlusButtons()}
async function renderGuilds(){const gs=(await all('guilds')).filter(g=>g.side==='ENEMY').sort((a,b)=>a.guild_no-b.guild_no);$('#guildList').innerHTML=gs.length?gs.map(g=>`<div class="row"><div class="badge">${String(g.guild_no).padStart(2,'0')}</div><div class="row-main"><div class="row-title">${esc(g.name)}</div><div class="row-sub">25人 / 50PT</div></div><div class="row-actions"><button onclick="openGuild('${g.id}')">開く</button></div></div>`).join(''):'<div class="empty">敵ギルドが未登録です。「＋」から追加してください。</div>';bindPlusButtons()}
async function openGuild(id){currentGuildId=id;const g=await get('guilds',id);const ms=(await all('members')).filter(m=>m.guild_id===id).sort((a,b)=>a.member_no-b.member_no);$('#guildTitle').textContent=g.name;$('#memberList').innerHTML=ms.map(m=>memberRow(m,'enemy')).join('');show('guildDetail')}
function charLabel(c){if(!c)return '未登録';return `${c.name||c.id} [${c.id}]${c.rarity?'・'+c.rarity:''}${c.element?'・'+c.element:''}`}
function charOptions(chars,selected){return `<option value="">-- キャラクター未登録 --</option>`+chars.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id),'ja',{numeric:true})).map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(charLabel(c))}</option>`).join('')}
async function openMember(id,side){if(!id)return;currentMemberId=id;window.__guildBattleCurrentMemberId=id;memberReturnView=side==='enemy'?'guildDetail':'own';window.memberReturnView=memberReturnView;const m=await get('members',id);$('#memberTitle').textContent=`${String(m.member_no).padStart(2,'0')} ${m.name||'未登録'}`;const ps=(await all('parties')).filter(p=>p.member_id===id).sort((a,b)=>a.party_no-b.party_no);const pcs=await all('partyCharacters'),chars=await all('characters');$('#partyEditor').innerHTML=`<div class="card"><label>メンバー名<input id="memberName" value="${esc(m.name)}" placeholder="プレイヤー名"></label><button class="wide primary" id="saveMember">メンバー名を保存</button></div>`+ps.map(p=>partyEditor(p,pcs.filter(x=>x.party_id===p.id),chars)).join('');$('#saveMember').onclick=async()=>{m.name=$('#memberName').value.trim();m.updated_at=now();await put('members',m);$('#memberTitle').textContent=`${String(m.member_no).padStart(2,'0')} ${m.name||'未登録'}`;if(memberReturnView==='own')renderOwn()};show('memberDetail')}
function partyEditor(p,pcs,chars){return `<details class="party" open><summary>PT${p.party_no}</summary><div class="party-body"><div class="meta-grid"><label>総戦力<input type="number" min="0" data-field="total_power" data-id="${p.id}" value="${p.total_power||0}"></label><label>最大HP<input type="number" min="0" data-field="hp_max" data-id="${p.id}" value="${p.hp_max||0}"></label><label>現在HP<input type="number" min="0" data-field="hp_current" data-id="${p.id}" value="${p.hp_current||0}"></label><label>疲労度<input type="number" step="0.01" data-field="fatigue_value" data-id="${p.id}" value="${p.fatigue_value||0}"></label></div><div class="meta-grid"><label>疲労補正倍率<input type="number" step="0.001" data-field="fatigue_multiplier" data-id="${p.id}" value="${p.fatigue_multiplier??1}"></label><label>戦闘数<input type="number" min="0" data-field="battle_count" data-id="${p.id}" value="${p.battle_count||0}"></label></div><h4>キャラクター配置（1～6）</h4>${[1,2,3,4,5,6].map(i=>{const x=pcs.find(z=>z.position===i);return `<div class="slot"><span>${i}</span><select data-slot="${i}" data-party="${p.id}">${charOptions(chars,x?.character_id||'')}</select><label class="awakening">凸<select data-awakening="${i}" data-party="${p.id}">${[0,1,2,3,4].map(n=>`<option value="${n}" ${Number(x?.awakening??0)===n?'selected':''}>★${n}</option>`).join('')}</select></label></div>`}).join('')}<div class="hint">登録済みキャラクターIDを参照して保存します。配置順は戦闘シミュレーション用に保持します。</div><button class="wide primary" onclick="saveParty('${p.id}')">PT${p.party_no}を保存</button></div></details>`}
async function saveParty(id){const p=await get('parties',id);$$(`[data-id="${id}"]`).forEach(i=>p[i.dataset.field]=Number(i.value)||0);const slots=$$(`[data-party="${id}"]`),pcs=await all('partyCharacters');for(const input of slots){let pc=pcs.find(x=>x.party_id===id&&x.position===Number(input.dataset.slot));const cid=input.value||null;if(!pc)pc={id:uid('pc'),party_id:id,position:Number(input.dataset.slot)};pc.character_id=cid;const aw=$(`[data-awakening="${id}"][data-party="${id}"]`).find(x=>Number(x.dataset.awakening)===Number(input.dataset.slot));pc.awakening=Math.max(0,Math.min(4,Number(aw?.value??pc.awakening??0)));pc.updated_at=now();if(cid){const c=await get('characters',cid);pc.character_name=c?.name||''}else pc.character_name='';await put('partyCharacters',pc)}p.updated_at=now();await put('parties',p);alert(`PT${p.party_no}を保存しました。`)}
async function nextCharacterId(){const cs=await all('characters');let n=1;while(cs.some(c=>c.id===`CHR-${String(n).padStart(4,'0')}`))n++;return `CHR-${String(n).padStart(4,'0')}`}
function characterForm(c={}){return `<div class="card"><div class="form-title">${c.id?'キャラクター編集':'新規キャラクター登録'}</div><div class="meta-grid"><label>キャラクターID<input id="charId" value="${esc(c.id||'')}" placeholder="空欄なら自動発行" ${c.id?'readonly':''}></label><label>キャラクター名<input id="charName" value="${esc(c.name||'')}" placeholder="キャラクター名"></label></div><div class="meta-grid"><label>レアリティ<input id="charRarity" value="${esc(c.rarity||'')}" placeholder="SSR / SR / R 等"></label><label>属性<input id="charElement" value="${esc(c.element||'')}" placeholder="属性"></label></div><div class="meta-grid"><label>基礎HP<input id="charHp" type="number" min="0" value="${c.base_hp||0}"></label><label>基礎攻撃<input id="charAtk" type="number" min="0" value="${c.base_attack||0}"></label></div><div class="meta-grid"><label>基礎防御<input id="charDef" type="number" min="0" value="${c.base_defense||0}"></label><label>基礎速度<input id="charSpeed" type="number" min="0" value="${c.base_speed||0}"></label></div><label>スキル/効果<textarea id="charSkills" rows="3" placeholder="スキル名・効果など">${esc(c.skills||'')}</textarea><label>状態異常・TU等<textarea id="charEffects" rows="3" placeholder="状態異常、TU、特殊仕様など">${esc(c.status_effects||'')}</textarea><div class="actions-inline"><button class="primary" id="saveCharacter">保存</button><button id="cancelCharacter">キャンセル</button></div></div>`}
async function openCharacterForm(id=null){const c=id?await get('characters',id):null;$('#characterForm').innerHTML=characterForm(c||{});$('#characterForm').classList.remove('hidden');$('#saveCharacter').onclick=async()=>{const name=$('#charName').value.trim();if(!name)return alert('キャラクター名を入力してください。');let cid=$('#charId').value.trim();if(!cid)cid=await nextCharacterId();const old=await get('characters',cid);if(old&&(!c||old.id!==c.id))return alert(`キャラクターID「${cid}」は既に使用されています。`);const obj={id:cid,name,rarity:$('#charRarity').value.trim(),element:$('#charElement').value.trim(),base_hp:Number($('#charHp').value)||0,base_attack:Number($('#charAtk').value)||0,base_defense:Number($('#charDef').value)||0,base_speed:Number($('#charSpeed').value)||0,skills:$('#charSkills').value.trim(),status_effects:$('#charEffects').value.trim(),version:old?.version||1,source:old?.source||'manual',active:true,created_at:old?.created_at||now(),updated_at:now()};await put('characters',obj);$('#characterForm').classList.add('hidden');await renderCharacters();await refreshStats();alert(`${name}（${cid}）を保存しました。`)};$('#cancelCharacter').onclick=()=>$('#characterForm').classList.add('hidden')}
function showCharacterDetail(id){(async()=>{const c=await get('characters',id);if(!c)return;const skills=Array.isArray(c.skills)?c.skills:[],passives=Array.isArray(c.passives)?c.passives:[];const skillHtml=skills.map(s=>'<div class="card"><b>'+esc(s.name||'未設定')+'</b><div>'+esc(s.type||'')+' / '+esc(s.target||'')+' / '+(s.multiplier??'—')+'倍 / '+(s.tu??'—')+'TU</div></div>').join('');const passiveHtml=passives.map(p=>'<div class="card"><b>'+esc(p.name||'パッシブ')+'</b><div>'+esc(p.effect||'')+'</div></div>').join('');$('#characterForm').innerHTML='<div class="card"><h3>🧬 '+esc(c.name)+'</h3><p>'+esc(c.id)+' / '+esc(c.rarity||'—')+' / '+esc(c.element||'—')+'</p><h4>パッシブ</h4>'+(passiveHtml||'<p>なし</p>')+'<h4>アクティブスキル</h4>'+(skillHtml||'<p>なし</p>')+'<p class="hint">検証: '+esc(c.verification_status||'未検証')+'</p><button class="wide" onclick="document.querySelector(\'#characterForm\').classList.add(\'hidden\')">閉じる</button></div>';$('#characterForm').classList.remove('hidden')})()}
async function renderCharacters(){const newBtn=$('#newCharacter');if(newBtn)newBtn.onclick=()=>openCharacterForm();const cs=await all('characters');$('#characterList').innerHTML=cs.length?cs.sort((a,b)=>String(a.id).localeCompare(String(b.id),'ja',{numeric:true})).map(c=>`<div class="row"><div class="badge">${esc(c.id)}</div><div class="row-main"><div class="row-title">${esc(c.name)}</div><div class="row-sub">${esc(c.rarity||'—')} ・ ${esc(c.element||'—')} ・ HP ${Number(c.base_hp||0).toLocaleString()} ・ ATK ${Number(c.base_attack||0).toLocaleString()}</div></div><div class="row-actions"><button onclick="showCharacterDetail('${esc(c.id)}')">詳細</button><button onclick="openCharacterForm('${esc(c.id)}')">編集</button><button onclick="deleteCharacter('${esc(c.id)}')">削除</button></div></div>`).join(''):'<div class="empty">キャラクターDBは空です。「＋」から登録してください。</div>'}
async function deleteCharacter(id){const refs=(await all('partyCharacters')).filter(x=>x.character_id===id);if(refs.length)return alert(`このキャラクターは${refs.length}個のPTで使用中のため削除できません。先にPTから外してください。`);if(!confirm(`キャラクターID「${id}」を削除しますか？`))return;await remove('characters',id);await renderCharacters();await refreshStats()}
if($('#screenshotInput'))$('#screenshotInput').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const url=URL.createObjectURL(f);if($('#imagePreview'))$('#imagePreview').innerHTML=`<img class="preview" src="${url}" alt="選択したスクリーンショット">`});
if($('#saveScreenshot'))$('#saveScreenshot').onclick=async()=>{const f=$('#screenshotInput')?.files[0];if(!f)return alert('画像を選択してください。');const target=$('#importTarget')?.value||'unknown';const reader=new FileReader();reader.onload=async()=>{await put('screenshots',{id:uid('shot'),target,name:f.name,type:f.type,data:reader.result,created_at:now(),status:'pending_ocr'});alert('スクリーンショットを保存しました。Phase 3のOCR接続待ちとして保存しました。')};reader.readAsDataURL(f)};
$('#exportData').onclick=async()=>{const out={schema_version:2,exported_at:now()};for(const s of STORES)out[s]=await all(s);const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='paranoise-guildbattle-backup-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('#restoreInput').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{try{const data=JSON.parse(r.result);for(const s of STORES)for(const x of(data[s]||[]))await put(s,x);await ensureOwn();await refreshStats();await renderOwn();await renderGuilds();await renderCharacters();alert('データを復元しました。')}catch(err){console.error(err);alert('JSONの読み込みに失敗しました。')}};r.readAsText(f)});
$('#resetData').onclick=async()=>{if(!confirm('すべての登録データを初期化します。よろしいですか？'))return;for(const s of STORES)await clear(s);await ensureOwn();await refreshStats();await renderOwn();await renderGuilds();await renderCharacters();alert('初期化しました。')};
async function cleanupRequestedData(){
 const pw=prompt('初回整理を実行するには管理パスワードを入力してください。');
 if(pw!=='4323')return alert('パスワードが正しくありません。整理を中止しました。');
 const own=(await all('guilds')).find(g=>g.side==='OWN'||g.side==='own');
 if(own){
   const ms=(await all('members')).filter(m=>m.guild_id===own.id&&(!String(m.name||'').trim()||m.name==='未登録'));
   for(const m of ms)await deleteMember(m.id);
 }
 const enemies=(await all('guilds')).filter(g=>g.side==='ENEMY'||g.side==='enemy').filter(g=>Number(g.guild_no)>=2&&Number(g.guild_no)<=16);
 for(const g of enemies){
   const ms=(await all('members')).filter(m=>m.guild_id===g.id);
   for(const m of ms){const ps=(await all('parties')).filter(p=>p.member_id===m.id),pcs=await all('partyCharacters');for(const p of ps){for(const pc of pcs.filter(x=>x.party_id===p.id))await remove('partyCharacters',pc.id);await remove('parties',p.id)}await remove('members',m.id)}
   await remove('guilds',g.id);
 }
 await refreshStats();await renderOwn();await renderGuilds();
 alert('自軍の未登録メンバーと敵ギルド2〜16を削除しました。');
}
window.deleteMember=deleteMember;window.cleanupRequestedData=cleanupRequestedData;
async function init(){await openDB();await ensureOwn();await refreshStats();await renderOwn();await renderCharacters();setupAppUpdater()}
/* App update controller */
const APP_VERSION='2026.09.19-v20';
function setupAppUpdater(){
  if(!('serviceWorker' in navigator))return;
  let reloading=false;
  const showStatus=t=>{const e=document.getElementById('appUpdateStatus');if(e)e.textContent=t};
  const reloadOnce=()=>{if(reloading)return;reloading=true;showStatus('最新版を適用しています…');location.reload()};
  navigator.serviceWorker.addEventListener('controllerchange',reloadOnce);
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
    const check=()=>reg.update().catch(()=>{});
    check();setInterval(check,30*60*1000);
    if(reg.waiting){showStatus('新しいバージョンがあります。');}
    reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller){showStatus('新しいバージョンを準備しました。');}})});
  }).catch(()=>{});
}
async function restoreGuildBattleData(){
  const status=document.getElementById('recoveryStatus');
  if(status)status.textContent='自軍・敵軍データを確認・復帰しています…';
  try{
    if(window.GuildBattleRecovery?.run) await window.GuildBattleRecovery.run();
    else if(window.GuildBattleRecovery?.restoreIfMissing) await window.GuildBattleRecovery.restoreIfMissing();
    await ensureOwn();await refreshStats();await renderOwn();await renderGuilds();await renderCharacters();
    if(status)status.textContent='自軍・敵軍データの復帰確認が完了しました。';
    alert('自軍・敵軍データの復帰確認が完了しました。');
  }catch(e){console.error('recovery error',e);if(status)status.textContent='復帰に失敗しました。';alert('データ復帰に失敗しました。\\n'+(e?.message||String(e)));}
}
async function forceAppUpdate(){
  if(!('serviceWorker' in navigator))return location.reload();
  const status=document.getElementById('appUpdateStatus');if(status)status.textContent='最新版を確認中…';
  try{
    const reg=await navigator.serviceWorker.getRegistration();
    if(!reg){location.reload();return;}
    await reg.update();
    const worker=reg.waiting||reg.installing;
    if(reg.waiting){reg.waiting.postMessage({type:'SKIP_WAITING'});return;}
    if(worker){worker.addEventListener('statechange',()=>{if(worker.state==='installed')worker.postMessage({type:'SKIP_WAITING'})});return;}
    if(status)status.textContent='現在すでに最新版です。';
  }catch(e){if(status)status.textContent='更新確認に失敗しました。再読み込みしてください。';}
}
window.restoreGuildBattleData=restoreGuildBattleData;window.openMember=openMember;window.openGuild=openGuild;window.addOwnMember=addOwnMember;window.openCharacterForm=openCharacterForm;window.saveParty=saveParty;window.deleteCharacter=deleteCharacter;window.showCharacterDetail=showCharacterDetail;window.renderCharacters=renderCharacters;window.refreshStats=refreshStats;
function bindPlusButtons(){const ag=$('#addGuild');if(ag)ag.onclick=e=>{e.preventDefault();e.stopPropagation();addGuild().catch(err=>{console.error(err);alert('敵ギルド追加に失敗しました。')})};const nc=$('#newCharacter');if(nc)nc.onclick=e=>{e.preventDefault();e.stopPropagation();openCharacterForm()};const ao=$('#addOwn');if(ao)ao.onclick=e=>{e.preventDefault();e.stopPropagation();addOwnMember().catch(err=>{console.error(err);alert('自軍メンバー追加に失敗しました。')})}}
const _show=show;show=async function(view){_show(view);setTimeout(bindPlusButtons,0)};
setTimeout(bindPlusButtons,0);init();

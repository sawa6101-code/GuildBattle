/* GuildBattle GitHub Character Image Store v1
   - Stores verified character card images in the public GitHub repository.
   - Keeps the GitHub token in memory only; never writes it to IndexedDB/localStorage.
   - Maintains data/character-images.json as the public image manifest.
   - Syncs GitHub images back into IndexedDB so the existing OCR/image matcher can use them.
*/
(function(){
'use strict';
const DB='paranoise-guildbattle', V=4;
const DEFAULT={owner:'sawa6101-code',repo:'GuildBattle',branch:'main',directory:'characters',manifest:'data/character-images.json'};
const CONFIG_KEY='github_character_image_store_v1';
let sessionToken='';

const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const now=()=>new Date().toISOString();
const uuid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+'_'+Math.random().toString(36).slice(2);

function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,V);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function all(d,n){return new Promise((ok,no)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function get(d,n,k){return new Promise((ok,no)=>{const r=d.transaction(n).objectStore(n).get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function put(d,n,x){return new Promise((ok,no)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>ok(x);r.onerror=()=>no(r.error)})}

async function config(){
 try{
  const d=await openDB();
  if(!d.objectStoreNames.contains('settings')){
   d.close();
   return Object.assign({},DEFAULT);
  }
  let c=await get(d,'settings',CONFIG_KEY);d.close();
  return Object.assign({},DEFAULT,c?.config||{});
 }catch(e){
  console.warn('GitHub image store config fallback:',e);
  return Object.assign({},DEFAULT);
 }
}
async function saveConfig(c){
 const d=await openDB();await put(d,'settings',{key:CONFIG_KEY,config:Object.assign({},DEFAULT,c),updated_at:now()});d.close();
}
function apiBase(c){return 'https://api.github.com/repos/'+encodeURIComponent(c.owner)+'/'+encodeURIComponent(c.repo)}
function rawBase(c){return 'https://raw.githubusercontent.com/'+c.owner+'/'+c.repo+'/'+c.branch}
function headers(){return {'Accept':'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2026-03-10','Authorization':'Bearer '+sessionToken}}

async function api(url,options={}){
 if(!sessionToken)throw new Error('GitHubアクセストークンが設定されていません');
 let r;
 try{
  r=await fetch(url,Object.assign({headers:headers()},options));
 }catch(e){
  const x=new Error('GitHub APIへの通信に失敗しました: '+(e?.message||String(e)));
  x.cause=e;
  x.networkError=true;
  throw x;
 }
 const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{}
 if(!r.ok){
  const msg=(data&&data.message)||'GitHub API HTTP '+r.status;
  const e=new Error('GitHub API '+r.status+': '+msg);
  e.status=r.status;e.githubMessage=msg;
  throw e;
}
 return data;
}
async function getFile(c,path){
 const r=await fetch(apiBase(c)+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(c.branch),{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'}});
 if(r.status===404)return null;
 const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{}
 if(!r.ok)throw new Error((d&&d.message)||('GitHub GET HTTP '+r.status));
 return d;
}
function dataUrlToBase64(dataUrl){const i=String(dataUrl).indexOf(',');return i>=0?dataUrl.slice(i+1):dataUrl}
function dataUrlMime(dataUrl){const m=String(dataUrl).match(/^data:([^;]+);base64,/);return m?m[1]:'image/jpeg'}
function loadImage(src){return new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(new Error('画像を読み込めません'));im.src=src})}
async function toOptimizedDataUrl(src){
 const im=await loadImage(src),max=768,scale=Math.min(1,max/Math.max(im.naturalWidth||im.width,im.naturalHeight||im.height));
 const w=Math.max(1,Math.round((im.naturalWidth||im.width)*scale)),h=Math.max(1,Math.round((im.naturalHeight||im.height)*scale));
 const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);
 let out=c.toDataURL('image/webp',.9),ext='webp',mime='image/webp';
 if(!out.startsWith('data:image/webp')){out=c.toDataURL('image/jpeg',.9);ext='jpg';mime='image/jpeg'}
 return {dataUrl:out,base64:dataUrlToBase64(out),ext,mime,width:w,height:h};
}
async function featuresFromBlob(blob){
 const src=URL.createObjectURL(blob);
 try{
  const im=await loadImage(src),out=[],crops=[[0,0,1,1,'full'],[0,0,.6,.7,'top-left'],[.2,0,.8,.8,'top-center'],[.4,0,.6,.8,'top-right'],[0,.15,1,.7,'center']];
  for(const [px,py,pw,ph,label] of crops){
   const c=document.createElement('canvas');c.width=c.height=32;
   const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,im.width*px,im.height*py,im.width*pw,im.height*ph,0,0,32,32);
   const p=x.getImageData(0,0,32,32).data,v=[];
   for(let i=0;i<p.length;i+=4)v.push(Math.round(p[i]/16),Math.round(p[i+1]/16),Math.round(p[i+2]/16));
   out.push({label,vector:v});
  }
  return out;
 }finally{URL.revokeObjectURL(src)}
}
async function uploadCharacterImage(characterId,source,meta={}){
 const c=await config();
 if(!sessionToken)return {ok:false,skipped:true,reason:'token_missing'};
 const optimized=await toOptimizedDataUrl(source);
 const path=c.directory+'/'+encodeURIComponent(String(characterId))+'.'+optimized.ext;
 const existing=await getFile(c,path);
 const body={message:'chore: update character image '+characterId,content:optimized.base64,branch:c.branch};
 if(existing?.sha)body.sha=existing.sha;
 const saved=await api(apiBase(c)+'/contents/'+path.split('/').map(encodeURIComponent).join('/'),{method:'PUT',body:JSON.stringify(body)});
 const imageUrl=rawBase(c)+'/'+path;
 const d=await openDB(),imgs=await all(d,'characterImages'),old=imgs.find(x=>x.character_id===characterId&&x.verified!==false);
 const blob=await (await fetch(optimized.dataUrl)).blob(),features=await featuresFromBlob(blob);
 const record=Object.assign({},old||{id:'img_'+uuid()},{
   character_id:characterId,image_type:'card',blob,features,verified:true,
   storage:'github',github_path:path,github_url:imageUrl,github_sha:saved?.content?.sha||existing?.sha||'',
   reference_scope:'character_variant',reference_name:meta.name||old?.reference_name||'',reference_title:meta.title||old?.reference_title||'',
   feature_version:'github-image-v1',verification_source:meta.verification_source||'user_confirmed',
   updated_at:now(),created_at:old?.created_at||now()
 });
 await put(d,'characterImages',record);d.close();
 await updateManifest(c,{character_id:characterId,path,url:imageUrl,sha:record.github_sha,name:meta.name||record.reference_name||'',title:meta.title||record.reference_title||'',updated_at:record.updated_at});
 return {ok:true,path,url:imageUrl,sha:record.github_sha};
}
async function readManifest(c){
 const f=await getFile(c,c.manifest);if(!f)return {sha:null,records:[]};
 let text='';try{text=atob(String(f.content||'').replace(/\n/g,''))}catch{throw new Error('画像マニフェストのBase64解析に失敗しました')}
 let data={};try{data=JSON.parse(text||'{}')}catch{throw new Error('画像マニフェストのJSON解析に失敗しました')}
 return {sha:f.sha,records:Array.isArray(data.records)?data.records:[]};
}
async function updateManifest(c,row){
 const m=await readManifest(c),map=new Map(m.records.map(x=>[x.character_id,x]));
 map.set(row.character_id,row);
 const payload={version:1,updated_at:now(),records:[...map.values()].sort((a,b)=>String(a.character_id).localeCompare(String(b.character_id)))};
 const body={message:'chore: update character image manifest',content:btoa(unescape(encodeURIComponent(JSON.stringify(payload,null,2)+'\n'))),branch:c.branch};
 if(m.sha)body.sha=m.sha;
 await api(apiBase(c)+'/contents/'+c.manifest.split('/').map(encodeURIComponent).join('/'),{method:'PUT',body:JSON.stringify(body)});
}
async function syncManifest(){
 const c=await config(),r=await fetch(rawBase(c)+'/'+c.manifest+'?ts='+Date.now(),{cache:'no-store'});
 if(r.status===404)return {count:0,missing:0};
 if(!r.ok)throw new Error('画像マニフェスト取得失敗 HTTP '+r.status);
 const manifest=await r.json(),rows=Array.isArray(manifest.records)?manifest.records:[];
 const d=await openDB(),imgs=await all(d,'characterImages');let count=0,missing=0;
 for(const row of rows){
  if(!row.character_id||!row.url)continue;
  try{
   const rr=await fetch(row.url,{cache:'no-store'});if(!rr.ok)throw new Error('image '+rr.status);
   const blob=await rr.blob(),features=await featuresFromBlob(blob),old=imgs.find(x=>x.character_id===row.character_id&&x.github_url===row.url);
   await put(d,'characterImages',Object.assign({},old||{id:'img_'+uuid()},{
     character_id:row.character_id,image_type:'card',blob,features,verified:true,storage:'github',
     github_path:row.path,github_url:row.url,github_sha:row.sha||'',reference_scope:'character_variant',
     reference_name:row.name||'',reference_title:row.title||'',feature_version:'github-image-v1',
     verification_source:'github_manifest',updated_at:now(),created_at:old?.created_at||now()
   }));count++;
  }catch(e){missing++;console.warn('GitHub character image sync:',row.character_id,e)}
 }
 d.close();window.dispatchEvent(new CustomEvent('github-character-images-synced',{detail:{count,missing}}));
 return {count,missing};
}
async function migrateLocalImages(progress){
 const d=await openDB(),imgs=await all(d,'characterImages'),chars=await all(d,'characters');d.close();
 const targets=imgs.filter(x=>x.character_id&&x.verified!==false&&x.blob&&!(x.github_url&&x.storage==='github'));
 let done=0,failed=0,results=[];
 for(const im of targets){
  try{
   const c=chars.find(x=>x.id===im.character_id);
   const r=await uploadCharacterImage(im.character_id,im.blob,{name:c?.name||im.reference_name||'',title:c?.title||im.reference_title||'',verification_source:'existing_local_verified_image'});
   if(r.ok)done++;else failed++;
   results.push({id:im.character_id,ok:r.ok,reason:r.reason||''});
  }catch(e){failed++;results.push({id:im.character_id,ok:false,error:e.message})}
  if(progress)progress({done,total:targets.length,failed,last:im.character_id});
 }
 return {total:targets.length,done,failed,results};
}
async function testConnection(){
 const c=Object.assign({},DEFAULT);
 const r=await api(apiBase(c));
 return {login:r?.owner?.login||'',repo:r?.full_name||'',private:!!r?.private};
}
function setToken(token){sessionToken=String(token||'').trim();return !!sessionToken}
function clearToken(){sessionToken=''}
function isConfigured(){return !!sessionToken}
function installUI(){
 const sec=document.querySelector('#settings .card:last-of-type');if(!sec||document.querySelector('#githubImageStoreCard'))return;
 const box=document.createElement('div');box.id='githubImageStoreCard';box.className='card';
 box.innerHTML='<h3>🖼️ GitHub画像マスター</h3>'+
 '<p class="hint">登録済みキャラクター画像をGitHubの <code>characters/</code> に保存し、全端末から共通参照します。アクセストークンはこのブラウザのセッション中だけメモリ保持し、IndexedDBには保存しません。</p>'+
 '<div class="meta-grid"><label>Owner<input id="ghImgOwner" value="'+esc(DEFAULT.owner)+'"></label><label>Repository<input id="ghImgRepo" value="'+esc(DEFAULT.repo)+'"></label><label>Branch<input id="ghImgBranch" value="'+esc(DEFAULT.branch)+'"></label></div>'+
 '<label>Fine-grained GitHub Token（Contents: Read and write）<input id="ghImgToken" type="password" autocomplete="off" placeholder="ghp_… / github_pat_…"></label>'+
 '<div class="actions"><button type="button" id="ghImgTest">接続テスト</button><button type="button" class="primary" id="ghImgMigrate">既存画像をGitHubへ移行</button><button type="button" id="ghImgSync">GitHub画像を端末へ同期</button><button type="button" id="ghImgClear">トークン消去</button></div>'+
 '<p id="ghImgStatus" class="hint"></p>';
 sec.parentNode.insertBefore(box,sec);
 const setStatus=t=>{const e=document.querySelector('#ghImgStatus');if(e)e.textContent=t};
 (async()=>{const c=await config();['owner','repo','branch'].forEach(k=>{const e=document.querySelector('#ghImg'+k[0].toUpperCase()+k.slice(1));if(e)e.value=c[k]})})();
 const saveFields=async()=>{const c=await config();c.owner=$('#ghImgOwner').value.trim()||DEFAULT.owner;c.repo=$('#ghImgRepo').value.trim()||DEFAULT.repo;c.branch=$('#ghImgBranch').value.trim()||DEFAULT.branch;await saveConfig(c);return c};
 document.querySelector('#ghImgTest').onclick=async()=>{try{await saveFields();if(!sessionToken){const t=$('#ghImgToken').value.trim();if(!t)return setStatus('トークンを入力してください。');setToken(t)}const r=await testConnection();setStatus('接続成功: '+r.repo+(r.private?'（private）':'（public）'))}catch(e){
  let msg=e.message||String(e);
  if(e.status===401)msg='認証失敗（401）。Tokenが無効/期限切れです。';
  else if(e.status===403)msg='権限拒否（403）。Fine-grained Tokenの対象リポジトリと権限を確認してください。';
  else if(e.status===404)msg='リポジトリが見つかりません（404）。Owner/Repositoryを確認してください。';
  else if(e.networkError)msg+='（ブラウザからGitHub APIへ接続できない可能性があります）';
  setStatus('接続失敗: '+msg);
}};
 document.querySelector('#ghImgMigrate').onclick=async()=>{try{await saveFields();if(!sessionToken){const t=$('#ghImgToken').value.trim();if(!t)return setStatus('トークンを入力してください。');setToken(t)}document.querySelector('#ghImgMigrate').disabled=true;const r=await migrateLocalImages(x=>setStatus('GitHub移行中 '+x.done+'/'+x.total+' / 失敗 '+x.failed+' / '+x.last));setStatus('移行完了: '+r.done+'件 / 失敗 '+r.failed+'件');}catch(e){setStatus('移行失敗: '+e.message)}finally{document.querySelector('#ghImgMigrate').disabled=false}};
 document.querySelector('#ghImgSync').onclick=async()=>{try{const r=await syncManifest();setStatus('GitHub画像同期: '+r.count+'件 / 取得失敗 '+r.missing+'件')}catch(e){setStatus('同期失敗: '+e.message)}};
 document.querySelector('#ghImgClear').onclick=()=>{clearToken();$('#ghImgToken').value='';setStatus('GitHubトークンをメモリから消去しました。')};
 document.querySelector('#ghImgToken').oninput=e=>{if(e.target.value.trim())setToken(e.target.value.trim())};
}
window.GitHubImageStore={config,saveConfig,setToken,clearToken,isConfigured,uploadCharacterImage,syncManifest,migrateLocalImages,testConnection};
document.addEventListener('DOMContentLoaded',()=>{installUI();setTimeout(()=>syncManifest().catch(e=>console.warn('GitHub image auto sync:',e.message)),1200)});
new MutationObserver(()=>installUI()).observe(document.body,{childList:true,subtree:true});
})();
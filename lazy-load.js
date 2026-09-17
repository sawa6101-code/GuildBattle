/* GuildBattle performance loader: heavy modules load only when needed. */
(function(){
 const loaded=new Set(),loading=new Map();
 const loadScript=src=>{if(loaded.has(src))return Promise.resolve();if(loading.has(src))return loading.get(src);const p=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>{loaded.add(src);resolve()};s.onerror=()=>reject(new Error('読み込み失敗: '+src));document.body.appendChild(s)});loading.set(src,p);return p};
 const series=xs=>xs.reduce((p,x)=>p.then(()=>loadScript(x)),Promise.resolve());
 const battle=['phase4.js','phase4_1.js','phase4_2_character_master.js','phase4_3.js','phase4_4.js','phase4_5.js','phase4_6.js','phase4_7.js','phase4_8.js','phase4_9.js','phase4_10.js'];
 let battleReady=null;
 async function ensureBattle(){if(battleReady)return battleReady;const box=document.querySelector('#battle');if(box&&!document.querySelector('#lazyBattleStatus')){const p=document.createElement('p');p.id='lazyBattleStatus';p.className='hint';p.textContent='⚙️ 戦闘機能を読み込み中…';box.querySelector('.section-head')?.after(p)}battleReady=series(battle).then(()=>{document.querySelector('#lazyBattleStatus')?.remove()}).catch(e=>{battleReady=null;const p=document.querySelector('#lazyBattleStatus');if(p)p.textContent='読み込みエラー: '+e.message;throw e});return battleReady}
 async function ensureCharacters(){return loadScript('phase4_2_character_master.js')}
 async function ensureOCR(){if(window.Tesseract)return;return loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js')}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;const v=b.dataset.view;if(v==='battle')ensureBattle().catch(()=>{});else if(v==='characters')ensureCharacters().catch(()=>{});else if(v==='import')ensureOCR().catch(()=>{})},true);
 window.ParanoiseLoader={ensureBattle,ensureCharacters,ensureOCR,loaded};
})();

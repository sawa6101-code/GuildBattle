/* GuildBattle performance + Phase 6 loader */
(function(){
 const loaded=new Set(),loading=new Map();let replaying=false;
 const loadScript=src=>{if(loaded.has(src))return Promise.resolve();if(loading.has(src))return loading.get(src);const p=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>{loaded.add(src);loading.delete(src);resolve()};s.onerror=()=>{loading.delete(src);reject(new Error('読み込み失敗: '+src))};document.body.appendChild(s)});loading.set(src,p);return p};
 const battle=['phase4.js','phase4_1.js','phase4_2_character_master.js','phase4_3.js','phase4_4.js','phase4_5.js','phase4_6.js','phase4_7.js','phase4_8.js','phase4_9.js','phase4_10.js'];
 let battleReady=null;
 function status(text){let p=document.querySelector('#lazyBattleStatus');if(!p){const box=document.querySelector('#battle');if(!box)return;p=document.createElement('p');p.id='lazyBattleStatus';p.className='hint';box.querySelector('.section-head')?.after(p)}p.textContent=text}
 async function ensureBattle(){if(battleReady)return battleReady;status('⚙️ 戦闘機能を読み込み中…');battleReady=battle.reduce((p,x)=>p.then(()=>loadScript(x)),Promise.resolve()).then(()=>document.querySelector('#lazyBattleStatus')?.remove()).catch(e=>{battleReady=null;status('読み込みエラー: '+e.message);throw e});return battleReady}
 async function ensureCharacters(){return loadScript('phase4_2_character_master.js')}
 async function ensureOCR(){if(window.Tesseract)return;return loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js')}
 async function ensurePhase5(){return loadScript('phase5.js')}
 async function ensurePhase51(){await ensurePhase5();return loadScript('phase5_1.js')}
 async function ensurePhase52(){await ensurePhase51();return loadScript('phase5_2.js')}
 async function ensurePhase53(){await ensurePhase52();return loadScript('phase5_3.js')}
 async function ensurePhase6(){await ensurePhase53();return loadScript('phase6.js')}
 async function prepare(v){if(v==='battle')return ensureBattle();if(v==='characters')return ensureCharacters();if(v==='import'){await loadScript('phase3.js');return ensureOCR()}if(v==='settings')return ensurePhase6()}
 document.addEventListener('click',async e=>{if(replaying)return;const b=e.target.closest('[data-view]');if(!b)return;const v=b.dataset.view;if(!['battle','characters','import','settings'].includes(v))return;e.preventDefault();e.stopImmediatePropagation();try{await prepare(v);replaying=true;b.click();replaying=false}catch(err){console.error(err);replaying=false}});
 window.ParanoiseLoader={ensureBattle,ensureCharacters,ensureOCR,ensurePhase5,ensurePhase51,ensurePhase52,ensurePhase53,ensurePhase6,loaded,prepare};
})();
/* GuildBattle help page */
(function(){
function install(){
 const own=document.querySelector('#own'); if(own&&!document.querySelector('#addOwn')){
  const h=own.querySelector('.section-head');
  const b=document.createElement('button');b.id='addOwn';b.className='small primary';b.textContent='＋';h.appendChild(b);
 }
 const nav=document.querySelector('.bottom-nav');
 if(nav&&!nav.querySelector('[data-view="help"]')){const b=document.createElement('button');b.dataset.view='help';b.textContent='❓';const s=document.createElement('span');s.textContent='使い方';b.appendChild(s);nav.appendChild(b);b.addEventListener('click',()=>showHelp())}
}
function showHelp(){const box=document.querySelector('#help');if(box){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));box.classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}}
window.GuildBattleHelp={show:showHelp};document.addEventListener('DOMContentLoaded',install);
})();
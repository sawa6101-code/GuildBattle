/* Implemented character full-name seed v2 - 2026-09-25
   Sources: current public character list and user-provided in-game screenshots.
   IMPORTANT: only missing records are inserted. Existing records are never overwritten.
*/
(function(){
'use strict';
const DB='paranoise-guildbattle';
const IMPLEMENTED=[
  // Current SSR variants listed publicly in Sep 2026
  ['ヨーコ（フライトの前に）','SSR'],['ローサ（やがて海に還るとき）','SSR'],
  ['天草 仁（あなたを見ていると）','SSR'],['天草 仁（剣は語らず）','SSR'],
  ['宮本 涼子（咥えタバコの弔い酒）','SSR'],['宮本 涼子（潮風とレモンの記憶）','SSR'],
  ['宮本 蓮士（打ち明けた秘密）','SSR'],['宮本 蓮士（聴きなれた足音）','SSR'],['宮本 蓮士（見ててくれよ、親父）','SSR'],
  ['望月 那由多（ファースト・ラブ）','SSR'],['望月 那由多（今...見ましたよね？）','SSR'],
  ['本田 美波（デートじゃないよね？）','SSR'],['本田美波（真夏の姉妹喧嘩）','SSR'],['本田 美波（誤解されちゃうよ）','SSR'],
  ['柳葉 龍（予期せぬ涙）','SSR'],['柳葉 龍（遅れてきた男）','SSR'],
  ['榊原大地（決戦前日）','SSR'],
  ['橘 智弥（兄として、友として）','SSR'],['橘 智弥（散りゆく名前）','SSR'],['橘 智弥（頂点捕食者）','SSR'],
  ['橘 結衣（その視線の先に）','SSR'],['橘 結衣（ピュアな駆け引き）','SSR'],['橘 結衣（君だけに見せる夏）','SSR'],['橘 結衣（線香花火の約束）','SSR'],
  ['火神 禅（不機嫌な虎）','SSR'],['火神 禅（戦地を統べる赤き虎）','SSR'],
  ['美影 メイサ（今宵最後のターゲット）','SSR'],['美影 メイサ（花園への誘い）','SSR'],
  ['蒼木 祥子（今夜のデザートは...）','SSR'],['蒼木 祥子（婚礼の供物）','SSR'],['蒼木 祥子（空腹の待ち合わせ）','SSR'],
  ['鳳梨 絵理華（摩天楼の特等席）','SSR'],['鳳梨 麗華（夕立ちの迷子）','SSR'],['鳳梨 麗華（私、もしかして？）','SSR'],['鳳梨 麗華（豪華客船の夜）','SSR'],
  ['黒澤アンナ（密室のミーティング）','SSR'],['黒澤 アンナ（心を惑わす嘘）','SSR'],
  // Known SR variants from the game/public starter list and user screenshots
  ['天草 仁（鳳梨に忠誠を誓った男）','SR'],['鳳梨 麗華（鳳梨の名を背負う少女）','SR'],['鳳梨 麗華（鳳梨の名を背負った少女）','SR'],
  ['橘 結衣（天真爛漫な剣道女子）','SR'],['宮本 蓮士（黒き刃を振るう青年）','SR'],['本田 美波（神奈川県警の若きエース）','SR'],
  ['リューグーン（時を忘れた海底の主）','SR'],['ネイサン（ネコ科最強のエージェント）','SR'],
  ['ビューマルゴ（不死身な黄金色の猛獣）','SR'],['コロコニー（輝きする二本の牙）','SR'],
  ['シャルロッテ（とってもふわふわお嬢様）','SR'],['オージュゴン（見たら忘れてほしい）','SR'],
  ['ヌメテューサ（双メメった大群にとりこまれる）','SR'],['ナンヨウ（ゾト目で世界を掌握）','SR']
];
const norm=s=>String(s||'').replace(/[\\s　]/g,'').replace(/[（(]/g,'(').replace(/[）)]/g,')').trim();
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,4);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const all=(d,n)=>new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const put=(d,n,x)=>new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
async function run(){
 const d=await open(),cs=await all(d,'characters');
 let next=1,added=0,skipped=0,details=[];
 const makeId=()=>{while(cs.some(x=>x.id===`CHR-${String(next).padStart(4,'0')}`))next++;return `CHR-${String(next++).padStart(4,'0')}`};
 const seen=new Set(cs.map(x=>norm(x.name)));
 for(const [name,rarity] of IMPLEMENTED){
   if(seen.has(norm(name))){skipped++;details.push({name,status:'skipped_existing'});continue}
   const c={id:makeId(),name,rarity,source:'implemented_character_full_name_seed_20260925',verification_status:'unverified',verification_required:true,active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
   await put(d,'characters',c);cs.push(c);seen.add(norm(name));added++;details.push({id:c.id,name,status:'added'});
 }
 await put(d,'settings',{key:'implemented_character_full_name_seed_20260925',version:'2.0',added,skipped,details,updated_at:new Date().toISOString(),source:'public Sep-2026 character list + user-provided in-game screenshots',note:'Existing character records are skipped and never overwritten.'});
 d.close();window.dispatchEvent(new CustomEvent('paranoise-character-master-updated',{detail:{added,skipped}}));
}
setTimeout(()=>run().catch(console.error),1400);
})();
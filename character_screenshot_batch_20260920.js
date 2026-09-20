/* Character screenshot batch 2026-09-20
   User-uploaded 11 character cards. Visual/OCR confirmation.
   Existing structured skills are preserved; screenshot observations are appended.
   DB version is intentionally omitted so this also works after the screenshot binder upgraded DB to v4.
*/
(function(){
'use strict';
const DB='paranoise-guildbattle';
const R=[
 {name:'橘 智弥（兄として、友として）',rarity:'SSR',title:'兄として、友として',skills:['スタンスキン（100TU・3%）','HP反転（100TU・3MP・HP30%未満）','サバイバー（130TU・5倍・300TU生存）','スタンアサルトEX(2体)（160TU・2倍・150TUスタン）'],source:'画像(5).jpeg|画像(20260920-045510).jpeg'},
 {name:'宮本 蓮士（打ち明けた秘密）',rarity:'SSR',title:'打ち明けた秘密',skills:['入場スリープ(2体)（各10%）','孤軍奮闘（70TU・6倍・最後の1人）','ドリームハンター（130TU・6倍・睡眠対象）','EX戦術的撤退（0TU）','アタック'],source:'画像(5).jpeg'},
 {name:'蒼木 祥子（空腹の待ち合わせ）',rarity:'SSR',title:'空腹の待ち合わせ',skills:['オートポイズン（10%）','復讐ポイズン（100%）','逆境ドレイン（160TU・3MP・5倍・HP30%未満）','ポイズンイーター（130TU・4倍）'],source:'画像(5).jpeg'},
 {name:'リューグーン（時を忘れた海底の主）',rarity:'SR',title:'時を忘れた海底の主',skills:['アタック'],source:'画像(20260920-045510).jpeg',provisional:true},
 {name:'ネイサン（ネコ科最強のエージェント）',rarity:'SR',title:'ネコ科最強のエージェント',skills:['アタック（2体）'],source:'画像(20260920-045510).jpeg'},
 {name:'ビューマルゴ（不死身な黄金色の猛獣）',rarity:'SR',title:'不死身な黄金色の猛獣',skills:['アタック（2体）'],source:'画像(20260920-045510).jpeg',provisional:true},
 {name:'コロコニー（輝きする二本の牙）',rarity:'SR',title:'輝きする二本の牙',skills:['アタック（2体）'],source:'画像(20260920-045510).jpeg',provisional:true},
 {name:'シャルロッテ（とってもふわふわお嬢様）',rarity:'SR',title:'とってもふわふわお嬢様',skills:['アタック'],source:'画像(20260920-045510).jpeg',provisional:true},
 {name:'オージュゴン（見たら忘れてほしい）',rarity:'SR',title:'見たら忘れてほしい',skills:['アタック（2体）'],source:'画像(20260920-045510).jpeg',provisional:true},
 {name:'ヌメテューサ（双メメった大群にとりこまれる）',rarity:'SR',title:'双メメった大群にとりこまれる',skills:['アタック（全体）'],source:'画像(20260920-045510).jpeg',provisional:true},
 {name:'ナンヨウ（ゾト目で世界を掌握）',rarity:'SR',title:'ゾト目で世界を掌握',skills:['アタック（2体）'],source:'画像(20260920-045510).jpeg',provisional:true}
];
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const all=(d,n)=>new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const put=(d,n,x)=>new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'').replace(/[（）]/g,m=>m==='（'?'(' : ')');
async function run(){
 const d=await open(),cs=await all(d,'characters');
 let next=1; const makeId=()=>{while(cs.some(x=>x.id===`CHR-${String(next).padStart(4,'0')}`))next++;return `CHR-${String(next++).padStart(4,'0')}`};
 let added=0,updated=0,details=[];
 for(const x of R){
   let c=cs.find(v=>v.name===x.name);
   if(!c){
     const base=x.name.replace(/（[^（）]+）$/,'');
     c=cs.find(v=>v.name===base || norm(v.name)===norm(x.name));
   }
   if(!c){c={id:makeId(),name:x.name,created_at:new Date().toISOString()};added++}else updated++;
   Object.assign(c,{
     name:x.name,rarity:x.rarity,title:x.title,
     screenshot_confirmed:true,
     screenshot_evidence:[...(c.screenshot_evidence||[]),x.source].filter((v,i,a)=>a.indexOf(v)===i),
     screenshot_skill_observations:[...(c.screenshot_skill_observations||[]),...x.skills].filter((v,i,a)=>a.indexOf(v)===i),
     verification_status:x.provisional?'provisional':'user_confirmed',
     verification_required:!!x.provisional,
     screenshot_verification_note:x.provisional?'スクリーンショットでカード名を確認。表記の一部は画像解像度のため仮登録。':'ユーザー提供スクリーンショットでカード名・レアリティを確認。',
     source:'user_uploaded_screenshot',
     source_checked:'2026-09-20',
     updated_at:new Date().toISOString()
   });
   await put(d,'characters',c);
   details.push({id:c.id,name:c.name,status:x.provisional?'provisional':'confirmed'});
 }
 await put(d,'settings',{key:'character_screenshot_batch_20260920',count:R.length,added,updated,source:'user_uploaded_11_cards_in_one_sheet',registered_at:new Date().toISOString(),details,note:'11枚をキャラクターDBへ追加/更新。既存の構造化スキル値は上書きせず、スクショ観測スキルとして追記。'});
 d.close(); window.dispatchEvent(new CustomEvent('paranoise-character-master-updated',{detail:{count:R.length,added,updated}}));
}
setTimeout(()=>run().catch(console.error),900);
})();
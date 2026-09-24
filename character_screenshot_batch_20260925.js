/* Character screenshot registration batch 2026-09-25
   User-uploaded image: 6 SSR cards.
   Register observed card metadata and screenshot confirmation without inventing unshown combat parameters.
*/
(function(){
'use strict';
const DB='paranoise-guildbattle';
const R=[
 {name:'火神 禅（戦地を統べる赤き虎）',rarity:'SSR',element:'闇',role:'物理アタッカー',max_mp:6,title:'戦地を統べる赤き虎',skills:['ポイズンスキン','HP倍増EX','孤軍奮闘','サバイバー','ヘビーアタック']},
 {name:'ヨーコ（フライトの前に）',rarity:'SSR',element:'闇',role:'特殊アタッカー',max_mp:6,title:'フライトの前に',skills:['オートポイズン','HP反転(味方)','HP反転EX','ポイズンイーター','アタック']},
 {name:'ローサ（やがて海に還るとき）',rarity:'SSR',element:'闇',role:'物理アタッカー',max_mp:6,title:'やがて海に還るとき',skills:['反撃体勢','根性','HP反転','サバイバー(2体)','ヘビーアタック']},
 {name:'橘 結衣（その視線の先に）',rarity:'SSR',element:'風',role:'特殊アタッカー',max_mp:6,title:'その視線の先に',skills:['復讐スリープ(2体)','HP反転','EXスリープ(2体)','サバイバー']},
 {name:'蒼木 祥子（婚礼の供物）',rarity:'SSR',element:'光',role:'物理アタッカー',max_mp:6,title:'婚礼の供物',skills:['オートガード','根性','逆境ドレインEX','スタンアサルト','迅速攻撃']},
 {name:'鳳梨 麗華（豪華客船の夜）',rarity:'SSR',element:'風',role:'物理アタッカー',max_mp:6,title:'豪華客船の夜',skills:['ギブターンの遺志','EXオートスリープ','ドリームハンター(2体)','サバイバー']}
];
const open=()=>new Promise((ok,no)=>{const r=indexedDB.open(DB,4);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const all=(d,n)=>new Promise((ok,no)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const put=(d,n,x)=>new Promise((ok,no)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>ok();r.onerror=()=>no(r.error)});
async function run(){
 const d=await open(),cs=await all(d,'characters'),ts=new Date().toISOString();
 let updated=0,missing=[];
 for(const x of R){
   const c=cs.find(v=>v.name===x.name);
   if(!c){missing.push(x.name);continue}
   c.name=x.name;c.rarity=x.rarity;c.title=x.title;
   c.element=x.element;c.role=x.role;c.max_mp=x.max_mp;
   c.screenshot_confirmed=true;
   c.screenshot_evidence=[...(c.screenshot_evidence||[]),'画像(6).jpeg'].filter((v,i,a)=>a.indexOf(v)===i);
   c.screenshot_skill_observations=[...(c.screenshot_skill_observations||[]),...x.skills].filter((v,i,a)=>a.indexOf(v)===i);
   c.verification_status='user_confirmed';c.verification_required=false;
   c.screenshot_verification_note='ユーザー提供スクリーンショット（画像(6).jpeg）でカード名・レアリティ・属性・役割・最大MP6を確認。';
   c.source='user_uploaded_screenshot';c.source_checked='2026-09-25';c.updated_at=ts;
   await put(d,'characters',c);updated++;
 }
 await put(d,'settings',{key:'character_screenshot_batch_20260925',count:R.length,updated,missing,source:'user_uploaded_6_cards_in_one_sheet',registered_at:ts,note:'6体のSSRキャラクター情報をキャラクターDBへ登録/確認。画像参照用のcharacterImagesは、次回スクショ登録画面で個別カード画像を確定した場合に生成される。'});
 d.close();window.dispatchEvent(new CustomEvent('paranoise-character-master-updated',{detail:{count:R.length,updated,missing}}));
}
setTimeout(()=>run().catch(console.error),900);
})();
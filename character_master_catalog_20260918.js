/* Character master catalog extension - verified public names through 2026-09-18.
   Does not invent combat parameters. Unknown fields remain verification_required. */
(function(){
const C=[
  [
    "ローサ（やがて海に還るとき）",
    "SSR"
  ],
  [
    "天草 仁（あなたを見ていると）",
    "SSR"
  ],
  [
    "天草 仁（剣は語らず）",
    "SSR"
  ],
  [
    "宮本 涼子（咥えタバコの弔い酒）",
    "SSR"
  ],
  [
    "宮本 涼子（潮風とレモンの記憶）",
    "SSR"
  ],
  [
    "宮本 蓮士（打ち明けた秘密）",
    "SSR"
  ],
  [
    "宮本 蓮士（聴きなれた足音）",
    "SSR"
  ],
  [
    "宮本 蓮士（見ててくれよ、親父）",
    "SSR"
  ],
  [
    "望月 那由多（ファースト・ラブ）",
    "SSR"
  ],
  [
    "望月 那由多（今...見ましたよね？）",
    "SSR"
  ],
  [
    "本田 美波（デートじゃないよね？）",
    "SSR"
  ],
  [
    "本田美波（真夏の姉妹喧嘩）",
    "SSR"
  ],
  [
    "本田 美波（誤解されちゃうよ）",
    "SSR"
  ],
  [
    "柳葉 龍（予期せぬ涙）",
    "SSR"
  ],
  [
    "柳葉 龍（遅れてきた男）",
    "SSR"
  ],
  [
    "榊原大地（決戦前日）",
    "SSR"
  ],
  [
    "橘 智弥（兄として、友として）",
    "SSR"
  ],
  [
    "橘 智弥（散りゆく名前）",
    "SSR"
  ],
  [
    "橘 智弥（頂点捕食者）",
    "SSR"
  ],
  [
    "橘 結衣（その視線の先に）",
    "SSR"
  ],
  [
    "橘 結衣（ピュアな駆け引き）",
    "SSR"
  ],
  [
    "橘 結衣（君だけに見せる夏）",
    "SSR"
  ],
  [
    "橘 結衣（線香花火の約束）",
    "SSR"
  ],
  [
    "美影 メイサ（今宵最後のターゲット）",
    "SSR"
  ],
  [
    "美影 メイサ（花園への誘い）",
    "SSR"
  ],
  [
    "蒼木 祥子（今夜のデザートは...）",
    "SSR"
  ],
  [
    "蒼木 祥子（婚礼の供物）",
    "SSR"
  ],
  [
    "蒼木 祥子（空腹の待ち合わせ）",
    "SSR"
  ],
  [
    "鳳梨 絵理華（摩天楼の特等席）",
    "SSR"
  ],
  [
    "鳳梨 麗華（夕立ちの迷子）",
    "SSR"
  ],
  [
    "鳳梨 麗華（私、もしかして？）",
    "SSR"
  ],
  [
    "鳳梨 麗華（豪華客船の夜）",
    "SSR"
  ],
  [
    "黒澤アンナ（密室のミーティング）",
    "SSR"
  ],
  [
    "黒澤 アンナ（心を惑わす嘘）",
    "SSR"
  ],
  [
    "ヨーコ（フライトの前に）",
    "SSR"
  ],
  [
    "火神 禅（戦地を統べる赤き虎）",
    "SSR"
  ],
  [
    "天草 仁（鳳梨に忠誠を誓った男）",
    "SR"
  ],
  [
    "鳳梨 麗華（鳳梨の名を背負った少女）",
    "SR"
  ],
  [
    "橘 結衣（天真爛漫な剣道女子）",
    "SR"
  ],
  [
    "宮本 蓮士（黒き刃を振るう青年）",
    "SR"
  ],
  [
    "本田 美波（神奈川県警の若きエース）",
    "SR"
  ],
  [
    "SSR仮登録-37",
    "SSR"
  ],
  [
    "Cowdinal（仮登録）",
    "SR"
  ],
  [
    "Smokey（仮登録）",
    "SR"
  ],
  [
    "Anna Acid Agent（仮登録）",
    "SR"
  ],
  [
    "Daichi（仮登録）",
    "SR"
  ],
  [
    "Erika（仮登録）",
    "SR"
  ],
  [
    "Jin（仮登録）",
    "SR"
  ],
  [
    "Meisa（仮登録）",
    "SR"
  ],
  [
    "Nayu（仮登録）",
    "SR"
  ],
  [
    "Reika（仮登録）",
    "SR"
  ],
  [
    "Ryoko（仮登録）",
    "SR"
  ],
  [
    "Shoko Hungering Gaze（仮登録）",
    "SR"
  ],
  [
    "Zen（仮登録）",
    "SR"
  ],
  [
    "Bearberry（仮登録）",
    "SR"
  ],
  [
    "Bunnlegum（仮登録）",
    "SR"
  ],
  [
    "Knox（仮登録）",
    "SR"
  ],
  [
    "Minami（仮登録）",
    "SR"
  ],
  [
    "Ryu Kendo's Wild Fan（仮登録）",
    "SR"
  ],
  [
    "Sir Loin（仮登録）",
    "SR"
  ],
  [
    "Yui Unwavering Light（仮登録）",
    "SR"
  ],
  [
    "SR仮登録-01",
    "SR"
  ],
  [
    "SR仮登録-02",
    "SR"
  ],
  [
    "SR仮登録-03",
    "SR"
  ],
  [
    "SR仮登録-04",
    "SR"
  ],
  [
    "SR仮登録-05",
    "SR"
  ],
  [
    "SR仮登録-06",
    "SR"
  ],
  [
    "SR仮登録-07",
    "SR"
  ],
  [
    "SR仮登録-08",
    "SR"
  ],
  [
    "SR仮登録-09",
    "SR"
  ],
  [
    "SR仮登録-10",
    "SR"
  ],
  [
    "SR仮登録-11",
    "SR"
  ],
  [
    "SR仮登録-12",
    "SR"
  ],
  [
    "SR仮登録-13",
    "SR"
  ],
  [
    "SR仮登録-14",
    "SR"
  ],
  [
    "SR仮登録-15",
    "SR"
  ],
  [
    "SR仮登録-16",
    "SR"
  ],
  [
    "SR仮登録-17",
    "SR"
  ],
  [
    "SR仮登録-18",
    "SR"
  ],
  [
    "SR仮登録-19",
    "SR"
  ],
  [
    "SR仮登録-20",
    "SR"
  ],
  [
    "SR仮登録-21",
    "SR"
  ],
  [
    "SR仮登録-22",
    "SR"
  ],
  [
    "SR仮登録-23",
    "SR"
  ],
  [
    "SR仮登録-24",
    "SR"
  ],
  [
    "SR仮登録-25",
    "SR"
  ],
  [
    "SR仮登録-26",
    "SR"
  ],
  [
    "SR仮登録-27",
    "SR"
  ],
  [
    "SR仮登録-28",
    "SR"
  ],
  [
    "Aya（仮登録）",
    "R"
  ],
  [
    "Catnado（仮登録）",
    "R"
  ],
  [
    "Kenshin（仮登録）",
    "R"
  ],
  [
    "Mizuno（仮登録）",
    "R"
  ],
  [
    "Saki（仮登録）",
    "R"
  ],
  [
    "Seiji（仮登録）",
    "R"
  ],
  [
    "R仮登録-01",
    "R"
  ],
  [
    "R仮登録-02",
    "R"
  ],
  [
    "R仮登録-03",
    "R"
  ],
  [
    "R仮登録-04",
    "R"
  ],
  [
    "R仮登録-05",
    "R"
  ],
  [
    "R仮登録-06",
    "R"
  ],
  [
    "R仮登録-07",
    "R"
  ],
  [
    "R仮登録-08",
    "R"
  ],
  [
    "R仮登録-09",
    "R"
  ],
  [
    "R仮登録-10",
    "R"
  ],
  [
    "R仮登録-11",
    "R"
  ],
  [
    "R仮登録-12",
    "R"
  ],
  [
    "R仮登録-13",
    "R"
  ],
  [
    "R仮登録-14",
    "R"
  ],
  [
    "R仮登録-15",
    "R"
  ],
  [
    "R仮登録-16",
    "R"
  ],
  [
    "R仮登録-17",
    "R"
  ],
  [
    "R仮登録-18",
    "R"
  ],
  [
    "R仮登録-19",
    "R"
  ],
  [
    "R仮登録-20",
    "R"
  ],
  [
    "R仮登録-21",
    "R"
  ],
  [
    "R仮登録-22",
    "R"
  ],
  [
    "R仮登録-23",
    "R"
  ],
  [
    "R仮登録-24",
    "R"
  ],
  [
    "R仮登録-25",
    "R"
  ]
]* Character master catalog extension - verified public names through 2026-09-18.
   Does not invent combat parameters. Unknown fields remain verification_required. */
(function(){
const C=[
  [
    "ローサ（やがて海に還るとき）",
    "SSR"
  ],
  [
    "天草 仁（あなたを見ていると）",
    "SSR"
  ],
  [
    "天草 仁（剣は語らず）",
    "SSR"
  ],
  [
    "宮本 涼子（咥えタバコの弔い酒）",
    "SSR"
  ],
  [
    "宮本 涼子（潮風とレモンの記憶）",
    "SSR"
  ],
  [
    "宮本 蓮士（打ち明けた秘密）",
    "SSR"
  ],
  [
    "宮本 蓮士（聴きなれた足音）",
    "SSR"
  ],
  [
    "宮本 蓮士（見ててくれよ、親父）",
    "SSR"
  ],
  [
    "望月 那由多（ファースト・ラブ）",
    "SSR"
  ],
  [
    "望月 那由多（今...見ましたよね？）",
    "SSR"
  ],
  [
    "本田 美波（デートじゃないよね？）",
    "SSR"
  ],
  [
    "本田美波（真夏の姉妹喧嘩）",
    "SSR"
  ],
  [
    "本田 美波（誤解されちゃうよ）",
    "SSR"
  ],
  [
    "柳葉 龍（予期せぬ涙）",
    "SSR"
  ],
  [
    "柳葉 龍（遅れてきた男）",
    "SSR"
  ],
  [
    "榊原大地（決戦前日）",
    "SSR"
  ],
  [
    "橘 智弥（兄として、友として）",
    "SSR"
  ],
  [
    "橘 智弥（散りゆく名前）",
    "SSR"
  ],
  [
    "橘 智弥（頂点捕食者）",
    "SSR"
  ],
  [
    "橘 結衣（その視線の先に）",
    "SSR"
  ],
  [
    "橘 結衣（ピュアな駆け引き）",
    "SSR"
  ],
  [
    "橘 結衣（君だけに見せる夏）",
    "SSR"
  ],
  [
    "橘 結衣（線香花火の約束）",
    "SSR"
  ],
  [
    "美影 メイサ（今宵最後のターゲット）",
    "SSR"
  ],
  [
    "美影 メイサ（花園への誘い）",
    "SSR"
  ],
  [
    "蒼木 祥子（今夜のデザートは...）",
    "SSR"
  ],
  [
    "蒼木 祥子（婚礼の供物）",
    "SSR"
  ],
  [
    "蒼木 祥子（空腹の待ち合わせ）",
    "SSR"
  ],
  [
    "鳳梨 絵理華（摩天楼の特等席）",
    "SSR"
  ],
  [
    "鳳梨 麗華（夕立ちの迷子）",
    "SSR"
  ],
  [
    "鳳梨 麗華（私、もしかして？）",
    "SSR"
  ],
  [
    "鳳梨 麗華（豪華客船の夜）",
    "SSR"
  ],
  [
    "黒澤アンナ（密室のミーティング）",
    "SSR"
  ],
  [
    "黒澤 アンナ（心を惑わす嘘）",
    "SSR"
  ],
  [
    "ヨーコ（フライトの前に）",
    "SSR"
  ],
  [
    "火神 禅（戦地を統べる赤き虎）",
    "SSR"
  ],
  [
    "天草 仁（鳳梨に忠誠を誓った男）",
    "SR"
  ],
  [
    "鳳梨 麗華（鳳梨の名を背負った少女）",
    "SR"
  ],
  [
    "橘 結衣（天真爛漫な剣道女子）",
    "SR"
  ],
  [
    "宮本 蓮士（黒き刃を振るう青年）",
    "SR"
  ],
  [
    "本田 美波（神奈川県警の若きエース）",
    "SR"
  ],
  ["SSR仮登録-37","SSR"],
  ["Cowdinal（仮登録）","SR"],["Smokey（仮登録）","SR"],["Anna Acid Agent（仮登録）","SR"],["Daichi（仮登録）","SR"],["Erika（仮登録）","SR"],["Jin（仮登録）","SR"],["Meisa（仮登録）","SR"],["Nayu（仮登録）","SR"],["Reika（仮登録）","SR"],["Ryoko（仮登録）","SR"],["Shoko Hungering Gaze（仮登録）","SR"],["Zen（仮登録）","SR"],["Bearberry（仮登録）","SR"],["Bunnlegum（仮登録）","SR"],["Knox（仮登録）","SR"],["Minami（仮登録）","SR"],["Ryu Kendo's Wild Fan（仮登録）","SR"],["Sir Loin（仮登録）","SR"],["Yui Unwavering Light（仮登録）","SR"],
  ["SR仮登録-01","SR"],["SR仮登録-02","SR"],["SR仮登録-03","SR"],["SR仮登録-04","SR"],["SR仮登録-05","SR"],["SR仮登録-06","SR"],["SR仮登録-07","SR"],["SR仮登録-08","SR"],["SR仮登録-09","SR"],["SR仮登録-10","SR"],["SR仮登録-11","SR"],["SR仮登録-12","SR"],["SR仮登録-13","SR"],["SR仮登録-14","SR"],["SR仮登録-15","SR"],["SR仮登録-16","SR"],["SR仮登録-17","SR"],["SR仮登録-18","SR"],["SR仮登録-19","SR"],["SR仮登録-20","SR"],["SR仮登録-21","SR"],["SR仮登録-22","SR"],
  ["Aya（仮登録）","R"],["Catnado（仮登録）","R"],["Kenshin（仮登録）","R"],["Mizuno（仮登録）","R"],["Saki（仮登録）","R"],["Seiji（仮登録）","R"],
  ["R仮登録-01","R"],["R仮登録-02","R"],["R仮登録-03","R"],["R仮登録-04","R"],["R仮登録-05","R"],["R仮登録-06","R"],["R仮登録-07","R"],["R仮登録-08","R"],["R仮登録-09","R"],["R仮登録-10","R"],["R仮登録-11","R"],["R仮登録-12","R"],["R仮登録-13","R"],["R仮登録-14","R"],["R仮登録-15","R"],["R仮登録-16","R"],["R仮登録-17","R"],["R仮登録-18","R"],["R仮登録-19","R"],["R仮登録-20","R"],["R仮登録-21","R"],["R仮登録-22","R"],["R仮登録-23","R"],["R仮登録-24","R"],["R仮登録-25","R"]
]
const DB='paranoise-guildbattle',V=3;
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,V);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const all=(d,n)=>new Promise((res,rej)=>{const r=d.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const put=(d,n,x)=>new Promise((res,rej)=>{const r=d.transaction(n,'readwrite').objectStore(n).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
async function run(){const d=await open(),cs=await all(d,'characters');let n=1;for(const [name,rarity] of C){if(cs.some(x=>x.name===name))continue;while(cs.some(x=>x.id===`CHR-${String(n).padStart(4,'0')}`))n++;await put(d,'characters',{id:`CHR-${String(n++).padStart(4,'0')}`,name,rarity,source:(name.includes('仮登録')?'web検索仮登録':'public攻略サイト/公式公開情報'),source_url:'https://www.gaming.kyuzitu.net/paranoizu/ssrkyaraitiran/',verification_status:(name.includes('仮登録')?'provisional':'unverified'),verification_required:true,active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()})}await put(d,'settings',{key:'character_catalog_targets',target_ssr:37,target_sr:46,target_r:31,public_verified_ssr_names:C.length,checked_at:new Date().toISOString(),note:'114枠を先行登録。仮登録名は後日スクショで正しいカード情報へ上書きする。仮登録は未検証扱い。'});d.close();window.dispatchEvent(new CustomEvent('paranoise-character-master-updated'))}setTimeout(()=>run().catch(console.error),800);
})();
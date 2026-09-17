/* Phase 5.2 Worker - 実際のPhase 4.4エンジンをWorker内で実行 */
self.window=self;
importScripts('phase4_4.js');
self.onmessage=e=>{
 const d=e.data;
 try{
  const A=d.A,D=d.D,runs=Math.max(1,Number(d.runs)||1);
  let attack=0,defense=0,draw=0,last=null;
  for(let i=0;i<runs;i++){
   const r=self.ParanoisePhase44.simulate(A,D,{rules:d.rules||{}});
   last={result:r.result,actions:r.actions,time:r.time};
   if(r.result==='ATTACK_WIN')attack++;else if(r.result==='DEFENSE_WIN')defense++;else draw++;
  }
  self.postMessage({key:d.key,attack,defense,draw,runs,last});
 }catch(err){self.postMessage({key:d.key,error:String(err?.message||err)})}
};
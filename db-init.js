/* GuildBattle IndexedDB schema bootstrap v4 */
(function(){
'use strict';
const DB='paranoize-guildbattle',VERSION=6;
const defs={guilds:'id',members:'id',parties:'id',partyCharacters:'id',characters:'id',battleMatches:'id',battleResults:'id',fatigueHistory:'id',screenshots:'id',settings:'key',characterImages:'id',characterScreenshots:'id',characterSkillSources:'id'};
const open=indexedDB.open(DB,VERSION);
open.onupgradeneeded=()=>{
 const d=open.result;
 for(const [name,key] of Object.entries(defs)){
  let s=d.objectStoreNames.contains(name)?open.transaction.objectStore(name):d.createObjectStore(name,{keyPath:key});
  if(name==='members'&&!s.indexNames.contains('guild_id'))s.createIndex('guild_id','guild_id');
  if(name==='parties'&&!s.indexNames.contains('member_id'))s.createIndex('member_id','member_id');
  if(name==='partyCharacters'){
   if(!s.indexNames.contains('party_id'))s.createIndex('party_id','party_id');
   if(!s.indexNames.contains('character_id'))s.createIndex('character_id','character_id');
  }
  if(name==='characters'){
   if(!s.indexNames.contains('name'))s.createIndex('name','name');
   if(!s.indexNames.contains('element'))s.createIndex('element','element');
   if(!s.indexNames.contains('rarity'))s.createIndex('rarity','rarity');
  }
  if(name==='screenshots'&&!s.indexNames.contains('target'))s.createIndex('target','target');
 }
};
open.onsuccess=()=>open.result.close();
open.onerror=()=>console.error('GuildBattle DB schema bootstrap:',open.error);
})();
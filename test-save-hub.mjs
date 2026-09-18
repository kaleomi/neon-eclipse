import assert from 'node:assert/strict';
import {createSaveHub,SLOTS,SLOT_KEYS,BACKUP_KEY,validBundle,inspectSlot,bundleFileName,SAVE_HUB_SCHEMA} from './save-hub.js';
import {JOURNEY_KEY} from './journey.js';
import {STAR_KEY} from './collectibles.js';
import {ACHIEVEMENT_KEY} from './chapter-achievements.js';
import {DIFFICULTY_KEY} from './combat-difficulty.js';
import {FLIGHT_INVERT_KEY} from './flight-settings.js';

const memory=(init={})=>{const m=new Map(Object.entries(init));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},get size(){return m.size;},keys:()=>[...m.keys()]};};
const fakeRecords=(rows=[])=>({rows,read:async()=>({ok:true,records:[...rows]}),save:async r=>{if(!r||typeof r.id!=='string')return {ok:false,code:'corrupt'};const e=rows.find(x=>x.id===r.id);if(e)return {ok:true,duplicate:true};rows.push(r);return {ok:true,duplicate:false};}});
const now=()=>Date.UTC(2026,8,17,12,0,0);

// 1. Slot registry matches the keys owner modules actually use.
for(const key of [JOURNEY_KEY,STAR_KEY,ACHIEVEMENT_KEY,DIFFICULTY_KEY,FLIGHT_INVERT_KEY,'neon-eclipse.campaign.v1','neon-eclipse.harbor.v1','neon-eclipse.orbital.v1','neon-eclipse.datacenter.v1','neon-eclipse.naval-difficulty.v1','neon-eclipse.presentation.v1'])assert.ok(SLOT_KEYS.includes(key),`slot registry missing ${key}`);
assert.equal(new Set(SLOT_KEYS).size,SLOTS.length);
assert.ok(!SLOT_KEYS.includes(BACKUP_KEY));

// 2. Health inspection distinguishes empty / ok / unknown / corrupt without touching data.
{
 const s=memory({[JOURNEY_KEY]:JSON.stringify({version:6,chapters:[]}),[STAR_KEY]:'{not json',[DIFFICULTY_KEY]:'hard','neon-eclipse.campaign.v1':JSON.stringify({version:9,unlocked:0})});
 const hub=createSaveHub({storage:s,now});
 const h=Object.fromEntries(hub.health().map(r=>[r.key,r.status]));
 assert.equal(h[JOURNEY_KEY],'ok');assert.equal(h[STAR_KEY],'corrupt');assert.equal(h[DIFFICULTY_KEY],'ok');assert.equal(h['neon-eclipse.campaign.v1'],'unknown');assert.equal(h[ACHIEVEMENT_KEY],'empty');
 assert.equal(s.getItem(STAR_KEY),'{not json','inspection must not rewrite corrupt data');
 assert.equal(inspectSlot(s,SLOTS.find(x=>x.key===STAR_KEY)).bytes,9);
}

// 3. Export contains only known slots verbatim plus flight records; unknown keys are ignored.
{
 const s=memory({[JOURNEY_KEY]:'{"version":6}',[DIFFICULTY_KEY]:'easy','neon-eclipse.other.key':'x',[BACKUP_KEY]:'{}'});
 const records=fakeRecords([{id:'a',schema:1}]);
 const hub=createSaveHub({storage:s,records,now});
 const bundle=await hub.exportBundle();
 assert.ok(validBundle(bundle));
 assert.deepEqual(Object.keys(bundle.slots).sort(),[DIFFICULTY_KEY,JOURNEY_KEY].sort());
 assert.equal(bundle.slots[JOURNEY_KEY],'{"version":6}');
 assert.deepEqual(bundle.flightRecords,[{id:'a',schema:1}]);
 assert.equal(bundle.exportedAt,'2026-09-17T12:00:00.000Z');
 assert.equal(bundleFileName(bundle),'neon-eclipse-save-2026-09-17-12-00-00.json');
 const noRecords=await createSaveHub({storage:s,now}).exportBundle();
 assert.equal(noRecords.flightRecords,undefined);
}

// 4. Preview classifies add / overwrite / same / skip and never writes.
{
 const s=memory({[JOURNEY_KEY]:'{"version":6,"a":1}',[STAR_KEY]:'{"version":3,"stars":[]}'});
 const hub=createSaveHub({storage:s,now});
 const p=hub.previewImport({app:'neon-eclipse',schema:SAVE_HUB_SCHEMA,exportedAt:'x',slots:{[JOURNEY_KEY]:'{"version":6,"a":2}',[STAR_KEY]:'{"version":3,"stars":[]}',[DIFFICULTY_KEY]:'hard','evil.key':'1',[ACHIEVEMENT_KEY]:'broken'}});
 assert.ok(p.ok);
 const by=Object.fromEntries(p.entries.map(e=>[e.key,e]));
 assert.equal(by[JOURNEY_KEY].action,'overwrite');assert.equal(by[STAR_KEY].action,'same');assert.equal(by[DIFFICULTY_KEY].action,'add');
 assert.equal(by['evil.key'].action,'skip');assert.equal(by['evil.key'].reason,'unknown-key');
 assert.equal(by[ACHIEVEMENT_KEY].action,'skip');assert.equal(by[ACHIEVEMENT_KEY].reason,'corrupt');
 assert.deepEqual(p.missing,[]);
 assert.equal(s.size,2);
 assert.equal(hub.previewImport({app:'other'}).ok,false);
 assert.equal(hub.previewImport(null).code,'invalid');
 assert.equal(hub.previewImport({app:'neon-eclipse',schema:1,slots:{a:1}}).code,'invalid','slot values must be strings');
}

// 5. Merge import writes a pre-import backup, skips corrupt/unknown keys, keeps slots not in the bundle.
{
 const s=memory({[JOURNEY_KEY]:'{"version":6,"old":true}',[STAR_KEY]:'{"version":3,"stars":["reactor"]}'});
 const records=fakeRecords([{id:'a'}]);
 const hub=createSaveHub({storage:s,records,now});
 const r=await hub.importBundle({app:'neon-eclipse',schema:1,slots:{[JOURNEY_KEY]:'{"version":6,"new":true}',[DIFFICULTY_KEY]:'hard','evil.key':'1',[ACHIEVEMENT_KEY]:'broken'},flightRecords:[{id:'a'},{id:'b'},{nope:1}]});
 assert.ok(r.ok);assert.equal(r.mode,'merge');
 assert.deepEqual(r.written.sort(),[DIFFICULTY_KEY,JOURNEY_KEY].sort());assert.deepEqual(r.removed,[]);
 assert.deepEqual(r.failed,[]);
 assert.deepEqual(r.skipped.sort((a,b)=>a.key<b.key?-1:1),[{key:ACHIEVEMENT_KEY,reason:'corrupt'},{key:'evil.key',reason:'unknown-key'}].sort((a,b)=>a.key<b.key?-1:1),'corrupt or unknown entries are skipped, not failures');
 assert.equal(s.getItem(JOURNEY_KEY),'{"version":6,"new":true}');
 assert.equal(s.getItem(STAR_KEY),'{"version":3,"stars":["reactor"]}','merge keeps slots absent from bundle');
 assert.equal(s.getItem('evil.key'),null);assert.equal(s.getItem(ACHIEVEMENT_KEY),null);
 assert.deepEqual(r.flight,{saved:1,duplicates:1,failed:0,skipped:1});
 const backup=JSON.parse(s.getItem(BACKUP_KEY));
 assert.equal(backup.slots[JOURNEY_KEY],'{"version":6,"old":true}');
 assert.equal(backup.createdAt,'2026-09-17T12:00:00.000Z');
 // Restore returns to the pre-import state and keeps a backup of what was replaced.
 const restored=hub.restoreBackup();
 assert.ok(restored.ok);
 assert.equal(s.getItem(JOURNEY_KEY),'{"version":6,"old":true}');
 assert.equal(s.getItem(DIFFICULTY_KEY),null,'restore removes slots that did not exist before import');
 assert.equal(s.getItem(STAR_KEY),'{"version":3,"stars":["reactor"]}');
 assert.equal(JSON.parse(s.getItem(BACKUP_KEY)).slots[JOURNEY_KEY],'{"version":6,"new":true}','restore swaps the backup so it can be undone');
}

// 6. Replace import removes known slots missing from the bundle but never touches foreign keys or the backup key.
{
 const s=memory({[JOURNEY_KEY]:'{"version":6}',[STAR_KEY]:'{"version":3,"stars":[]}','foreign.key':'keep'});
 const hub=createSaveHub({storage:s,now});
 const r=await hub.importBundle({app:'neon-eclipse',schema:1,slots:{[DIFFICULTY_KEY]:'easy'}},{mode:'replace'});
 assert.ok(r.ok);
 assert.deepEqual(r.removed.sort(),[JOURNEY_KEY,STAR_KEY].sort());
 assert.equal(s.getItem('foreign.key'),'keep');
 assert.equal(s.getItem(DIFFICULTY_KEY),'easy');
 assert.ok(s.getItem(BACKUP_KEY));
 assert.equal(hub.previewImport({app:'neon-eclipse',schema:1,slots:{}}).missing.length,1);
}

// 7. Failure modes: unavailable storage, backup write failure aborts import, oversized bundle, no backup to restore.
{
 const none=createSaveHub({storage:null,now});
 assert.equal(none.available,false);
 assert.ok(none.health().every(r=>r.status==='unavailable'));
 assert.equal((await none.importBundle({app:'neon-eclipse',schema:1,slots:{}})).code,'unavailable');
 assert.equal(none.restoreBackup().code,'unavailable');
 const full=memory({[JOURNEY_KEY]:'{"version":6}'});const setItem=full.setItem;full.setItem=(k,v)=>{if(k===BACKUP_KEY)throw new Error('quota');setItem(k,v);};
 const hub=createSaveHub({storage:full,now});
 const r=await hub.importBundle({app:'neon-eclipse',schema:1,slots:{[DIFFICULTY_KEY]:'hard'}});
 assert.equal(r.code,'backup-failed');assert.equal(full.getItem(DIFFICULTY_KEY),null,'nothing written when backup cannot be saved');
 assert.equal(createSaveHub({storage:memory(),now}).restoreBackup().code,'no-backup');
 const big={app:'neon-eclipse',schema:1,slots:{[JOURNEY_KEY]:'x'.repeat(5*1024*1024)}};
 assert.equal((await createSaveHub({storage:memory(),now}).importBundle(big)).code,'too-large');
 const partial=memory();const set2=partial.setItem;partial.setItem=(k,v)=>{if(k===STAR_KEY)throw new Error('quota');set2(k,v);};
 const p=await createSaveHub({storage:partial,now}).importBundle({app:'neon-eclipse',schema:1,slots:{[STAR_KEY]:'{"version":3,"stars":[]}',[DIFFICULTY_KEY]:'easy'}});
 assert.equal(p.ok,false);assert.equal(p.code,'partial');assert.deepEqual(p.failed,[{key:STAR_KEY,reason:'write-failed'}]);assert.deepEqual(p.written,[DIFFICULTY_KEY]);
}

// 8. Round trip: export -> import into a fresh storage reproduces every slot byte for byte.
{
 const source=memory({[JOURNEY_KEY]:'{"version":6,"chapters":[1,2]}',[STAR_KEY]:'{"version":3,"stars":["a"]}',[DIFFICULTY_KEY]:'hard',[FLIGHT_INVERT_KEY]:'true','neon-eclipse.harbor.v1':'{"version":1,"unlocked":2,"checkpoint":null,"completed":false}'});
 const bundle=await createSaveHub({storage:source,now}).exportBundle();
 const copy=JSON.parse(JSON.stringify(bundle));
 const target=memory();
 const r=await createSaveHub({storage:target,now}).importBundle(copy);
 assert.ok(r.ok);
 for(const key of Object.keys(bundle.slots))assert.equal(target.getItem(key),source.getItem(key));
 assert.equal(target.keys().filter(k=>k!==BACKUP_KEY).length,Object.keys(bundle.slots).length);
}
console.log('PASS: save hub registry, health inspection, export, preview, merge/replace import with pre-import backup and restore, failure modes, byte-exact round trip');

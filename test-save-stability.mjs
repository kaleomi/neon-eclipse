// Isolated in-memory fault injection only. No real localStorage, IndexedDB, browser or renderer.
import assert from 'node:assert/strict';
import {createSaveHub,SAVE_HUB_APP,SAVE_HUB_SCHEMA,BACKUP_KEY,SLOTS} from './save-hub.js';
import {createJourneyStore,JOURNEY_KEY,CHAPTERS} from './journey.js';
import {createCampaignStore} from './campaign.js';
const A='neon-eclipse.combat-difficulty.v1',B='neon-eclipse-flight-invert-ws',STAR='neon-eclipse.stars.v1';
const now=()=>Date.UTC(2026,8,18,15,0,0);
const bundle=(slots,extra={})=>({app:SAVE_HUB_APP,schema:SAVE_HUB_SCHEMA,slots,...extra});
const backup=slots=>JSON.stringify({...bundle(slots),createdAt:new Date(now()).toISOString()});
function memory(initial={}){
 const rows=new Map(Object.entries(initial)),writes=[],removes=[];const faults={read:null,write:null,remove:null};
 return {rows,writes,removes,faults,getItem(k){if(faults.read?.(k))throw Error('read denied');return rows.get(k)??null;},
  setItem(k,v){if(faults.write?.(k))throw Error('quota');rows.set(k,String(v));writes.push(k);},
  removeItem(k){if(faults.remove?.(k))throw Error('remove denied');rows.delete(k);removes.push(k);}};
}
let passed=0,failed=0;
async function test(name,fn){try{await fn();passed++;console.log('PASS',name);}catch(e){failed++;console.error('FAIL',name,e.message);}}
await test('read denial is not empty data and cannot create an incomplete backup',async()=>{
 const s=memory({[A]:'hard',[BACKUP_KEY]:backup({[A]:'easy'})}),hub=createSaveHub({storage:s,now});s.faults.read=k=>k===A;
 assert.equal(hub.health().find(x=>x.key===A).status,'unavailable');
 await assert.rejects(hub.exportBundle());assert.throws(()=>hub.snapshot());
 assert.equal(hub.previewImport(bundle({[A]:'normal'})).code,'unavailable');
 assert.equal((await hub.importBundle(bundle({[A]:'normal'}))).code,'backup-failed');
 assert.equal(hub.restoreBackup().code,'unavailable');assert.equal(s.writes.length,0);assert.equal(s.removes.length,0);
 assert.equal(s.rows.get(A),'hard');assert.equal(s.rows.get(BACKUP_KEY),backup({[A]:'easy'}));
 const none=createSaveHub({storage:null,now});await assert.rejects(none.exportBundle());
});
await test('partial restore retains its target backup and can retry',()=>{
 const old=backup({[A]:'easy',[B]:'false'}),s=memory({[A]:'hard',[B]:'true',[BACKUP_KEY]:old,'foreign.key':'keep'}),hub=createSaveHub({storage:s,now});
 s.faults.write=k=>k===B;const r=hub.restoreBackup();assert.equal(r.code,'partial');assert.equal(r.ok,false);
 assert.equal(s.rows.get(BACKUP_KEY),old,'failed restore must not swap away the desired target');
 s.faults.write=null;assert.equal(hub.restoreBackup().ok,true);assert.equal(s.rows.get(A),'easy');assert.equal(s.rows.get(B),'false');assert.equal(s.rows.get('foreign.key'),'keep');
 const d=memory({[A]:'hard',[B]:'true',[BACKUP_KEY]:backup({[A]:'easy'})}),dh=createSaveHub({storage:d,now});d.faults.remove=k=>k===B;
 const target=d.rows.get(BACKUP_KEY);assert.equal(dh.restoreBackup().code,'partial');assert.equal(d.rows.get(BACKUP_KEY),target);assert.equal(d.rows.get(B),'true');
 d.faults.remove=null;assert.equal(dh.restoreBackup().ok,true);assert.equal(d.rows.has(B),false);
});
await test('restore preserves original malformed bytes rather than silently keeping imported data',()=>{
 const raw='{original damaged bytes',s=memory({[STAR]:'{"version":6,"stars":[]}',[BACKUP_KEY]:backup({[STAR]:raw})}),hub=createSaveHub({storage:s,now});
 const r=hub.restoreBackup();assert.equal(r.ok,true);assert.equal(s.rows.get(STAR),raw);
 assert.equal(hub.health().find(x=>x.key===STAR).status,'corrupt');
});
await test('undo snapshot write failure is reported and does not destroy the prior restore target',()=>{
 const old=backup({[A]:'easy'}),s=memory({[A]:'hard',[BACKUP_KEY]:old}),hub=createSaveHub({storage:s,now});s.faults.write=k=>k===BACKUP_KEY;
 const r=hub.restoreBackup();assert.equal(r.ok,false);assert.equal(r.code,'partial');assert.ok(r.failed.some(x=>x.key===BACKUP_KEY));assert.equal(s.rows.get(BACKUP_KEY),old);
 assert.equal(s.rows.get(A),'easy','report the real partial operation, not fictitious rollback');
});
await test('overlapping import/restore cannot replace an in-flight import backup',async()=>{
 const s=memory({[A]:'hard'});let release;
 const records={save:()=>new Promise(resolve=>{release=resolve;})},hub=createSaveHub({storage:s,records,now});
 const first=hub.importBundle(bundle({[A]:'easy'},{flightRecords:[{id:'r'}]}));
 const second=await hub.importBundle(bundle({[A]:'normal'}));const restored=hub.restoreBackup();const backupDuringImport=hub.writeBackup();
 release({ok:true});const finished=await first;
 assert.equal(second.code,'busy');assert.equal(restored.code,'busy');assert.equal(backupDuringImport,false);assert.equal(finished.ok,true);
 assert.equal(s.rows.get(A),'easy');assert.equal(JSON.parse(s.rows.get(BACKUP_KEY)).slots[A],'hard');
 assert.equal((await hub.importBundle(bundle({[A]:'normal'}))).ok,true,'lock released after completion');
});
await test('flight-record write failure/rejection produces an explicit partial result',async()=>{
 for(const throws of [false,true]){
  const s=memory({[A]:'hard'}),hub=createSaveHub({storage:s,now,records:{async save(){if(throws)throw Error('denied');return {ok:false,code:'quota'};}}});
  const r=await hub.importBundle(bundle({[A]:'easy'},{flightRecords:[{id:'r'}]}));
  assert.equal(r.ok,false);assert.equal(r.code,'partial');assert.equal(r.flight.failed,1);assert.equal(s.rows.get(A),'easy');
  assert.equal(JSON.parse(s.rows.get(BACKUP_KEY)).slots[A],'hard');assert.equal((await hub.importBundle(bundle({[A]:'normal'}))).ok,true);
 }
});
await test('import limit counts UTF-8 bytes; serialization errors cause no writes',async()=>{
 const s=memory(),hub=createSaveHub({storage:s,now});
 const large=bundle({[STAR]:JSON.stringify({version:6,stars:['雪'.repeat(1450000)]})});
 assert.equal((await hub.importBundle(large)).code,'too-large');assert.equal(s.writes.length,0);
 const cyclic=bundle({[A]:'hard'});cyclic.self=cyclic;assert.equal((await hub.importBundle(cyclic)).code,'invalid');assert.equal(s.writes.length,0);
});
await test('legacy 3–8 chapter completion is read-only adopted and resumes at the next chapter',()=>{
 assert.equal(CHAPTERS.length,9);
 for(let version=1;version<=6;version++){
  const count=version+2,key=`neon-eclipse.journey.v${version}`;
  const original=JSON.stringify({version,chapter:count-1,status:'complete',checkpoint:null,results:Array.from({length:count},()=>({time:20,kills:2}))});
  const s=memory({[key]:original}),store=createJourneyStore(s);
  assert.equal(store.data.version,7);assert.equal(store.data.status,'between');assert.equal(s.writes.length,0);assert.equal(s.rows.get(JOURNEY_KEY),undefined);
  assert.equal(store.advance(),true);assert.equal(store.data.chapter,count);assert.equal(store.data.status,'active');assert.equal(s.rows.get(key),original);
 }
 const s=memory({[JOURNEY_KEY]:'{"version":99}', 'neon-eclipse.journey.v6':JSON.stringify({version:6,chapter:7,status:'complete',checkpoint:null,results:Array.from({length:8},()=>({time:20,kills:2}))})});
 assert.equal(createJourneyStore(s).data,null,'invalid current slot does not silently roll back to legacy');assert.equal(s.writes.length,0);
});
await test('nine-chapter result writes do not advance on failure or duplicate completion',()=>{
 const s=memory(),store=createJourneyStore(s);assert.equal(store.start(),true);
 const cp={stageIndex:0,health:85,rounds:[18,4,10],reserves:[60,16,30],selected:0,x:0,z:29,yaw:0,pitch:0,time:20,kills:3,collected:[]};
 for(let i=0;i<CHAPTERS.length;i++){
  const map=CHAPTERS[i].map;assert.equal(store.save(map,cp),true);const before=store.data,raw=s.rows.get(JOURNEY_KEY);s.faults.write=k=>k===JOURNEY_KEY;
  assert.equal(store.finish(map,{time:40,kills:10}),false);assert.deepEqual(store.data,before);assert.equal(s.rows.get(JOURNEY_KEY),raw);
  s.faults.write=null;assert.equal(store.finish(map,{time:40,kills:10}),true);assert.equal(store.finish(map,{time:40,kills:10}),false);assert.equal(store.data.results.length,i+1);
  if(i<8)assert.equal(store.advance(),true);
 }
 assert.equal(store.data.status,'complete');assert.equal(store.advance(),false);
 const blocked=memory();blocked.faults.write=()=>true;const single=createCampaignStore(blocked);assert.equal(single.save(cp),false);assert.equal(single.persistent,false);assert.deepEqual(single.checkpoint,cp,'intentional single-page retry fallback stays supported');
});
console.log(`save stability: ${passed}/${passed+failed} passed; isolated memory only`);
if(failed)process.exitCode=1;

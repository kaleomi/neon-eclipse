import assert from 'node:assert/strict';
import {createTelemetryAttempt,telemetryRecordFromResult,validTelemetryRecord,summarizeTelemetry,readTelemetryEnabled,writeTelemetryEnabled,createTelemetry,TELEMETRY_SETTING_KEY} from '../src/telemetry.js';
import {createFieldRecord} from '../src/field-record.js';

const memory=(init={})=>{const m=new Map(Object.entries(init));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);}};};
const now=()=>1789000000000;

// 1. Enabled flag defaults to true, persists, tolerates broken storage.
{
 const s=memory();
 assert.equal(readTelemetryEnabled(s),true);
 assert.ok(writeTelemetryEnabled(false,s));assert.equal(s.getItem(TELEMETRY_SETTING_KEY),'false');assert.equal(readTelemetryEnabled(s),false);
 assert.ok(writeTelemetryEnabled(true,s));assert.equal(readTelemetryEnabled(s),true);
 assert.equal(readTelemetryEnabled({getItem(){throw new Error('denied');}}),true);
 assert.equal(writeTelemetryEnabled(true,null),false);
}

// 2. Record built from real field records: totals, death location + stage, per-stage rows.
{
 const field=createFieldRecord();
 field.tick(12.5,0);field.shot();field.shot();field.hurt(15);
 field.tick(20,1);field.shot();field.hurt(30);field.window();field.coreHit({});field.die({x:3.6,y:1.7+2,z:-8.2});
 const attempt=createTelemetryAttempt({map:'harbor',mode:'campaign',difficulty:'hard',stage:0,now,random:()=>0.5});
 assert.match(attempt.id,/^2026-09-/);
 const r=telemetryRecordFromResult({attempt,won:false,stages:field.records,kills:7,time:32.55,weaponShots:[2,1,0,0],endStage:1,now});
 assert.ok(validTelemetryRecord(r));
 assert.equal(r.map,'harbor');assert.equal(r.mode,'campaign');assert.equal(r.difficulty,'hard');
 assert.equal(r.won,false);assert.equal(r.kills,7);assert.equal(r.time,32.6);
 assert.equal(r.damage,45);assert.equal(r.shots,3);assert.equal(r.windows,1);assert.equal(r.coreHits,1);assert.equal(r.usedWindows,1);
 assert.deepEqual(r.death,{stage:1,x:4,z:-8,feet:2});
 assert.deepEqual(r.stages.map(s=>[s.stage,s.seconds,s.damage,s.shots,s.died]),[[0,12.5,15,2,false],[1,20,30,1,true]]);
 assert.deepEqual(r.weaponShots,[2,1,0,0]);
 assert.equal(r.finishedAt,now());
 const win=telemetryRecordFromResult({attempt,won:true,stages:field.records,kills:9,time:100,endStage:4,now});
 assert.equal(win.death,null);assert.equal(win.won,true);assert.equal(win.weaponShots,null);
}

// 3. Validation rejects malformed records.
{
 const attempt=createTelemetryAttempt({map:'reactor',mode:'journey',difficulty:'normal',now,random:()=>0.1});
 const good=telemetryRecordFromResult({attempt,won:true,stages:[],kills:1,time:5,endStage:4,now});
 assert.ok(validTelemetryRecord(good));
 for(const bad of [null,{...good,schema:2},{...good,mode:'arcade'},{...good,difficulty:'insane'},{...good,kills:-1},{...good,won:'yes'},{...good,death:{x:'a'}},{...good,stages:'x'},{...good,id:'x'.repeat(81)}])assert.equal(validTelemetryRecord(bad),false);
}

// 4. Summary aggregates per map, per difficulty, best legit time only, deadliest stage.
{
 const mk=(o)=>({schema:1,id:Math.random().toString(36),map:'reactor',mode:'campaign',difficulty:'normal',startStage:0,endStage:4,fromCheckpoint:false,won:true,kills:10,time:200,damage:50,shots:100,coreHits:0,windows:0,usedWindows:0,weaponShots:null,death:null,stages:[],startedAt:1,finishedAt:2,...o});
 const records=[
  mk({time:180}),mk({time:150,fromCheckpoint:true}),mk({time:170,mode:'replay'}),mk({difficulty:'hard',time:220,damage:90}),
  mk({won:false,endStage:2,death:{stage:2,x:0,z:0,feet:0}}),mk({won:false,endStage:2,death:{stage:2,x:0,z:0,feet:0}}),mk({won:false,endStage:3,death:{stage:3,x:0,z:0,feet:0}}),
  mk({map:'harbor',won:false,endStage:4,death:null}),
  {garbage:true}
 ];
 const s=summarizeTelemetry(records);
 assert.equal(s.total,9);
 const r=s.byMap.reactor;
 assert.equal(r.attempts,7);assert.equal(r.wins,4);assert.equal(r.losses,3);
 assert.equal(r.bestTime,180,'checkpoint resumes and replay do not set best time');
 assert.deepEqual(r.deathsByStage,{2:2,3:1});assert.equal(r.deadliestStage,2);
 assert.equal(r.averageDamagePerWin,60);assert.equal(r.averageShotsPerWin,100);
 assert.deepEqual(r.byDifficulty,{normal:{attempts:6,wins:3},hard:{attempts:1,wins:1}});
 assert.equal(s.byMap.harbor.deadliestStage,4,'no death coordinates falls back to endStage');
 assert.equal(s.byMap.harbor.bestTime,null);
}

// 5. Runtime wrapper: disabled -> nothing saved; enabled -> save via injected store; store errors never throw.
{
 const saved=[];const store={save:async r=>{saved.push(r);return {ok:true};},read:async()=>({ok:true,records:saved}),clear:async()=>{saved.length=0;return {ok:true};}};
 const s=memory({[TELEMETRY_SETTING_KEY]:'false'});
 const t=createTelemetry({store,storage:s});
 assert.equal(t.enabled,false);
 const attempt=createTelemetryAttempt({map:'tower',mode:'campaign',difficulty:'easy',now,random:()=>0.2});
 assert.equal((await t.record({attempt,won:true,stages:[],kills:0,time:1,endStage:4,now})).code,'disabled');
 assert.equal(saved.length,0);
 t.setEnabled(true);assert.equal(s.getItem(TELEMETRY_SETTING_KEY),'true');
 assert.ok((await t.record({attempt,won:true,stages:[],kills:0,time:1,endStage:4,now})).ok);
 assert.equal(saved.length,1);assert.equal(saved[0].map,'tower');
 assert.equal((await t.read()).records.length,1);
 assert.ok((await t.clear()).ok);assert.equal(saved.length,0);
 const broken=createTelemetry({store:{save:async()=>{throw new Error('boom');},read:async()=>({ok:false}),clear:async()=>({ok:false})},storage:memory()});
 assert.equal((await broken.record({attempt,won:false,stages:[],kills:0,time:1,endStage:0,now})).code,'failed');
 const none=createTelemetry({store:null,storage:memory()});
 assert.equal((await none.read()).code,'unavailable');
}
console.log('PASS: telemetry enabled flag, record built from field records with death stage, validation, per-map/difficulty summary with legit best time, runtime wrapper disabled/enabled/failure isolation');

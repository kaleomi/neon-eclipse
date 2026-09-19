import assert from 'node:assert/strict';
import {emptyExpedition,validExpedition,canonicalExpedition,expeditionSnapshot,newExpeditionId,newExpeditionCampaign,
  EXPEDITION_MISSIONS,advanceExpedition,summarizeExpedition,expeditionCheckpointFromMission,saveExpeditionCheckpoint,
  expeditionRecordFromMission} from './expedition-model.js';
import {createExpeditionSession} from './expedition-session.js';
import {createExpeditionBackup,makeExpeditionBundle,parseExpeditionBundle} from './expedition-backup.js';
import {createNavalRun,restoreNavalCheckpoint} from './naval-checkpoint-model.js';
import {createJointMission,JOINT_STAGES} from './joint-mission.js';
import {restoreJointCheckpoint} from './joint-checkpoint-model.js';
import {createLighthouseMission,restoreLighthouseCheckpoint,LIGHTHOUSE_STAGES} from './lighthouse-mission.js';
import {createYacht} from './maritime-rules.js';
const copy=x=>JSON.parse(JSON.stringify(x));
function archive(count=1){
  let a=newExpeditionCampaign(emptyExpedition(),'hard');
  for(let i=0;i<count;i++){const m=EXPEDITION_MISSIONS[i];a=advanceExpedition(a,{schema:1,id:newExpeditionId(),campaignId:a.campaign.id,mission:m.id,rule:m.rule,difficulty:m.selectable?'hard':'fixed',resumed:false,elapsedMs:100000,completedAt:100});}
  return a;
}
function native(id){
  const m=id==='naval'?createNavalRun(createYacht(),'hard'):id==='lighthouse'?createLighthouseMission('hard',true):createJointMission(true);m.elapsed=20;
  if(id==='naval')m.index=1;else if(id==='lighthouse'){m.stage='heli';m.surveys=3;m.completed=LIGHTHOUSE_STAGES.slice(0,6);}else{m.stage='drive';m.completed=['pickup'];}return m;
}
function at(a,id){return {id:newExpeditionId(),campaignId:a.campaign.id,mission:id,difficulty:id==='naval'||id==='lighthouse'?'hard':'fixed',fromStart:true};}
function win(m,id){
  Object.assign(m,{status:'won',elapsed:45});
  if(id==='naval'){Object.assign(m,{index:3,escaped:true,complete:true,remaining:100});m.naval.members.forEach(x=>x.escaped=true);}
  else if(id==='lighthouse'){m.stage='complete';m.completed=[...LIGHTHOUSE_STAGES];m.surveys=3;}
  else{m.stage='complete';m.completed=[...JOINT_STAGES];m.flightId=newExpeditionId();}return m;
}
function store(initial=archive()){
  let data=copy(initial),revision=1,last=null,fail=null,gate=null;
  return {read:async()=>({ok:true,checkpoint:copy(data),revision}),async write(job,expected){
    if(gate){const wait=gate;gate=null;await wait;}
    if(fail){const code=fail;fail=null;return {ok:false,code};}
    if(last?.operationId===job.operationId)return JSON.stringify(last)===JSON.stringify(job)?{ok:true,revision,duplicate:true}:{ok:false,code:'conflict'};
    if(expected!==revision)return {ok:false,code:'conflict'};
    data=copy(job.checkpoint);last=copy(job);revision++;return {ok:true,revision};
  },close(){},fail(code){fail=code;},delay(){let release;gate=new Promise(r=>release=r);return release;}};
}
const current=archive(2),legacy={schema:1,rule:current.rule,campaign:current.campaign,records:current.records},raw=JSON.stringify(legacy);
assert(validExpedition(legacy));const migrated=canonicalExpedition(legacy);assert.equal(migrated.schema,2);assert.equal(migrated.checkpoint,null);assert.equal(migrated.undo,null);assert.deepEqual(migrated.records,current.records);assert.equal(JSON.stringify(legacy),raw);
assert(!validExpedition({...current,schema:99}));assert(!validExpedition({...current,checkpoint:undefined}));assert(!validExpedition({...current,undo:{archive:current}}));
for(const id of ['naval','joint','lighthouse']){
  let a=archive(id==='naval'?1:id==='joint'?3:4);const owned=at(a,id),m=native(id),node=expeditionCheckpointFromMission(owned,m,100);
  assert(node);assert.equal(expeditionCheckpointFromMission({...owned,fromStart:undefined},m),null);
  assert.equal(saveExpeditionCheckpoint(a,{...node,node:{...node.node,stage:[node.node.stage]}}),null);
  a=saveExpeditionCheckpoint(a,node);assert(validExpedition(a));assert.equal(node.campaignId,a.campaign.id);
  for(const bad of [{...node,campaignId:newExpeditionId()},{...node,mission:'recon'},{...node,node:{...node.node,stage:'constructor'}},{...node,node:{...node.node,elapsedMs:NaN}}])assert.equal(saveExpeditionCheckpoint(a,bad),null);
  if(id==='naval'||id==='lighthouse')assert.equal(saveExpeditionCheckpoint(a,{...node,node:{...node.node,difficulty:'easy'}}),null);
  const restored=id==='naval'?restoreNavalCheckpoint(node.node).task:id==='lighthouse'?restoreLighthouseCheckpoint(node.node).mission:restoreJointCheckpoint(node.node).mission;
  win(restored,id);const resumed={...owned,id:newExpeditionId(),fromStart:false,resume:node};
  const r=expeditionRecordFromMission(resumed,restored);assert(r?.resumed);assert.equal(r.schema,2);
  assert.equal(expeditionRecordFromMission({...resumed,resume:null},restored),null);
  assert.equal(expeditionRecordFromMission({...resumed,campaignId:newExpeditionId()},restored),null);
  assert.equal(expeditionRecordFromMission(owned,restored),null,'recovered source cannot become a clean record');
  assert.equal(expeditionRecordFromMission(resumed,{...restored,recovered:false}),null);
  assert.equal(expeditionRecordFromMission(resumed,{...restored,elapsed:10}),null);
  const done=advanceExpedition(a,r);assert(validExpedition(done));assert.equal(done.checkpoint,null);
  const row=summarizeExpedition(done).find(x=>x.mission===id&&x.difficulty===(id==='naval'||id==='lighthouse'?'hard':'fixed'));
  assert.equal(row.count,0);assert.equal(row.bestMs,null);assert.equal(row.resumedCount,1);
  assert(!validExpedition({...done,schema:1}),'legacy schema must not accept resumed records');
}
console.log('PASS migration, campaign/mission/difficulty/node binding (naval, joint, lighthouse helipad node), native recovered evidence, honest separate scores and atomic node retirement');

// Checkpoint writes and a finish can overlap. A later result must reduce on committed state, never disappear.
for(const fault of ['delayed','quota']){
  const memory=store(),session=createExpeditionSession({store:memory});await session.load();const m=native('naval');
  await session.launch(async()=>({source:m,isCurrent:()=>true}));
  let release;if(fault==='delayed')release=memory.delay();else memory.fail('quota');
  assert(session.saveCheckpoint('naval',m));assert.equal(session.saveCheckpoint('naval',{...m}),false);
  win(m,'naval');assert(session.finish('naval',m));assert.equal(session.snapshot().archive.campaign.completed.length,1);
  if(release)release();await session.settled();
  if(fault==='quota'){assert(session.snapshot().pending);assert.equal(session.snapshot().archive.campaign.completed.length,1);assert(await session.retry());}
  assert.equal(session.snapshot().archive.campaign.completed.length,2);assert.equal(session.snapshot().archive.checkpoint,null);assert(!session.snapshot().pending);
}
const memory=store(),session=createExpeditionSession({store:memory});await session.load();let m=native('naval');
await session.launch(async()=>({source:m,isCurrent:()=>true}));session.saveCheckpoint('naval',m);await session.settled();
assert.equal((await session.maintain(async()=>({ok:true}))).code,'busy','backup replacement excludes live attempt');
session.detach();assert(await session.launch(async(spec,difficulty,node)=>{assert.equal(difficulty,'hard');m=restoreNavalCheckpoint(node).task;return {source:m,isCurrent:()=>true};},{resume:true}));
assert(session.snapshot().active.resumed);win(m,'naval');session.finish('naval',m);await session.settled();assert(session.snapshot().archive.records.at(-1).resumed);
console.log('PASS queued checkpoint/result commit, quota retry, owned source, recovered launch, maintenance exclusion');

const storage=store(legacy),manager=createExpeditionBackup({store:storage,now:()=>1000});
assert((await manager.exportBundle()).ok);assert.equal(JSON.stringify((await storage.read()).checkpoint),raw,'read/export does not rewrite legacy row');
const incoming=archive(1),input=makeExpeditionBundle(incoming,2000),before=await storage.read();
for(const invalid of ['{',{}, {...input,kind:'fps'},{...input,schema:99},{...input,archive:{...incoming,schema:99}}])assert(!(await manager.previewImport(invalid)).ok);
assert.equal(parseExpeditionBundle(' '.repeat(4*1024*1024+1)).code,'too-large');
const preview=await manager.previewImport(input);assert(preview.ok);assert.deepEqual(await storage.read(),before,'preview is read-only');
input.archive.campaign.difficulty='easy'; // Mutation after preview must not change the prepared payload.
storage.fail('quota');assert.equal((await manager.apply(preview)).code,'quota');assert.deepEqual(await storage.read(),before);
assert((await manager.apply(preview)).ok);const after=await storage.read();assert.equal(after.checkpoint.campaign.difficulty,'hard');assert.deepEqual(after.checkpoint.undo.archive,expeditionSnapshot(legacy));
assert((await manager.apply(preview)).duplicate);assert.equal((await storage.read()).revision,after.revision);
const noChange=await manager.previewImport(makeExpeditionBundle(incoming));assert(noChange.unchanged);assert((await manager.apply(noChange)).unchanged);assert.deepEqual(await storage.read(),after,'re-importing the same content must not destroy undo or consume a revision');
const exported=await manager.exportBundle();assert.equal(exported.bundle.archive.undo,null,'bundles do not nest undo history');
const restore=await manager.previewRestore();assert(restore.ok);assert((await manager.apply(restore)).ok);
assert.deepEqual(expeditionSnapshot((await storage.read()).checkpoint),expeditionSnapshot(legacy));
const redo=await manager.previewRestore();assert((await manager.apply(redo)).ok);assert.deepEqual(expeditionSnapshot((await storage.read()).checkpoint),expeditionSnapshot(incoming));
const stale=await manager.previewImport(makeExpeditionBundle(archive(0),2000));const other=createExpeditionBackup({store:storage,now:()=>1000}),fresh=await other.previewImport(makeExpeditionBundle(archive(3),2000));
assert((await other.apply(fresh)).ok);const newest=await storage.read();assert.equal((await manager.apply(stale)).code,'conflict');assert.deepEqual(await storage.read(),newest);
const unavailable=createExpeditionBackup({store:{read:async()=>({ok:false,code:'corrupt'})}});assert.equal((await unavailable.previewImport(makeExpeditionBundle(incoming))).code,'corrupt');
assert.equal((await manager.apply({ok:true})).code,'invalid');
console.log('PASS dedicated bundle validation/limit, read-only preview, immutable intent, atomic preimage, quota, idempotency, undo/redo, CAS and corruption preservation');

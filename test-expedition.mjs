import assert from 'node:assert/strict';
import {EXPEDITION_MISSIONS,emptyExpedition,validExpedition,validExpeditionRecord,newExpeditionCampaign,
  expeditionRecordFromMission,advanceExpedition,summarizeExpedition,newExpeditionId,canonicalExpedition} from './expedition-model.js';
import {createExpeditionSession} from './expedition-session.js';
import {createExpeditionStore} from './expedition-store.js';
import {createEscort} from './escort-rules.js';
import {createNavalRun} from './naval-checkpoint-model.js';
import {createYacht} from './maritime-rules.js';
import {createFlightMission} from './flight-mission.js';
import {createJointMission,JOINT_STAGES} from './joint-mission.js';
import {createLighthouseMission,LIGHTHOUSE_STAGES,LIGHTHOUSE_RULE} from './lighthouse-mission.js';

// Native-shaped end-state fixtures exercise score eligibility, not human gameplay completion.
function won(id,difficulty='normal'){
  let m;
  if(id==='escort'){
    m=createEscort(difficulty,true);Object.assign(m.truck,{arrived:true,index:4});m.waves=[true,true,true];m.waveIndex=3;
    m.spawned=m.profile.waves.reduce((a,b)=>a+b,0);m.killed=m.spawned;m.hounds=Array.from({length:m.spawned},()=>({alive:false}));m.elapsed=100;
  }else if(id==='naval'){
    m=createNavalRun(createYacht(),difficulty);Object.assign(m,{index:3,escaped:true,complete:true,elapsed:45,remaining:30});m.naval.members.forEach(s=>{s.escaped=true;});
  }else if(id==='recon'){
    m=createFlightMission({},'recon');m.elapsed=100;
    m.result={attempt:m.attempt,completedAt:Date.now(),tookOff:true,approached:true,landedSafely:true,routeComplete:true,uploadTime:2,status:'won',elapsed:100,gates:3,stopTime:2,records:['north-relay','sea-beacon','airfield-terminal'].map(id=>({id})),uploaded:true};
  }else if(id==='lighthouse'){
    m=createLighthouseMission(difficulty,true);m.stage='complete';m.completed=[...LIGHTHOUSE_STAGES];m.surveys=3;m.elapsed=200;
  }else{
    m=createJointMission(true);m.stage='complete';m.completed=[...JOINT_STAGES];m.flightId=newExpeditionId();m.elapsed=300;
  }
  m.status='won';return m;
}
function attempt(a,id){return {id:newExpeditionId(),campaignId:a.campaign.id,mission:id,difficulty:['recon','joint'].includes(id)?'fixed':a.campaign.difficulty,fromStart:true};}
function score(a,id,m=won(id,a.campaign.difficulty)){return expeditionRecordFromMission(attempt(a,id),m,{roverHull:100},1700000000000);}
let a=emptyExpedition();assert(validExpedition(a));
assert.equal(newExpeditionCampaign(a,'fixed'),null);assert.equal(newExpeditionCampaign(a,'constructor'),null);
a=newExpeditionCampaign(a,'hard');assert(validExpedition(a));
assert.equal(advanceExpedition(a,score(a,'naval')),null,'cannot skip first mission');
assert.equal(advanceExpedition(a,{...score(a,'escort'),difficulty:'easy'}),null,'difficulty is locked');
for(const spec of EXPEDITION_MISSIONS){
  const m=won(spec.id,'hard'),at=attempt(a,spec.id),record=expeditionRecordFromMission(at,m,{roverHull:100});
  assert(record&&validExpeditionRecord(record));assert.equal(record.difficulty,spec.selectable?'hard':'fixed');
  assert.equal(expeditionRecordFromMission({...at,fromStart:false},m,{roverHull:100}),null);
  assert.equal(expeditionRecordFromMission(at,{...m,status:'lost'},{roverHull:100}),null);
  assert.equal(expeditionRecordFromMission(at,{...m,recovered:true},{roverHull:100}),null);
  for(const elapsed of [NaN,-1,0,Infinity])assert.equal(expeditionRecordFromMission(at,{...m,elapsed},{roverHull:100}),null);
  const before=JSON.stringify(a),next=advanceExpedition(a,record);assert(next&&validExpedition(next));assert.equal(JSON.stringify(a),before,'immutable reduction');
  assert.equal(advanceExpedition(next,record),null,'duplicate does not advance twice');a=next;
}
assert.equal(a.campaign.completed.length,EXPEDITION_MISSIONS.length);assert.equal(a.records.length,EXPEDITION_MISSIONS.length);assert.equal(EXPEDITION_MISSIONS.length,5);
assert.equal(advanceExpedition(a,score(a,'joint')),null);assert.equal(advanceExpedition(a,score(a,'lighthouse')),null,'no sixth mission yet');
const malformed=[{schema:99},{rule:'front4-v2'},{records:[...a.records,a.records[0]]},{campaign:{...a.campaign,completed:a.campaign.completed.slice(1)}},{campaign:{...a.campaign,difficulty:'easy'}}];
for(const patch of malformed)assert(!validExpedition({...a,...patch}));
for(const patch of [{difficulty:'hard',mission:'recon',rule:'recon-v1'},{resumed:true},{elapsedMs:0},{completedAt:NaN},{rule:'escort-v2'}])assert(!validExpeditionRecord({...a.records[0],...patch}));
for(const id of ['escort','naval','recon','joint','lighthouse']){
  const m=won(id,'hard');
  if(id==='lighthouse')m.surveys=2;
  if(id==='escort')m.waves[1]=false;
  if(id==='naval')m.complete=false;
  if(id==='recon')m.result.uploaded=false;
  if(id==='joint')m.completed.pop();
  assert.equal(score(a,id,m),null,'won flag alone is insufficient: '+id);
}
assert.equal(score(a,'escort',{...won('escort','hard'),profile:{id:'normal'}}),null);
assert.equal(expeditionRecordFromMission(attempt(a,'escort'),won('escort','hard'),{roverHull:0}),null);
const previous=JSON.stringify(a);let second=newExpeditionCampaign(a,'easy');assert.equal(JSON.stringify(a),previous);
for(const spec of EXPEDITION_MISSIONS)second=advanceExpedition(second,score(second,spec.id));
const rows=summarizeExpedition(second);assert.equal(rows.find(r=>r.mission==='escort'&&r.difficulty==='hard').count,1);assert.equal(rows.find(r=>r.mission==='escort'&&r.difficulty==='easy').count,1);assert.equal(rows.find(r=>r.mission==='recon').count,2);
assert.equal(second.records.length,10);assert.equal(rows.find(r=>r.mission==='lighthouse'&&r.difficulty==='easy').count,1);assert.equal(rows.find(r=>r.mission==='lighthouse'&&r.difficulty==='hard').count,1);
assert.equal(score(second,'lighthouse',won('lighthouse','hard')),null,'fifth mission difficulty is locked to the campaign');assert.throws(()=>summarizeExpedition({schema:2}));
// lighthouse-v1 archives (yacht return, pre-helicopter) remain readable and count for progress; v2 is the rule new records carry.
assert.equal(LIGHTHOUSE_RULE,'lighthouse-v2');const v1Rec=second.records.find(r=>r.mission==='lighthouse');assert.equal(v1Rec.rule,'lighthouse-v2');
const legacy=canonicalExpedition(second);legacy.records=legacy.records.map(r=>r.mission==='lighthouse'?{...r,rule:'lighthouse-v1'}:r);assert(validExpedition(legacy),'v1 lighthouse record still valid');
assert(!validExpedition({...legacy,records:legacy.records.map(r=>r.mission==='lighthouse'?{...r,rule:'lighthouse-v0'}:r)}),'unknown rule rejected');
assert.equal(summarizeExpedition(legacy).find(r=>r.mission==='lighthouse'&&r.difficulty==='easy').count,0,'v1 times are not mixed into v2 best times');

const copy=x=>JSON.parse(JSON.stringify(x));
function memoryStore(){
  let archive=null,revision=0,last=null,fail=null,writes=0;
  return {read:async()=>({ok:true,revision,checkpoint:copy(archive)}),async write(job,expected){
    if(fail){const code=fail;fail=null;return {ok:false,code};}
    if(last?.operationId===job.operationId)return JSON.stringify(last)===JSON.stringify(job)?{ok:true,revision,duplicate:true}:{ok:false,code:'conflict'};
    if(revision!==expected)return {ok:false,code:'conflict'};
    archive=copy(job.checkpoint);last=copy(job);revision++;writes++;return {ok:true,revision};
  },close(){},failOnce(code){fail=code;},get writes(){return writes;}};
}
const store=memoryStore(),left=createExpeditionSession({store}),right=createExpeditionSession({store});
assert.equal(await left.newCampaign('normal'),false);assert(await left.load());assert(await left.newCampaign('normal'));
let m=won('escort');m.status='active';assert(await left.launch(async spec=>{assert.equal(spec.id,'escort');return {source:m,isCurrent:()=>true};}));
assert.equal(left.finish('escort',m,{roverHull:100}),false,'active is not terminal');
assert.equal(left.finish('naval',m),false);assert.equal(left.finish('escort',{...m,status:'won'},{roverHull:100}),false,'object ownership');
m.status='lost';assert(left.finish('escort',m,{roverHull:100}));assert.equal(left.snapshot().archive.records.length,0);
m=won('escort');m.status='active';await left.launch(async()=>({source:m,isCurrent:()=>true}));m.status='won';assert(left.finish('escort',m,{roverHull:100}));assert.equal(left.finish('escort',m,{roverHull:100}),true,'duplicate stays campaign-owned, without a second write');await left.settled();assert.equal(left.snapshot().archive.campaign.completed.length,1);
m=won('naval');m.status='active';await left.launch(async()=>({source:m,isCurrent:()=>true}));m.status='won';store.failOnce('quota');assert(left.finish('naval',m));await left.settled();assert(left.snapshot().pending);assert.equal(left.snapshot().archive.records.length,1,'no optimistic progress');assert.equal(await left.newCampaign('easy'),false);assert.equal(await left.load(),false);await left.retry();assert.equal(left.snapshot().archive.records.length,2);assert(!left.snapshot().pending);
await right.load();assert(await right.newCampaign('easy'));
m=won('recon');m.status='active';await left.launch(async()=>({source:m,isCurrent:()=>true}));m.status='won';left.finish('recon',m);await left.settled();assert.equal(left.snapshot().error,'conflict');assert.equal((await store.read()).checkpoint.campaign.completed.length,0);assert.equal(await left.retry(),false,'no blind conflict overwrite');assert(await left.load({discard:true}));assert.equal(left.snapshot().archive.campaign.difficulty,'easy');
assert.equal(await left.launch(async()=>({source:{status:'active'},isCurrent:()=>false})),false,'late/overridden launch not attached');
m=won('escort','easy');m.status='active';await left.launch(async()=>({source:m,isCurrent:()=>true}));left.detach();m.status='won';assert.equal(left.finish('escort',m,{roverHull:100}),false,'switching to single/checkpoint mode detaches');assert.equal((await store.read()).checkpoint.records.length,2);
const reloaded=createExpeditionSession({store});assert(await reloaded.load());assert.equal(reloaded.snapshot().archive.campaign.completed.length,0);assert.equal(reloaded.snapshot().active,null);
const denied=createExpeditionSession({store:{read:async()=>({ok:false,code:'denied'}),close(){}}});assert.equal(await denied.load(),false);assert.equal(await denied.newCampaign('normal'),false);
assert.deepEqual(await createExpeditionStore(null).read(),{ok:false,code:'unavailable'});
assert.deepEqual(await createExpeditionStore({open(){throw new DOMException('Denied','SecurityError');}}).read(),{ok:false,code:'denied'});
console.log('PASS: five-mission ordering (lighthouse appended, front-four rule id kept), strict native completion evidence, locked vs fixed difficulty, qualified score grouping, immutable/corrupt guards, owned sessions, loss/abort/reload, atomic progress, quota retry and conflict rejection');

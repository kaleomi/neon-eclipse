import assert from 'node:assert/strict';
import {createFlightAttempt,flightRecordFromResult,validFlightRecord,summarizeFlightRecords} from '../src/flight-records-model.js';
import {createFlightRecordStore} from '../src/flight-records-store.js';
import {createPlane,stepPlane} from '../src/flight-rules.js';
import {createFlightMission,stepFlightMission} from '../src/flight-mission.js';
import {flightPilot} from './test-flight-pilot.mjs';
import {planeBoxes} from './test-flight-mission-route.mjs';
const outcomes=[];
for(const type of ['return','recon']){
 const p=createPlane(),m=createFlightMission(p,type),attempt=m.attempt;
 for(let i=0;i<120*310&&m.status==='active';i++){const before={...p};stepPlane(p,flightPilot(p,m),1/120,planeBoxes);stepFlightMission(m,p,before,1/120,{scan:true,boxes:planeBoxes});}
 assert.equal(m.status,'won');assert.equal(m.attempt,attempt);assert(Object.isFrozen(attempt));const record=flightRecordFromResult(m.result);assert(record);assert(validFlightRecord(record));assert.equal(record.type,type);assert.equal(record.ruleVersion,type+'-v1');assert.equal(record.id,attempt.id);outcomes.push(m.result);
 for(const change of [{status:'lost'},{tookOff:false},{approached:false},{landedSafely:false},{routeComplete:false},{gates:0},{stopTime:1.99},{elapsed:NaN},{elapsed:0},{elapsed:300},{completedAt:Infinity},{attempt:{...attempt,ruleVersion:type+'-v2'}}])assert.equal(flightRecordFromResult({...m.result,...change}),null,JSON.stringify(change));
 if(type==='recon')for(const change of [{uploaded:false},{uploadTime:1.9},{records:[]},{records:[{id:'sea-beacon'},{id:'north-relay'},{id:'airfield-terminal'}]}])assert.equal(flightRecordFromResult({...m.result,...change}),null);
}
const a=flightRecordFromResult(outcomes[0]),b=flightRecordFromResult(outcomes[1]),old={...a,id:createFlightAttempt('return').id,ruleVersion:'return-v2',elapsedMs:1000};
const groups=summarizeFlightRecords([a,b,old]);assert.equal(groups.find(g=>g.type==='return'&&g.current).count,1);assert.equal(groups.find(g=>g.type==='return'&&g.current).bestMs,a.elapsedMs);assert.equal(groups.find(g=>g.ruleVersion==='return-v2').current,false);
assert.throws(()=>summarizeFlightRecords([a,a]));for(const change of [{schema:2},{type:'sea'},{elapsedMs:-1},{elapsedMs:300001},{id:'bad'},{ruleVersion:'recon-v1'},{completedAt:NaN}])assert(!validFlightRecord({...a,...change}));
const rows=Array.from({length:9},(_,i)=>({...a,id:createFlightAttempt('return').id,elapsedMs:10000+i,completedAt:100+i}));const summary=summarizeFlightRecords(rows).find(g=>g.type==='return');assert.equal(summary.count,9);assert.equal(summary.bestMs,10000);assert.equal(summary.recent.length,5);assert.equal(summary.recent[0].completedAt,108);
assert.deepEqual(await createFlightRecordStore(null).read(),{ok:false,code:'unavailable'});assert.deepEqual(await createFlightRecordStore({open(){throw Object.assign(Error(),{name:'SecurityError'});}}).save(a),{ok:false,code:'denied'});
assert.deepEqual(await createFlightRecordStore(null).save({...a,elapsedMs:-1}),{ok:false,code:'corrupt'});
console.log('PASS: genuine return/recon physics outcomes produce valid records; immutable attempt identity, completion proof, invalid/incomplete outcomes, version separation, exact counts/best/recent, corrupt rows and denied/unavailable storage');

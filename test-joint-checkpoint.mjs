import assert from 'node:assert/strict';
import {checkpointFromMission,restoreJointCheckpoint,validCheckpoint,CHECKPOINT_STAGES} from './joint-checkpoint-model.js';
import {createJointMission,JOINT_STAGES,stepJointMission} from './joint-mission.js';
import {createJointCheckpointStore} from './joint-checkpoint-store.js';
import {CollisionGrid,canEnterRover} from './vehicle-rules.js';import {collisionBoxes} from './vehicle-world.js';
import {FIELD,FIELD_BUILDINGS,isFootSurface,landSurface,bodyBlocksPlayer,yachtFree} from './maritime-rules.js';
const geometry=new CollisionGrid([...collisionBoxes(),...FIELD_BUILDINGS],24,FIELD.bounds),world={geometry,free:(x,z,r)=>isFootSurface(x,z,r)&&geometry.free(x,z,r)};
for(const stage of Object.keys(CHECKPOINT_STAGES)){
 const m=createJointMission(true);m.stage=stage;m.completed=JOINT_STAGES.slice(0,JOINT_STAGES.indexOf(stage));m.elapsed=100.123;const cp=checkpointFromMission(m,1700000000000);assert(cp&&validCheckpoint(cp));assert(Object.isFrozen(cp));
 const r=restoreJointCheckpoint({...cp,x:99999,y:99999,velocity:99999}),r2=restoreJointCheckpoint(cp);assert.notEqual(r.mission.runId,m.runId);assert.notEqual(r.mission.runId,r2.mission.runId);assert.equal(r.mission.stage,stage);assert.equal(r.mission.recovered,true);assert.equal(r.mission.flightId,null);assert.equal(r.mission.hold,0);assert.equal(r.mission.elapsed,100.123);assert.deepEqual(r.mission.completed,m.completed);
 assert(world.free(r.player.x,r.player.z,.4));assert(!bodyBlocksPlayer(r.player.x,r.player.z,r.plane,r.yacht));assert(landSurface(r.rover.x,r.rover.z,1.3)&&geometry.free(r.rover.x,r.rover.z,1.3));assert(yachtFree(r.yacht));assert(r.plane.onGround&&!r.plane.crashed);for(const v of [r.rover,r.yacht,r.plane])assert.equal(v.speed,0);assert.equal(r.plane.throttle,0);assert.equal(r.plane.landings,0);
 assert.equal(checkpointFromMission({...m,completed:[]}),null);assert.equal(checkpointFromMission({...m,status:'lost'}),null);assert.equal(checkpointFromMission({...m,flightId:'old-flight'}),null);assert.equal(checkpointFromMission({...m,elapsed:NaN}),null);
 for(const patch of [{stage:'recon'},{stage:'handoff'},{stage:'constructor'},{schema:2},{rule:'joint-v2'},{elapsedMs:-1},{savedAt:NaN},{recovered:'true'},{runId:'bad'}]){assert(!validCheckpoint({...cp,...patch}));assert.throws(()=>restoreJointCheckpoint({...cp,...patch}));}
 const frozen=JSON.stringify(r.mission);stepJointMission(r.mission,{...r,kind:null,paused:true},.1);assert.equal(JSON.stringify(r.mission),frozen);
}
assert.equal(checkpointFromMission(createJointMission()),null);assert.deepEqual(await createJointCheckpointStore(null).read(),{ok:false,code:'unavailable'});assert.deepEqual(await createJointCheckpointStore({open(){throw new DOMException('Denied','SecurityError');}}).read(),{ok:false,code:'denied'});
console.log('PASS: three safe checkpoint templates, strict version/stage/progress validation, no coordinate deserialization, fresh run/flight state, recovered qualification, paused timer and unavailable/denied storage');

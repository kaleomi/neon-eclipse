import assert from 'node:assert/strict';
import {TRAIN_STAGES} from '../src/train-data.js';
globalThis.location={search:'?map=train'};
const {createMission}=await import('../src/mission.js');
const stage=TRAIN_STAGES[4],m=createMission(),valid={player:{x:stage.x,z:stage.z,feetY:stage.feetY},held:true,clear:true,canInteract:true};
assert.equal(stage.id,'extract');assert.equal(stage.duration,3);assert.equal(stage.feetY,1.5);assert.equal(stage.count,4);
for(const patch of [{clear:false},{held:false},{canInteract:false},{player:{x:stage.x,z:stage.z,feetY:4.5}},{player:{x:stage.x+4,z:stage.z,feetY:1.5}}]){
 m.reset(4);assert.equal(m.tick(5,{...valid,...patch}),null);assert.equal(m.state.complete,false);assert.equal(m.state.progress,0);
}
m.reset(4);assert.equal(m.tick(2.9,valid),null);m.tick(.2,{...valid,held:false});assert.equal(m.state.progress,0);assert.equal(m.tick(2.9,valid),null);const event=m.tick(.1,valid);assert.equal(event.complete,true);assert.equal(m.state.complete,true);assert.equal(m.tick(10,valid),null,'completion emitted once');
console.log('PASS train extraction gates: clear/hold/interaction permission/floor/range; 3-second continuous hold, interrupted progress reset, single completion');

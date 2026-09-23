import assert from 'node:assert/strict';
import {HARBOR_STAGES} from '../src/harbor-data.js';
globalThis.location={search:'?map=harbor'};
const {createMission}=await import('../src/mission.js');
const stage=HARBOR_STAGES[4],m=createMission(),valid={player:{x:stage.x,z:stage.z,feetY:stage.feetY},held:true,clear:true,canInteract:true};
assert.equal(stage.id,'extract');assert.equal(stage.duration,3);assert.equal(stage.feetY,3);assert.equal(stage.count,4);assert(!stage.message.includes('六章战役完成'),'harbor is chapter six, not the end of the nine-chapter campaign');
for(const patch of [{clear:false},{held:false},{canInteract:false},{player:{x:stage.x,z:stage.z,feetY:0}},{player:{x:stage.x+4,z:stage.z,feetY:3}}]){
 m.reset(4);assert.equal(m.tick(5,{...valid,...patch}),null);assert.equal(m.state.complete,false);assert.equal(m.state.progress,0);
}
m.reset(4);assert.equal(m.tick(2.9,valid),null);m.tick(.2,{...valid,held:false});assert.equal(m.state.progress,0);assert.equal(m.tick(2.9,valid),null);const event=m.tick(.1,valid);assert.equal(event.complete,true);assert.equal(m.state.complete,true);assert.equal(m.tick(10,valid),null,'completion is not repeated');
console.log('PASS harbor extraction: guards/hold/LOS/floor/range gates, uninterrupted three-second hold, single completion, chapter-only success copy');

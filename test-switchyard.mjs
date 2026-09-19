import assert from 'node:assert/strict';
import {SWITCHYARD,SWITCHYARD_LANES,SWITCHYARD_CORE,createSwitchyard,trainPoint,switchyardReady} from './switchyard-rules.js';
const safe={player:{x:0,z:0},feetY:0};
const r=createSwitchyard();assert(!r.blocking);assert(!switchyardReady({index:3,defending:true,progress:17.99},true));assert(!switchyardReady({index:3,defending:true,progress:18},false));assert(!switchyardReady({index:4,defending:true,progress:18},true));assert(switchyardReady({index:3,defending:true,progress:18},true));
assert(r.activate());assert(!r.activate());assert.equal(r.hit(99999).damage,0);
r.interact(.6,{id:1,held:true,allowed:true});assert(!r.rail.armed);
r.interact(.3,{id:0,held:true,allowed:true});assert.equal(r.rail.hold,.3);r.tick(1,{...safe,playing:false});assert.equal(r.rail.hold,0);assert.equal(r.rail.timer,4);
r.interact(.3,{id:0,held:true,allowed:true});r.interact(.3,{id:0,held:false,allowed:true});assert.equal(r.rail.hold,0);
r.interact(.3,{id:0,held:true,allowed:false});assert.equal(r.rail.hold,0);
assert(r.interact(.6,{id:0,held:true,allowed:true}));r.tick(4,safe);assert.equal(r.rail.mode,'moving');assert(!r.interact(1,{id:0,held:true,allowed:true}));
r.tick(2.4,safe);assert.equal(r.state.phase,'exposed');assert.equal(r.state.hp,1200,'train only breaks shield');assert.equal(r.state.windows,1);assert(Math.abs(r.state.timer-6)<.021);
assert.equal(r.hit(600).damage,600);assert.equal(r.state.tier,2);r.tick(6,safe);assert.equal(r.state.phase,'shield');assert.equal(r.rail.lane,1);assert(!r.rail.armed);
r.interact(.6,{id:1,held:true,allowed:true});r.tick(6.4,safe);assert.equal(r.hit(9000).damage,600);assert.equal(r.hit(9000).killed,false);assert.equal(r.rail.mode,'idle');assert.equal(r.blast.target,null);assert(r.blocking);assert.equal(r.tick(.8,safe),0);assert(!r.blocking);
r.reset();assert.equal(r.state.phase,'inactive');assert.equal(r.rail.lane,0);assert.equal(r.rail.passes,0);
// Unarmed trains cannot open the shield. All three rails cycle deterministically.
r.activate();for(let i=0;i<3;i++){r.tick(6.4,safe);assert.equal(r.rail.lane,(i+1)%3);assert.equal(r.state.phase,'shield');}
for(let i=0;i<3;i++){assert.deepEqual(trainPoint(i,0,true),{x:10,z:SWITCHYARD_LANES[i]});assert.deepEqual(trainPoint(i,1,true),{x:SWITCHYARD_CORE.x,z:SWITCHYARD_CORE.z});assert.deepEqual(trainPoint(i,1,false),{x:28.4,z:SWITCHYARD_LANES[i]});}
// Swept train impact: one hit, jump clearance, repeatable at 30/60/120/144 Hz.
for(const fps of [30,60,120,144])for(const feetY of [0,1.4]){
 const boss=createSwitchyard();boss.activate();let damage=0;
 for(let t=0;t<6.39;t+=1/fps)damage+=boss.tick(1/fps,{player:{x:14,z:-29},feetY,blastVisible:()=>false});
 assert.equal(damage,feetY?0:24,`train ${fps}Hz height ${feetY}`);
}
// Ground pulse locks the old target, never tracks a dodge, obeys cover, and warns for 1.2 seconds.
for(const [dodged,covered,expected] of [[false,false,14],[true,false,0],[false,true,0]]){
 const b=createSwitchyard();b.activate();const p={x:27,z:-23};assert.equal(b.tick(3.2,{player:p}),0);assert.equal(b.blast.mode,'warning');assert.deepEqual(b.blast.target,p);
 assert.equal(b.tick(1.19,{player:p}),0);
 assert.equal(b.tick(.02,{player:dodged?{x:30,z:-23}:p,blastVisible:()=>!covered}),expected);
 assert.equal(b.tick(.1,{player:p}),0);
}
const bad=createSwitchyard();bad.activate();for(const dt of [NaN,Infinity,-1,0,61])assert.equal(bad.tick(dt,safe),0);assert.equal(bad.rail.timer,4);
console.log('PASS: dispatch gate, holds/cancel, three rails, shield-only train, 6s core window, tier/reset/defeat, swept single-hit trains at four frame rates, jump/dodge/cover and full telegraph');

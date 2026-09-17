import assert from 'node:assert/strict';
import {createArcHazards} from './roof-rules.js';
import {ARC_ZONES,ROOF_STAGES} from './roof-data.js';
import {createTransport} from './transport-rules.js';
import {createPlayerMotion} from './player-motion.js';
globalThis.location={search:'?map=roof'};
const {createMission}=await import('./mission.js');
const {validCheckpoint}=await import('./campaign.js');
const h=createArcHazards(ARC_ZONES,{randomize:true,count:2,random:()=>.25});h.tick(.1,{x:35,z:0},true);const first=h.activeIndices;assert.equal(new Set(first).size,2);h.tick(3,{x:35,z:0},true);assert.equal(h.phase,'warning');assert.deepEqual(h.activeIndices,first);h.tick(1.41,{x:35,z:0},true);assert.equal(h.phase,'live');assert.deepEqual(h.activeIndices,first);assert.equal(h.tick(.01,ARC_ZONES[first[0]],true).damage,8);assert.equal(h.tick(.1,ARC_ZONES[first[0]],true),null);const off=ARC_ZONES.find((_,i)=>!first.includes(i));assert.equal(h.tick(.7,off,true),null);h.tick(0,off,true);assert.deepEqual(h.activeIndices,first);h.tick(.8,off,true);assert.equal(h.phase,'safe');assert.notDeepEqual([...h.activeIndices].sort(),[...first].sort());h.tick(0,off,false);assert.equal(h.time,0);assert.deepEqual(h.activeIndices,[]);
for(const z of ARC_ZONES){assert(Math.abs(z.x)+z.w/2<30,'outer bypass remains free');assert(Math.hypot(z.x,z.z+30)>3,'upload interaction pocket stays clear');}
const m=createMission();m.reset(2);assert(!m.current.requiresTrip);assert(!m.current.points);assert.equal(m.current.short,'天线控制柜');
let e=m.tick(2.01,{player:{x:-12,z:-17.6,y:1.7},held:true,clear:true,transportReady:false});assert.equal(e.next.id,'uplink','control advances without transport or repair');
m.reset(2);assert.equal(m.state.node,0);m.reset(3);assert.equal(m.current.id,'uplink','old advanced checkpoint not rolled back');
const v={x:35,z:5,w:2,d:3,top:0,bottom:-.25},t=createTransport(v),p={x:35,z:5,y:1.7},motion=createPlayerMotion([],[v]);motion.reset(p);
for(let i=0;i<900;i++){t.tick(.02,p,motion);motion.step(.02,p,0,0);}assert(t.tripCompleted);t.reset(t.time,true);assert(t.tripCompleted);t.reset();assert(!t.tripCompleted);t.reset(18);assert(!t.tripCompleted,'time alone does not grant travel');
console.log('PASS: random fixed-per-cycle hazards, two distinct zones, cooldown/disable, protected bypass, optional transport and direct antenna control, five-stage compatibility and trip reset');

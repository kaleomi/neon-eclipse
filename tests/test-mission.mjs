import assert from 'node:assert/strict';
import {STAGES,SUPPLIES,createMission,applySupply,chooseEncounterSpawns} from '../src/mission.js';
import {WEAPONS} from '../src/combat.js';
import {ARENA,createNavigator} from '../src/arena.js';
const m=createMission(),point=STAGES[0];
assert.equal(m.tick(3,{player:point,held:true,clear:false}),null);assert.equal(m.state.index,0);
assert.equal(m.tick(3,{player:{x:0,z:29},held:true,clear:true}),null);
m.tick(1,{player:point,held:true,clear:true});assert.equal(m.state.progress,1);m.tick(.1,{player:point,held:false,clear:true});assert.equal(m.state.progress,0);
m.tick(1,{player:point,held:true,clear:true});m.interrupt();assert.equal(m.state.progress,0);
assert.equal(m.tick(3,{player:point,held:true,clear:true,canInteract:false}),null);
for(let i=0;i<5;i++){
 const stage=STAGES[i];assert.equal(m.current.id,stage.id);
 let event=m.tick(stage.duration+.01,{player:stage,held:!stage.boss,clear:true});assert(event);
 if(stage.defenseDuration){
  assert.equal(event.type,'defense');assert(m.state.defending);assert.equal(m.state.index,i);
  m.tick(10,{player:{x:0,z:0},held:false,clear:false,canInteract:false});assert.equal(m.state.progress,0);
  m.tick(10,{player:stage,held:false,clear:false,canInteract:false});assert.equal(m.state.progress,10);m.interrupt();assert.equal(m.state.progress,10);
  assert.equal(m.tick(20,{player:stage,held:false,clear:false}),null);assert.equal(m.state.progress,25);
  event=m.tick(.01,{player:stage,held:false,clear:true});
 }
 assert.equal(event.finished.id,stage.id);
}
assert(m.state.complete);assert.equal(m.tick(20,{player:point,held:true,clear:true}),null);m.reset();assert.equal(m.state.index,0);assert.equal(m.state.time,0);
const full=WEAPONS.map(w=>w.reserve);assert(!applySupply('health',100,full,WEAPONS).changed);assert(!applySupply('ammo',100,full,WEAPONS).changed);
assert.equal(applySupply('health',80,full,WEAPONS).health,100);assert.equal(applySupply('health',20,full,WEAPONS).health,55);
assert.deepEqual(applySupply('ammo',40,[0,0,0,Infinity],WEAPONS).reserves,[60,16,30,Infinity]);
assert.deepEqual(applySupply('ammo',40,[140,40,80,Infinity],WEAPONS).reserves,[150,48,90,Infinity]);
const obstacles=[{x:-40,z:0,w:1,d:81},{x:40,z:0,w:1,d:81},{x:0,z:-40,w:80,d:1},{x:0,z:40,w:80,d:1},...ARENA.covers.map(([x,z])=>({x,z,w:3,d:3})),{x:0,z:-16,w:5,d:5},...STAGES.slice(0,3).map(s=>({x:s.x,z:s.z,w:1.8,d:1}))];
const blocked=(x,z,r)=>obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);
const nav=createNavigator(obstacles);let routes=0;
for(let i=0;i<5;i++){
 const stage=STAGES[i],player=i?{x:STAGES[i-1].x,z:STAGES[i-1].z+2.4}:ARENA.start;
 const spawns=chooseEncounterSpawns(stage,player,obstacles);assert.equal(spawns.length,stage.count);assert.equal(new Set(spawns.map(p=>p.x+','+p.z)).size,stage.count);
 nav.rebuild(player.x,player.z);
 for(const spawn of spawns){assert(Math.hypot(spawn.x-player.x,spawn.z-player.z)>=14);assert(!blocked(spawn.x,spawn.z,1.3));assert(nav.isReachable(spawn.x,spawn.z));
 const pos={...spawn};for(let k=0;k<5000&&Math.hypot(pos.x-player.x,pos.z-player.z)>2.2;k++){
  const d=nav.direction(pos,player),len=Math.hypot(d.x,d.z)||1,dx=d.x/len*.1,dz=d.z/len*.1;
  if(!blocked(pos.x+dx,pos.z,1.25))pos.x+=dx;if(!blocked(pos.x,pos.z+dz,1.25))pos.z+=dz;
 }
 assert(Math.hypot(pos.x-player.x,pos.z-player.z)<=2.2,'terminal must not trap enemy navigation');routes++;}
 if(!stage.boss)assert(!blocked(stage.x,stage.z+2.4,.4),'interaction point must be accessible');
}
for(const s of SUPPLIES)assert(!blocked(s.x,s.z,.4),'supply must be accessible');
const reinforcements=chooseEncounterSpawns({...STAGES[1],count:STAGES[1].defenseCount},{x:28,z:2.4},obstacles);
nav.rebuild(28,2.4);assert.equal(reinforcements.length,3);
for(const p of reinforcements){assert(!blocked(p.x,p.z,1.3));assert(Math.hypot(p.x-28,p.z-2.4)>=14);assert(nav.isReachable(p.x,p.z));}
console.log(`PASS: five-stage gating/extraction/reset, upload defense/range/pause, interrupted interactions, resource caps, ${routes} initial + 3 defense safe reachable spawns and all supply positions`);

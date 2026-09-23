import assert from 'node:assert/strict';
import {SKYHOOK,LEVIATHAN} from '../src/siege-data.js';
import {createSiegeBoss,siegeReady} from '../src/siege-rules.js';
import {MAP_REGISTRY} from '../maps/registry.js';
assert.deepEqual(MAP_REGISTRY.map(m=>m.boss),['warden','switchyard','overseer','elevator','skyhook','leviathan','tether','abyss','glacier']);
console.log('PASS: all nine chapters have their intended Boss; no empty roster slots');
for(const c of [SKYHOOK,LEVIATHAN]){
 assert(!siegeReady(c,{index:3,defending:true,progress:c.defense-.01},true));assert(!siegeReady(c,{index:3,defending:true,progress:c.defense},false));assert(siegeReady(c,{index:3,defending:true,progress:c.defense},true));
 const r=createSiegeBoss(c);assert(!r.blocking);assert(r.activate());assert(!r.activate());assert.equal(r.hit(9999,r.floor).damage,0);
 r.interact(.3,{id:0,allowed:true,held:true});r.tick(1,{playing:false});assert.equal(r.arena.hold,0);assert(!r.interact(.7,{id:1,allowed:true,held:true}));assert.equal(r.arena.mode,'ready');
 for(let i=0;i<c.units;i++){
  if(i&&c.transition){assert.equal(r.arena.mode,'transition');assert.equal(r.hit(9999,r.floor).damage,0);r.tick(c.transition);}
  assert(r.interact(.6,{id:i,allowed:true,held:true}));assert.equal(r.arena.mode,'operation');assert.equal(r.hit(9999,r.floor).damage,0);r.tick(c.operation);assert.equal(r.state.phase,'exposed');
  assert.equal(r.hit(9999,r.floor+3).damage,0);const h=r.hit(9999,r.floor);assert.equal(h.damage,c.unitHp);assert(h.unitBroken);assert.equal(h.killed,i===c.units-1);assert.equal(r.hit(9999,r.floor).damage,0);
 }
 assert(r.blocking);r.tick(.8);assert(!r.blocking);r.reset();assert.equal(r.state.hp,c.hp);assert.equal(r.arena.index,0);
 for(const [dx,height,visible,want] of [[0,0,true,20],[3,0,true,0],[0,1.2,true,0],[0,0,false,0]]){
  const b=createSiegeBoss(c);b.activate();const p={x:c.core.x,z:c.core.z+3};b.tick(3,{player:p,feetY:b.floor});assert.equal(b.attack.mode,'warning');b.tick(1.39,{player:p,feetY:b.floor});assert.equal(b.tick(.02,{player:{x:p.x+dx,z:p.z},feetY:b.floor+height,visible:()=>visible}),want);assert.equal(b.tick(.1,{player:p,feetY:b.floor}),0);
 }
 for(const fps of [30,60,120,144]){const b=createSiegeBoss(c);b.activate();for(let i=0;i<Math.ceil(.61*fps);i++)b.interact(1/fps,{id:0,allowed:true,held:true});for(let i=0;i<Math.ceil((c.operation+.05)*fps);i++)b.tick(1/fps);assert.equal(b.state.phase,'exposed');b.tick(6);assert.equal(b.state.phase,'shield');assert(b.interact(.6,{id:0,allowed:true,held:true}),'unlimited retry windows');}
 console.log('PASS',c.id,'defense gate, hold/pause/number, operation, phases/no spillover, floor guard, one kill, warning/dodge/jump/cover, 4-rate windows, reset');
}

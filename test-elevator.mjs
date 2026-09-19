import assert from 'node:assert/strict';
import {createElevatorBoss,elevatorReady} from './elevator-rules.js';
import {createElevatorLift} from './elevator-lift.js';
import {ELEVATOR,ELEVATOR_LIFT} from './elevator-data.js';
import {createPlayerMotion} from './player-motion.js';
import {createBossFramework} from './boss-framework.js';
const f=createBossFramework({maxHp:100});assert(!f.closeWindow());f.reset(true);f.expose();f.hit(10);assert(f.closeWindow());assert.equal(f.state.hp,90);assert.equal(f.state.windows,1);assert.equal(f.state.timer,0);assert(!f.closeWindow());
assert(!elevatorReady({index:3,defending:true,progress:17.99},true));assert(!elevatorReady({index:3,defending:true,progress:18},false));assert(elevatorReady({index:3,defending:true,progress:18},true));
const r=createElevatorBoss(),pad={x:23.5,z:1.45},safe={x:0,z:20};
assert(!r.blocking);assert(r.activate());assert(!r.activate());assert.equal(r.hit(9999,0).damage,0);
r.tick(1,{player:pad,feetY:3});assert.equal(r.state.phase,'shield');r.tick(.3,{player:pad,feetY:0});r.tick(5,{playing:false});assert.equal(r.arena.charge,0);
r.tick(.6,{player:pad,feetY:0});assert.equal(r.state.phase,'exposed');assert.equal(r.hit(100,3).damage,0,'wrong floor rejected');
r.tick(6,{player:pad,feetY:0});assert.equal(r.state.phase,'shield');r.tick(1,{player:pad,feetY:0});assert.equal(r.state.phase,'shield','must leave plate between windows');
r.tick(.01,{player:safe});r.tick(.6,{player:pad});assert.equal(r.state.phase,'exposed');
for(let floor=0;floor<3;floor++){
 if(floor){r.arrive(0);assert.equal(r.arena.mode,'boarding');r.travel();assert.equal(r.tick(2,{player:pad,feetY:floor*3}),0);assert.equal(r.state.phase,'shield');r.arrive(floor*3);r.tick(.6,{player:pad,feetY:floor*3});}
 const result=r.hit(1e6,floor*3);assert.equal(result.damage,500);assert(result.unitBroken);assert.equal(result.killed,floor===2);assert.equal(r.state.hp,1000-floor*500);assert.equal(r.hit(1e6,floor*3).damage,0,'no pellet spillover / double kill');
}
assert(r.blocking);assert.equal(r.tick(.8,{player:pad,feetY:6}),0);assert(!r.blocking);r.reset();assert.equal(r.state.hp,1500);assert.equal(r.arena.index,0);assert.equal(r.arena.mode,'dock');
for(const [feetY,z,visible,damage] of [[0,6,true,14],[0,8,true,0],[1.2,6,true,0],[3,6,true,0],[0,6,false,0]]){
 const b=createElevatorBoss();b.activate();b.tick(3,{player:{x:23.5,z:6}});assert.equal(b.beam.mode,'warning');assert.equal(b.beam.targetZ,6);assert.equal(b.tick(1.39,{player:{x:23.5,z:6}}),0);
 assert.equal(b.tick(.02,{player:{x:23.5,z},feetY,visible:()=>visible}),damage);assert.equal(b.tick(.1,{player:{x:23.5,z:6}}),0);
}
for(const fps of [30,60,120,144]){
 const volume={...ELEVATOR_LIFT},lift=createElevatorLift(volume),p={x:23.5,z:6,y:1.7},m=createPlayerMotion([volume]);m.reset(p);assert(lift.aboard(p,m));assert(lift.request(3));assert(!lift.request(6));
 for(let i=0;i<Math.ceil(5*fps);i++){lift.tick(1/fps,p,m);m.step(1/fps,p,0,0);}
 assert.equal(lift.y,3);assert(Math.abs(m.state.y-3)<1e-8);assert(!lift.moving);assert(lift.request(6));for(let i=0;i<Math.ceil(5*fps);i++){lift.tick(1/fps,p,m);m.step(1/fps,p,0,0);}assert.equal(lift.y,6);assert(Math.abs(p.y-7.7)<1e-8);
 const y=lift.y;assert(lift.request(0));lift.tick(0,p,m);assert.equal(lift.y,y);for(let i=0;i<Math.ceil(10*fps);i++){lift.tick(1/fps,p,m);m.step(1/fps,p,0,0);}assert.equal(lift.y,0);assert(Math.abs(m.state.y)<1e-8);
}
// Ceiling, standing underneath and enemy bodies stop the platform instead of crushing actors.
{
 const v={...ELEVATOR_LIFT},lift=createElevatorLift(v),ceiling={x:23.5,z:6,w:6,d:6,bottom:4,top:4.3},obstacles=[v,ceiling],p={x:23.5,z:6,y:1.7},m=createPlayerMotion(obstacles);m.reset(p);lift.request(6);lift.tick(8,p,m);assert(lift.blocked);assert(lift.y<=2.21);obstacles.pop();lift.tick(8,p,m);assert.equal(lift.y,6);
 m.reset(p,0);lift.request(0);lift.tick(10,p,m);assert(lift.blocked);assert(lift.y>1.8);p.z=12;lift.tick(10,p,m);assert.equal(lift.y,0);
 lift.reset(6);lift.request(0);lift.tick(10,p,m,[{group:{position:{x:23.5,z:6,y:0}},radius:.65}]);assert(lift.blocked);lift.tick(10,p,m,[]);assert.equal(lift.y,0);
}
console.log('PASS: framework forced close, defense gate, grounded/floor/pad latch, three 500HP locks, no spillover, exact warning/dodge/jump/cover, 4-rate rider transport, pause and anti-crush recovery');

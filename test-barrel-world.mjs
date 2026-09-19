import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {createBarrels} from './barrel-world.js';
const scene=new T.Scene(),obstacles=[],events=[];let changes=0;
const world=createBarrels(scene,obstacles,{positions:[[0,0],[2,0]],onTopologyChange:()=>changes++,onBlast:(p,s,c)=>events.push({p,s,c})});
assert.equal(obstacles.length,2);const meshes=obstacles.map(o=>o.mesh),count=scene.children.length;
world.hit(meshes[0],40,{player:true,weapon:3});assert.equal(events.length,0,'queued until flush');assert.equal(obstacles.length,1);world.flush();assert.equal(events.length,2,'one chain');assert(events.every(e=>e.s.player&&e.s.weapon===3));world.flush();world.hit(meshes[0],999);world.flush();assert.equal(events.length,2,'no double explosion');assert.equal(obstacles.length,0);
for(let i=0;i<40;i++){world.reset();world.hit(meshes[0],40);world.flush();}assert.equal(scene.children.length,count);world.reset();assert.equal(obstacles.length,2);assert(world.snapshot().every(r=>r.hp===40));
world.suspend();const foreign={mesh:{},x:1,z:0,w:.1,d:4,h:3};obstacles.push(foreign);world.reset();events.length=0;world.hit(meshes[0],40);world.flush();assert.equal(events.length,1);assert.equal(world.snapshot()[1].hp,40,'wall prevents chain');assert(obstacles.includes(foreign));
world.reset(new T.Vector3(0,1.7,0));assert(!world.snapshot()[0].enabled);assert(!obstacles.some(o=>o.mesh===meshes[0]));
world.reset();world.hit(meshes[0],40);world.suspend();events.length=0;world.flush();assert.equal(events.length,0,'reset cancels pending');
// Optional third layout value elevates the barrel; the reset band follows the barrel, not a fixed ground band.
const hiScene=new T.Scene(),hiObstacles=[];const hiWorld=createBarrels(hiScene,hiObstacles,{positions:[[0,0,1.5]]});
assert.equal(hiObstacles.length,1);assert.equal(hiObstacles[0].bottom,1.5);assert.equal(hiObstacles[0].top,3.3);assert.equal(hiObstacles[0].mesh.position.y,2.4);
hiObstacles.push({mesh:{},x:0,z:0,w:2,d:2,h:1,bottom:0,top:1});hiWorld.reset();assert(hiWorld.snapshot()[0].enabled,'a low wall (top<=1.5) does not bury an elevated barrel');hiObstacles.pop();hiObstacles.push({mesh:{},x:0,z:0,w:2,d:2,h:1.8,bottom:0,top:1.8});hiWorld.reset();assert(!hiWorld.snapshot()[0].enabled,'a tall wall still intersects the elevated barrel');hiObstacles.pop();
hiObstacles.pop();hiWorld.reset();assert(hiWorld.snapshot()[0].enabled);
hiWorld.hit(hiObstacles[0].mesh,999);hiWorld.flush();assert.equal(hiObstacles.length,0);
console.log('PASS queued one-shot blast, chain source, cover, own colliders, 40 stable resets, restore safety, pending cancellation, elevated barrel colliders');

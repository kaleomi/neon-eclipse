import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {createEnergyNodes} from '../src/energy-nodes.js';
const scene=new T.Scene(),obstacles=[],enemies=[];let canceled=0,pulses=0,changes=0;
function actor(type,x,boss=false){const group=new T.Group();group.position.set(x,0,0);scene.add(group);const e={group,type,hp:100,maxHp:100,boss,attack:0};enemies.push(e);return e;}
const sentry=actor('sentry',2),human=actor('assault',2.5),boss=actor('sentry',3,true),far=actor('drone',8);
const nodes=createEnergyNodes(scene,obstacles,[[0,0]],{enemies,projectiles:{cancelOwner:()=>canceled++},onTopologyChange:()=>changes++,onPulse:()=>pulses++});scene.updateMatrixWorld(true);const core=obstacles.find(o=>o.mesh.userData.energyNode!==undefined).mesh;
assert.equal(obstacles.length,2);nodes.hit(core,29);nodes.flush();assert.equal(pulses,0);nodes.hit(core,1);assert.equal(obstacles.length,1);nodes.flush();assert.equal(pulses,1);assert.equal(sentry.empRemaining,3);assert.equal(canceled,1);assert(!human.empRemaining&&!boss.empRemaining&&!far.empRemaining);assert.equal(sentry.hp,100);nodes.hit(core,99);nodes.flush();assert.equal(pulses,1);
const count=scene.children.length;for(let i=0;i<40;i++){nodes.reset();nodes.hit(core,30);nodes.flush();}assert.equal(scene.children.length,count);nodes.reset(new T.Vector3(0,1.7,0));assert(!nodes.snapshot()[0].enabled);assert.equal(obstacles.length,0);
nodes.reset();const wall=new T.Mesh(new T.BoxGeometry(.1,3,4));wall.position.set(1,1.5,0);scene.add(wall);obstacles.push({mesh:wall,x:1,z:0,w:.1,d:4,h:3});delete sentry.empRemaining;nodes.hit(core,30);nodes.flush();assert(!sentry.empRemaining,'wall blocks EMP');assert(obstacles.some(o=>o.mesh===wall));
nodes.reset();nodes.hit(core,30);nodes.suspend();const before=pulses;nodes.flush();assert.equal(pulses,before);
console.log('PASS one-shot EMP node, mechanical-only/Boss/range/cover, own collider and 40 resource-stable resets');

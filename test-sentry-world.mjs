import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {createSentryModel,updateSentryFan} from './sentry-model.js';
import {createSentryDirector} from './sentry-director.js';
import {createEnemyProjectiles} from './projectiles.js';
const scene=new T.Scene(),group=createSentryModel(),player=new T.PerspectiveCamera();scene.add(group);player.position.set(0,1.7,10);
const e={group,type:'sentry',hp:150,attack:0},enemies=[e],obstacles=[];let hurt=0,queues=[];
const projectiles=createEnemyProjectiles(scene,obstacles,d=>hurt+=d,()=>{},{onQueue:(origin,attack,boss,owner)=>queues.push({origin:origin.clone(),attack,owner})});
let permitted=false;const director=createSentryDirector({enemies,player,obstacles,projectiles,canQueue:()=>permitted});
let time=0,gate=0;function step(dt){time+=dt;gate=Math.max(0,gate-dt);scene.updateMatrixWorld(true);gate=director.update(dt,time,gate);projectiles.update(dt,player.position);}
step(.01);assert.equal(queues.length,0);permitted=true;step(.01);assert.equal(queues.length,1);assert.equal(queues[0].attack.bursts,3);assert.equal(queues[0].attack.burstOffset,.09);assert.equal(projectiles.charging,1);
const initial=group.position.clone(),yaw=group.rotation.y,line=scene.children.find(m=>m.isLine);player.position.x=8;step(1.19);assert.equal(projectiles.count,0);assert.equal(line.geometry.getAttribute('position').getX(1),0);assert.equal(group.rotation.y,yaw);step(.011);assert.equal(projectiles.count,1);step(.181);assert.equal(projectiles.count,2);step(.181);assert.equal(projectiles.count,3);assert.equal(projectiles.charging,0);assert.deepEqual(group.position,initial);assert.equal(queues.length,1);step(.1);assert.equal(hurt,0);assert(projectiles.hasThreatTag('sentry'));e.attack=0;gate=0;player.position.set(0,1.7,10);step(.01);assert.equal(queues.length,1,'active volley retains exclusive budget');projectiles.clear();
// Real rear ray hits exposed core first; sector decoration never intercepts rays.
group.rotation.y=0;scene.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(0,1.35,-4),new T.Vector3(0,0,1));assert.equal(ray.intersectObjects(group.children,false)[0].object.userData.hitZone,'core');
ray.set(new T.Vector3(0,2,5),new T.Vector3(0,-1,0));assert.equal(ray.intersectObjects([group.userData.parts.fan],false).length,0);
assert.equal(group.userData.parts.base.geometry.type,'CylinderGeometry');assert(group.userData.parts.fan.position.y>.09,'scan overlay clears raised walkway/sign surfaces');assert.equal(ray.intersectObjects([group.userData.parts.edge],false).length,0,'outline cannot intercept weapons');
const wall=new T.Mesh(new T.BoxGeometry(20,5,.2),new T.MeshBasicMaterial());wall.position.set(0,2.5,4);scene.add(wall);obstacles.push({mesh:wall,x:0,z:4,w:20,d:.2,h:5});scene.updateMatrixWorld(true);e.attack=0;e.sentryScan=0;gate=0;step(.01);assert.equal(queues.length,1,'own LOS blocks detection');updateSentryFan(e,obstacles);const vertices=group.userData.parts.fan.geometry.getAttribute('position');for(let i=0;i<vertices.count;i++)assert(vertices.getZ(i)<4.1,'floor sector clipped by wall');
obstacles.length=0;e.attack=0;e.sentryScan=0;step(.01);assert.equal(queues.length,2);projectiles.cancelOwner(group);assert.equal(projectiles.charging,0);e.hp=0;step(2);assert.equal(projectiles.count,0);assert.equal(queues.length,2);
console.log('PASS: fixed model, real exposed-core ray/no decorative hits, circular base, gate/LOS, full 1.2s frozen warning, three staggered bolts, exclusive active budget, sidestep, clipped fan and death cancellation');

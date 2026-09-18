import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {createMeleeSweep,MELEE_SWEEP} from './melee-sweep.js';
import {WEAPONS,damageAtDistance} from './combat.js';
import {crossedMeleeContact} from './action-poses.js';
import {createMeleeStrike} from './melee-strike.js';
import {createEnemyModel} from './enemy-model.js';
import {ENEMY_TYPES,createBossState,resolveEnemyDamage} from './enemy-rules.js';
import {createOverseerWorld} from './overseer-world.js';
import {OVERSEER_MAX_HP} from './overseer-rules.js';
const sweep=createMeleeSweep(),weapon=WEAPONS[3];
assert.equal(weapon.range,3.5);assert.equal(weapon.damage,95);assert.equal(weapon.delay,.45);
assert.equal(sweep.sampleCount,15);assert.equal(MELEE_SWEEP.maxTargets,1);
const camera=new T.PerspectiveCamera(74,16/9,.08,160);
function aim(at=new T.Vector3(0,1.7,-3),from=new T.Vector3(0,1.7,0)){camera.position.copy(from);camera.lookAt(at);camera.updateMatrixWorld(true);}
function box(x,y,z,w=.45,h=1,d=.4,target=true){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial());m.position.set(x,y,z);m.userData.target=target;m.updateMatrixWorld(true);return m;}
const isTarget=mesh=>mesh.userData.target===true;
const resolve=(meshes,obstacles=[])=>sweep.resolve(camera,meshes,isTarget,weapon.range,obstacles);
aim();
const edge=box(.85,1.7,-2.8),oldRay=new T.Raycaster();oldRay.setFromCamera(new T.Vector2(0,0),camera);oldRay.far=weapon.range;
assert.equal(oldRay.intersectObject(edge,false).length,0,'baseline central ray misses a nearby peripheral target');
assert.equal(resolve([edge]).object,edge,'limited horizontal compensation');
assert.equal(resolve([box(-.85,1.7,-2.8)]).object.userData.target,true,'both sides of the swing');
assert.equal(resolve([box(2.5,1.7,-2.5)]),null,'outside horizontal arc');
assert.equal(resolve([box(0,2.9,-2.5,.3,.2,.3)]),null,'outside vertical arc');
assert.equal(resolve([box(0,1.7,-4.1)]),null,'not beyond original 3.5 metre reach');
const center=box(0,1.7,-2.5);assert.equal(resolve([center,edge]).object,center,'center priority');
const wall=box(0,1.7,-1,5,4,.2,false),volume={x:0,z:-1,w:5,d:.2,bottom:-.3,top:3.7,mesh:wall};
assert.notEqual(resolve([wall,center,edge],[volume])?.object,center);assert.notEqual(resolve([wall,center,edge],[volume])?.object,edge);
wall.visible=false;assert.equal(resolve([wall,center,edge],[volume]),null,'solid collision metadata still blocks invisible geometry');
assert.equal(resolve([center],[{x:0,z:0,w:2,d:.4,bottom:0,top:3}]),null,'no wall penetration from clipped origin');
assert.equal(resolve([center],[{x:0,z:-1,w:4,d:1,bottom:3,top:4}]).object,center,'overhead slabs do not block a ray below them');
assert.notEqual(resolve([center],[{x:0,z:-1,w:4,d:1,bottom:1,top:2}])?.object,center,'correct-height slab blocks');
const near=box(0,1.7,0,.9,1,1);assert.equal(resolve([near]).object,near,'inside/point-blank contact uses real two-sided triangles');assert.equal(near.material.side,T.FrontSide,'live material was not changed');
const hidden=box(0,1.7,-2);const group=new T.Group();group.add(hidden);group.visible=false;group.updateMatrixWorld(true);assert.equal(resolve([hidden]),null,'hidden ancestors are respected');
const torso=box(0,1.7,-2.5,1.2,1,.4),weak=box(.36,1.7,-2.15,.12,.12,.12);
assert.equal(resolve([torso,weak]).object,torso,'an off-center weak point does not override an aimed body hit');
let hp=300;const large=box(0,1.7,-2.7,2.5,1.7,.5),hit=resolve([large]);hp-=damageAtDistance(weapon,hit.distance);assert.equal(hp,205,'one contact is returned, not damage from every sampling ray');
for(const ratio of [1,16/9,9/16]){camera.aspect=ratio;camera.fov=52;camera.updateProjectionMatrix();assert.equal(resolve([edge]).object,edge,'reach/arc independent of viewport and fov');}camera.aspect=16/9;camera.fov=74;camera.updateProjectionMatrix();
function contactCount(steps,{paused=false,cancelled=false}={}){let remaining=.42,pending=!cancelled,hits=0;for(const dt of steps){if(paused)continue;const before=remaining;remaining=Math.max(0,remaining-dt);if(pending&&crossedMeleeContact(before,remaining)){pending=false;hits++;}}return hits;}
assert.equal(contactCount([.1,.08]),0);assert.equal(contactCount([.1,.1,.4]),1);assert.equal(contactCount([.8,.2]),1);assert.equal(contactCount([1],{paused:true}),0);assert.equal(contactCount([1],{cancelled:true}),0);

function actor(type,z=-2.8){const group=createEnemyModel(type),profile=ENEMY_TYPES[type];group.scale.setScalar(profile.scale);group.position.z=z;group.updateMatrixWorld(true);return {type,group,hp:profile.hp,maxHp:profile.hp,boss:type==='warden',bossState:type==='warden'?createBossState():null,eliteState:{ventRemaining:2.4}};}
function contactActor(enemy,point){aim(point);enemy.group.updateMatrixWorld(true);return sweep.resolve(camera,enemy.group.children,m=>m.parent===enemy.group,weapon.range,[]);}
const warden=actor('warden');let core=warden.group.userData.parts.core;let point=core.getWorldPosition(new T.Vector3());
let impact=contactActor(warden,point);assert.equal(impact.object,core);warden.bossState.openRemaining=2;
assert.equal(resolveEnemyDamage(warden,weapon.damage,impact.object.userData.hitZone,camera.position).damage,237.5);
warden.bossState.openRemaining=0;assert.equal(resolveEnemyDamage(warden,weapon.damage,impact.object.userData.hitZone,camera.position).damage,52.25000000000001);
const elite=actor('harborElite');core=elite.group.userData.parts.core;point=core.getWorldPosition(new T.Vector3());impact=contactActor(elite,point);assert.equal(impact.object,core);
assert.equal(resolveEnemyDamage(elite,weapon.damage,impact.object.userData.hitZone,camera.position).damage,237.5);

const ui=[];globalThis.document={createElement(){const element={style:{},dataset:{},append(){}};ui.push(element);return element;},body:{append(){}}};
const scene=new T.Scene(),boss=createOverseerWorld(scene,[]);boss.setStage(3);scene.updateMatrixWorld(true);
function contactOverseer(target){const p=target.getWorldPosition(new T.Vector3());aim(p,p.clone().add(new T.Vector3(0,.15,2.7)));scene.updateMatrixWorld(true);return sweep.resolve(camera,boss.targets,m=>m.userData.overseer!==undefined,weapon.range,[]);}
let bossCore=boss.targets.find(m=>m.userData.overseer==='core');impact=contactOverseer(bossCore);assert.equal(boss.hit(impact.object,weapon.damage).damage,0,'shield is unchanged');
for(const node of boss.targets.filter(m=>Number.isInteger(m.userData.overseer))){impact=contactOverseer(node);assert.equal(impact.object,node);assert.equal(boss.hit(impact.object,weapon.damage).damage,65);}
bossCore=boss.targets.find(m=>m.userData.overseer==='core');impact=contactOverseer(bossCore);assert.equal(boss.hit(impact.object,weapon.damage).damage,95);
assert(ui.some(element=>element.textContent?.includes((OVERSEER_MAX_HP-95)+' / '+OVERSEER_MAX_HP)),'overseer starts at 1920 HP; one blade contact deals 95');
console.log('PASS: center-first 15-ray + bounded-gap melee, peripheral/close targets, range/FOV/height/solid occlusion, center hit-zone priority and no multi-hit, legacy timing helper retained, Warden/elite cores and Overseer nodes/shield/1920 HP unchanged');

// P1 short arc and gap compensation. Bounds only propose directions;
// the returned contact must still be the nearest real triangle on that ray.
function angularTarget(yaw,pitch=0,r=2.8,size=.04){
 const y=yaw*Math.PI/180,p=pitch*Math.PI/180;
 return box(Math.sin(y)*Math.cos(p)*r,1.7+Math.sin(p)*r,-Math.cos(y)*Math.cos(p)*r,size,size,size);
}
aim();
for(const yaw of [-34,-25,-8.75,8.75,25,34])for(const pitch of [-14,0,14]) {
 const target=angularTarget(yaw,pitch);assert.equal(resolve([target])?.object,target,`thin target at ${yaw}/${pitch}`);
}
for(const [yaw,pitch] of [[37,0],[-37,0],[0,17],[0,-17],[150,0]])assert.equal(resolve([angularTarget(yaw,pitch)]),null,'no compensation outside arc');
assert.equal(resolve([angularTarget(25,7,3.6)]),null,'diagonal reach is Euclidean, not forward depth');
const gap=angularTarget(8.75,7.5),gapWall=box(.22,1.9,-1.4,.4,.7,.2,false);
assert.notEqual(resolve([gap,gapWall])?.object,gap,'gap compensation still hits cover first');
const rotated=angularTarget(25,7);camera.rotation.set(.2,.7,0);camera.updateMatrixWorld(true);
rotated.position.sub(new T.Vector3(0,1.7,0)).applyQuaternion(camera.quaternion).add(camera.position);rotated.updateMatrixWorld(true);
assert.equal(resolve([rotated])?.object,rotated,'camera-local yaw and pitch, not world-axis assistance');
console.log('PASS: ±35°/±15° arc, thin between-ray targets, strict angular/radial limits, real cover and rotated camera');

const windowedBoss=createOverseerWorld(new T.Scene(),[]);windowedBoss.setStage(3);
function windowedBossSwing(target) {
 const controller=createMeleeStrike(),point=target.getWorldPosition(new T.Vector3());
 // Bring the actual parent scene up to date before obtaining the target's point.
 target.parent.updateMatrixWorld(true);target.getWorldPosition(point);
 aim(point,point.clone().add(new T.Vector3(0,.15,2.7)));
 controller.begin();let before=.42,damage=0,contacts=0;
 for(const after of [.30,.18,.06,0]){
  const result=controller.step(before,after,()=>sweep.resolve(camera,windowedBoss.targets,m=>m.userData.overseer!==undefined,weapon.range,[]));before=after;
  if(result?.impact){contacts++;damage+=windowedBoss.hit(result.impact.object,weapon.damage).damage;}
 }
 assert.equal(contacts,1);return damage;
}
assert.equal(windowedBossSwing(windowedBoss.targets.find(m=>m.userData.overseer==='core')),0,'shield contact consumes the swing even at zero damage');
for(const node of windowedBoss.targets.filter(m=>Number.isInteger(m.userData.overseer)))assert.equal(windowedBossSwing(node),65,'one contact per power node swing');
assert.equal(windowedBossSwing(windowedBoss.targets.find(m=>m.userData.overseer==='core')),95,'exposed boss does not take damage each active frame');
console.log('PASS: strike window + real Overseer shield/nodes/core damage integration');

// Chapter 09 enemies: hound (low fast rusher with thermal tracking) profile, damage rules, and the enemy-director thermal-vision hook (Three.js integration).
import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import {ENEMY_TYPES,resolveEnemyDamage,enemyBehavior,movementIntent} from './enemy-rules.js';
import {createEnemyModel} from './enemy-model.js';
import {createEnemyDirector} from './enemy-ai.js';
import {createNavigator} from './arena.js';
import {POLAR_STAGES} from './polar-data.js';
const hound=ENEMY_TYPES.hound;assert(hound);
assert.equal(hound.hp,38);assert(hound.attack.charge>=.45,'telegraph >= 0.45 s');assert.equal(hound.attack.damage,5);assert.equal(hound.thermal,true);assert(hound.speed>ENEMY_TYPES.assault.speed,'faster than assault');
const mk=type=>({type,hp:ENEMY_TYPES[type].hp,maxHp:ENEMY_TYPES[type].hp,group:{position:{x:0,z:0},rotation:{y:0}}});
assert.equal(resolveEnemyDamage(mk('hound'),30,'body',{x:0,z:5}).damage,30,'no armor');assert.equal(resolveEnemyDamage(mk('hound'),30,'head',{x:0,z:5}).damage,30);
assert.equal(enemyBehavior('hound'),'assault');assert.equal(movementIntent('hound',12,true),'approach');assert.equal(movementIntent('hound',2,true),'hold');
// Model: low quadruped, head zone present, four leg stubs animate; humanoid legs/arms hidden.
const model=createEnemyModel('hound');assert(model.userData.parts.legs.length>=4);assert(model.children.some(o=>o.userData.hitZone==='head'));const box=new THREE.Box3().setFromObject(model);assert(box.max.y<1.6,'low silhouette '+box.max.y);
// Chapter role sets resolve and use the new silhouette.
const roles=new Set(POLAR_STAGES.flatMap(s=>[...s.roles,...(s.defenseWaves||[]).flatMap(w=>w.roles||[])]));for(const r of roles)assert(ENEMY_TYPES[r],'unknown role '+r);assert(roles.has('hound'));
// Thermal vision hook: a snow bank between a ranged guard and the player hides the player normally, but not while thermalVision() is true.
function scene(thermal){
 const bankMesh=new THREE.Mesh(new THREE.BoxGeometry(6,1.2,1.4));bankMesh.position.set(0,.6,5);bankMesh.updateMatrixWorld();
 const wallMesh=new THREE.Mesh(new THREE.BoxGeometry(6,6,.5));wallMesh.position.set(40,3,40);wallMesh.updateMatrixWorld();
 const obstacles=[{x:0,z:5,w:6,d:1.4,bottom:0,top:1.2,h:1.2,bank:true,mesh:bankMesh},{x:40,z:40,w:6,d:.5,bottom:0,top:6,h:6,mesh:wallMesh}];
 const player=new THREE.PerspectiveCamera();player.position.set(0,1.2,10);// crouched behind the bank so the 1.2 m bank blocks the eye line from a 1.6 m muzzle
 const enemy={type:'ranged',hp:60,maxHp:60,group:createEnemyModel('ranged'),boss:false,bossState:null,speed:0,attack:0,radius:.65,charge:0,seed:0};enemy.group.position.set(0,0,0);enemy.group.rotation.y=0;enemy.group.updateMatrixWorld();
 const queued=[];const projectiles={queue(origin,target){queued.push({origin:origin.clone(),target:target.clone()});return true;},hasPending:()=>false,cancelOwner(){},charging:false,countThreatTag:()=>0};
 const navigation=createNavigator(obstacles);
 const director=createEnemyDirector({enemies:[enemy],player,navigation,move(){},obstacles,projectiles,onBossEvent(){},thermalVision:()=>thermal});
 for(let i=0;i<40;i++)director.update(.05,i*.05,0);
 return queued.length;
}
assert.equal(scene(false),0,'bank hides the player without thermal vision');assert(scene(true)>0,'thermal vision sees through the snow bank');
console.log('PASS: hound profile (38 HP, telegraph, thermal flag, faster than assault), full damage, low quadruped model, polar roles resolve, thermal-vision hook sees through snow banks only when enabled');

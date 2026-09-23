// Isolated rules + headless Three.js; no browser, renderer, native storage or real save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as T from '../node_modules/three/build/three.module.js';
import {createSeaCombat,stepSeaCombat,clearSeaCombat} from '../src/sea-combat.js';
import {createSeaChase} from '../src/chase-rules.js';
import {createYacht} from '../src/maritime-rules.js';
import {createNavalMission,stepNavalMission,navalSummary,cycleNavalTarget} from '../src/naval-mission.js';
import {navalCheckpointFromMission,restoreNavalCheckpoint} from '../src/naval-checkpoint-model.js';
import {createYachtModel} from '../src/sea-air-world.js';
import {buildSeaCombatWorld} from '../src/sea-combat-world.js';
const dt=1/120;
function single(){const player={...createYacht(),x:350,z:0},task=createSeaChase(player,{combat:true});Object.assign(task.enemy,{x:350,z:-70,yaw:0,speed:0});return {player,task};}
function fleet(){const player={...createYacht(),x:350,z:0},task=createNavalMission(player,'normal');for(const m of task.naval.members){m.ai.headStart=1e6;m.combat.enemyCooldown=1e6;}Object.assign(task.naval.members[0].enemy,{x:430,z:-100,speed:0});Object.assign(task.naval.members[1].enemy,{x:350,z:70,speed:0});return {player,task};}
function advance(s,options={}){stepNavalMission(s.task,s.player,{...s.player},dt,options);}
function dispose(scene){const g=new Set(),m=new Set();scene.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)m.add(o.material);});for(const x of g)x.dispose();for(const x of m)x.dispose();}
let passed=0,failed=0;
async function test(name,fn){try{await fn();passed++;console.log('PASS',name);}catch(e){failed++;console.error('FAIL',name,e.message.split('\n').slice(0,4).join(' '));}}
await test('manual cannon shoots astern, not at the automatically selected enemy ahead',()=>{
 const {player,task}=single();stepSeaCombat(task,player,{...player},{...task.enemy},dt,{fire:true,aimPoint:{x:350,z:100},enemyMayStart:false});
 assert.equal(task.combat.shots,1);assert.ok(task.combat.projectiles[0].vz>0,'manual aim must override selected-enemy prediction');assert.equal(task.combat.projectiles[0].vx,0);
});
await test('manual fire does not require an in-range selected enemy and rejects invalid aim',()=>{
 const {player,task}=single();task.enemy.z=-500;stepSeaCombat(task,player,{...player},{...task.enemy},dt,{fire:true,aimPoint:{x:400,z:0},enemyMayStart:false});assert.equal(task.combat.shots,1);
 for(const point of [{x:NaN,z:30},{x:Infinity,z:0},{x:350,z:0},{x:800,z:0}]){const s=single();stepSeaCombat(s.task,s.player,{...s.player},{...s.task.enemy},dt,{fire:true,aimPoint:point,enemyMayStart:false});assert.equal(s.task.combat.shots,0);}
});
await test('manual projectiles hit a non-selected ship and retain travel time',()=>{
 const s=fleet(),point={x:350,z:70};advance(s,{fire:true,aimPoint:point});assert.equal(s.task.naval.members[1].combat.enemyHull,100);
 for(let i=0;i<100;i++)advance(s,{aimPoint:point});assert.equal(s.task.naval.members[1].combat.enemyHull,80);assert.equal(s.task.naval.members[0].combat.enemyHull,100);assert.equal(navalSummary(s.task).hits,1);
});
await test('manual shells survive selected-enemy death and Q does not bypass cooldown',()=>{
 const s=fleet(),point={x:350,z:150};advance(s,{fire:true,aimPoint:point});const gun=s.task.naval.playerCombat;assert.ok(gun,'player battery is independent of enemy ownership');assert.equal(gun.projectiles.length,1);
 const z=gun.projectiles[0].z;s.task.naval.members[0].combat.enemySunk=true;clearSeaCombat(s.task.naval.members[0].combat);cycleNavalTarget(s.task);advance(s,{fire:true,aimPoint:point});assert.equal(gun.projectiles.length,1);assert.ok(gun.projectiles[0].z>z);assert.equal(navalSummary(s.task).shots,1);
});
await test('manual pause, abort and new mission leave no stale shells or cooldown',()=>{
 const s=fleet(),point={x:350,z:150};advance(s,{fire:true,aimPoint:point});assert.ok(s.task.naval.playerCombat);const before=JSON.stringify(s.task);advance(s,{fire:true,aimPoint:point,paused:true});assert.equal(JSON.stringify(s.task),before);
 advance(s,{aimPoint:point,aboard:false});assert.equal(s.task.status,'lost');assert.equal(navalSummary(s.task).projectiles,0);assert.equal(s.task.naval.playerCombat.effects.length,0);
 const fresh=fleet();assert.equal(fresh.task.naval.playerCombat.projectiles.length,0);assert.equal(fresh.task.naval.weaponCooldown,0);assert.equal(navalSummary(fresh.task).shots,0);
 fresh.task.runId='manual-aim-checkpoint-test';fresh.task.index=1;advance(fresh,{fire:true,aimPoint:point});
 const record=navalCheckpointFromMission(fresh.task,0);assert.ok(record);const restored=restoreNavalCheckpoint(record);assert.equal(restored.task.recovered,true);assert.equal(restored.task.index,1);assert.equal(restored.task.naval.playerCombat.projectiles.length,0);assert.equal(restored.task.naval.weaponCooldown,0);
 stepNavalMission(restored.task,restored.yacht,{...restored.yacht},dt,{fire:true,aimPoint:{x:restored.yacht.x,z:restored.yacht.z+100}});assert.equal(restored.task.naval.playerCombat.shots,1);
});
await test('manual shells still stop at land instead of passing through it',()=>{
 const {player,task}=single();stepSeaCombat(task,player,{...player},{...task.enemy},dt,{fire:true,aimPoint:{x:200,z:0},enemyMayStart:false});
 assert.equal(task.combat.shots,1);for(let i=0;i<240;i++)stepSeaCombat(task,player,{...player},{...task.enemy},dt,{aimPoint:{x:200,z:0},enemyMayStart:false});assert.ok(task.combat.blocked>0);assert.equal(task.combat.hits,0);
});
await test('360-degree sea aim stays independent of ship heading and projects to the reticle',async()=>{
 const {createNavalAim,turnNavalAim,navalAimPoint,navalCameraPose}=await import('../src/naval-aim.js');
 const aim=createNavalAim(0),ship={x:350,z:0,yaw:0};for(let i=0;i<6;i++)turnNavalAim(aim,Math.PI/.003/6,0);assert.ok(navalAimPoint(aim,ship).z>ship.z,'can look directly astern');
 const point=navalAimPoint(aim,ship);ship.yaw=1.2;assert.deepEqual(navalAimPoint(aim,ship),point,'steering must not drag the aim');
 for(const mode of ['chase','hood'])for(const dy of [-200,0,200]){turnNavalAim(aim,0,dy);const pose=navalCameraPose(aim,ship,mode),p=navalAimPoint(aim,ship),camera=new T.PerspectiveCamera(62,16/9,.1,1500);camera.position.copy(pose.eye);camera.lookAt(pose.target.x,pose.target.y,pose.target.z);camera.updateMatrixWorld(true);const screen=new T.Vector3(p.x,p.y,p.z).project(camera);assert.ok(Math.abs(screen.x)<1e-10&&Math.abs(screen.y)<1e-10);assert.ok(Math.hypot(p.x-ship.x,p.z-ship.z)<=180);}
 assert.deepEqual(createNavalAim(ship.yaw),{yaw:ship.yaw,pitch:0});
});
await test('yacht model has no rectangular wake mesh, including hostile visibility toggles',()=>{
 for(const hostile of [false,true]){const scene=new T.Scene();try{const model=createYachtModel(scene,{hostile});model.wake.visible=true;model.update({...createYacht(),speed:32},2);const planes=[];scene.traverse(o=>{if(o.geometry?.type==='PlaneGeometry')planes.push(o);});assert.equal(planes.length,0,'plain rectangular wake must be removed');const names=[];model.root.traverse(o=>{if(o.isMesh)names.push(o.name);});assert.ok(names.some(n=>/Paint|Hull/i.test(n))&&names.some(n=>/Deck/i.test(n)),'hull and deck remain: '+names.join(','));}finally{dispose(scene);}}
});
await test('player turret follows manual aim and renders its independent shell after enemy sinks',()=>{
 const scene=new T.Scene();try{const world=buildSeaCombatWorld(scene),player={x:350,z:0},combat=createSeaCombat(true),gun=createSeaCombat(true);combat.enemySunk=true;gun.projectiles.push({owner:'player',x:350,z:30,vx:0,vz:90});
  world.update({status:'active',enemy:{x:400,z:-100},combat},player,1,{x:350,z:100},.1,gun);const root=scene.children[0],turret=root.children[0];scene.updateMatrixWorld(true);const direction=new T.Vector3(0,0,-1).transformDirection(turret.matrixWorld);assert.ok(direction.z>.99);
  let visibleShell=false;root.traverse(o=>{if(o.geometry?.type==='SphereGeometry'&&o.geometry.parameters.radius===.48&&o.parent.visible&&o.parent.position.z===30)visibleShell=true;});assert.ok(visibleShell,'independent player shell is visible');
 }finally{dispose(scene);}
});
await test('live entry wires left fire, manual aim, free camera and reset without an auto-target claim',()=>{
 const src=fs.readFileSync(new URL('../src/vehicle-app.js',import.meta.url),'utf8');assert.match(src,/fire:fire\|\|held\('KeyF'\),aimPoint:navalAimPoint\(navalAim,yacht\)/);assert.match(src,/turnNavalAim\(navalAim,mx,my\)/);assert.match(src,/navalCameraPose\(navalAim,yacht,cameraMode\)/);assert.ok((src.match(/Object.assign\(navalAim,createNavalAim\(yacht.yaw\)\)/g)||[]).length>=3,'recover, boarding and checkpoint restore rebase aim');assert.ok(src.includes('左键舰炮'));assert.ok(!src.includes('舰炮就绪 · 按住 F 反击'));
 const events=new Map(),listen=scope=>(name,fn)=>events.set(scope+name,fn),c={active:true,kind:'yacht',drag:false,fire:false,rocketKey:false,locked:false,canvas:{addEventListener:listen('canvas:')},window:{addEventListener:listen('window:')},document:{addEventListener:listen('document:')},notify(){},pause(){}};
 vm.createContext(c);vm.runInContext(src.slice(src.indexOf("canvas.addEventListener('mousedown'"),src.indexOf("window.addEventListener('mousemove'")),c);
 const down=events.get('canvas:mousedown'),up=events.get('window:mouseup');down({button:2});assert.equal(c.drag,true);assert.equal(c.fire,false);assert.equal(c.rocketKey,false);
 down({button:0});assert.equal(c.fire,true);up({button:0,buttons:2});assert.equal(c.fire,false);assert.equal(c.drag,true,'releasing fire must not cancel a held right-drag aim');up({button:2,buttons:0});assert.equal(c.drag,false);
 c.active=false;down({button:0});assert.equal(c.fire,false,'paused mouse input cannot fire');
});
console.log(`naval manual aim: ${passed}/${passed+failed} passed; isolated rules and transforms only`);if(failed)process.exitCode=1;

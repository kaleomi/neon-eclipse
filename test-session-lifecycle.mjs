import {createNavalAim} from './naval-aim.js';
// Execute current entry functions with UI/storage doubles, never load a renderer or a real save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from './node_modules/three/build/three.module.js';
import {createEnemyProjectiles} from './projectiles.js';
import {bindCheckpointUI} from './joint-checkpoint-ui.js';
import {createLookInput} from './look-input.js';
import {createWeaponState,stepPlaneGun} from './vehicle-weapons.js';
const source=fs.readFileSync(new URL('./vehicle-app.js',import.meta.url),'utf8');
function entry(name){
 const pattern=new RegExp('^(?:async )?function '+name+'\\(','m'),match=pattern.exec(source);assert.ok(match,`entry ${name}`);
 const firstEnd=source.indexOf('\n',match.index),first=source.slice(match.index,firstEnd);
 if(first.endsWith('}'))return first;
 const end=source.indexOf('\n}',firstEnd);assert.notEqual(end,-1);return source.slice(match.index,end+2);
}
function fixture(){
 const elements=new Map(),events=new Map();let serial=0;
 const element=s=>{if(!elements.has(s))elements.set(s,{hidden:false,textContent:'',focus(){},classList:{add(){},remove(){}}});return elements.get(s);};
 const c={createNavalAim,navalAim:createNavalAim(),console,Set,performance:{now:()=>1000},$:element,keys:new Set(),active:false,started:true,kind:null,drag:false,fire:false,rocketKey:false,recovery:0,accumulator:0,missionIntent:0,
  overlay:element('overlay'),canvas:{focus(){}},document:{exitPointerLock(){}},window:{addEventListener:(k,f)=>events.set(k,f)},
  vehicleAudio:{pause(){},resume(){},unlock(){},reset(){}},expeditionUI:{detach(){}},flightUI:{reset(){}},updateHUD(){},updateCamera(){},notify(){},
  joint:{status:'idle'},chase:{status:'idle'},sortie:{status:'idle'},escort:{status:'idle'},rover:{speed:0},plane:{speed:0,yaw:0},yacht:{speed:0},
  roofGun:createWeaponState('roof'),planeGun:createWeaponState('plane'),wear:{rover:{hull:100},yacht:{hull:100}},player:{x:7,z:8},
  TEST_SPAWN:{x:0,z:0},createRover:()=>({speed:0}),createPlane:()=>({speed:0,yaw:0}),createYacht:()=>({speed:0}),
  createJointMission:active=>({status:active?'active':'idle',runId:'joint-'+ ++serial}),createFlightMission:()=>({status:'idle'}),createSeaChase:()=>({status:'idle'}),createEscort:()=>({status:'idle'}),
  createDriveTrial:()=>({index:0,elapsed:0}),createDurability:()=>({hull:100}),createWeaponState,
  createNavalRun:(_boat,difficulty='normal',runId='naval-'+ ++serial)=>({status:'active',runId,naval:{profile:{id:difficulty}}}),selectedNavalDifficulty:()=> 'normal',
  checkpointUI:{async begin(){return true;}},navalCheckpointUI:{async begin(){return true;}},setGunner(v){c.gunner=v;},
 };
 vm.createContext(c);
 for(const name of ['clearInput','pause','resume','recover','startJointTask','startChase','startFlight'])vm.runInContext(entry(name),c);
 const begin=source.indexOf("window.addEventListener('keydown',e=>{"),end=source.indexOf("window.addEventListener('keyup'",begin);
 assert.ok(begin>=0&&end>begin);vm.runInContext(source.slice(begin,end),c);
 return {c,events};
}
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
let passed=0,failed=0;
async function test(name,fn){try{await fn();passed++;console.log('PASS',name);}catch(e){failed++;console.error('FAIL',name,e.message);}}
await test('holding Escape cannot repeatedly toggle pause/resume',()=>{
 const {c,events}=fixture(),key=repeat=>events.get('keydown')({code:'Escape',repeat,preventDefault(){}});
 c.active=true;key(false);assert.equal(c.active,false);key(true);assert.equal(c.active,false,'auto-repeat must not resume');key(false);assert.equal(c.active,true);key(true);assert.equal(c.active,true);
});
await test('pause while already inactive cancels a pending joint or naval launch',async()=>{
 for(const [method,panel] of [['startJointTask','checkpointUI'],['startChase','navalCheckpointUI']]){
  const {c}=fixture(),d=defer();c[panel].begin=()=>d.promise;
  const pending=c[method]();c.pause();d.resolve(true);assert.equal(await pending,null,'late storage result must not start gameplay after suspension');assert.equal(c.active,false);
 }
 assert.match(source,/window\.addEventListener\('blur',pause\)/);
 assert.match(source,/visibilitychange[^\n]*if\(document.hidden\)pause\(\)/);
});
await test('explicit resume supersedes a pending dispatch without resetting the current task',async()=>{
 for(const [method,panel] of [['startJointTask','checkpointUI'],['startChase','navalCheckpointUI']]){
  const {c}=fixture(),d=defer(),oldJoint=c.joint,oldChase=c.chase;c[panel].begin=()=>d.promise;
  const pending=c[method]();c.resume();d.resolve(true);assert.equal(await pending,null);assert.equal(c.active,true);assert.equal(c.joint,oldJoint);assert.equal(c.chase,oldChase);
 }
});
await test('pause/resume clears latched controls and time debt, but preserves the current simulation',()=>{
 const {c}=fixture();c.active=true;c.keys.add('KeyW');c.keys.add('KeyG');c.fire=c.drag=c.rocketKey=true;c.recovery=1;c.accumulator=.08;
 c.planeGun.cooldown=.4;c.planeGun.reload=1;c.planeGun.projectiles.push({life:2,x:8});const before=JSON.stringify(c.planeGun),position=c.player;
 c.pause();assert.equal(c.active,false);assert.equal(c.keys.size,0);assert.equal(c.fire||c.drag||c.rocketKey,false);assert.equal(c.recovery,0);assert.equal(c.accumulator,0);
 stepPlaneGun(c.planeGun,{}, {},5,{},[],{paused:true});assert.equal(JSON.stringify(c.planeGun),before);
 c.resume();assert.equal(c.active,true);assert.equal(c.last,1000);assert.equal(c.player,position);assert.equal(JSON.stringify(c.planeGun),before);
 for(const name of ['joint','chase','sortie','escort'])for(const status of ['won','lost']){c.active=false;c[name].status=status;c.resume();assert.equal(c.active,false);c[name].status='idle';}
});
await test('recover resets weapon projectiles/timers, held controls, missions and route state',()=>{
 const {c}=fixture();c.keys.add('KeyW');c.fire=c.drag=c.rocketKey=true;c.accumulator=.08;c.recovery=1;c.joint.status=c.chase.status=c.sortie.status=c.escort.status='active';
 for(const w of [c.roofGun,c.planeGun]){w.projectiles.push({life:3});w.effects.push({life:1});w.cooldown=2;w.reload=1;w.shots=9;}
 c.recover();assert.equal(c.keys.size,0);assert.equal(c.fire||c.drag||c.rocketKey,false);assert.equal(c.accumulator,0);assert.equal(c.recovery,0);
 for(const w of [c.roofGun,c.planeGun]){assert.equal(w.projectiles.length,0);assert.equal(w.effects.length,0);assert.equal(w.cooldown,0);assert.equal(w.reload,0);assert.equal(w.shots,0);}
 for(const name of ['joint','chase','sortie','escort'])assert.equal(c[name].status,'idle');for(const name of ['trial','airTrial','seaTrial'])assert.equal(c[name].index,0);
});
await test('normal launch and storage rejection still work; a newer task wins over old dispatch',async()=>{
 for(const [method,panel] of [['startJointTask','checkpointUI'],['startChase','navalCheckpointUI']]){
  const {c}=fixture();c[panel].begin=async()=>false;assert.equal(await c[method](),null);assert.equal(c.active,false);
  c[panel].begin=async()=>true;const task=await c[method]();assert.equal(task.status,'active');assert.equal(c.active,true);
  const d=defer();c[panel].begin=()=>d.promise;const pending=c[method]();c.startFlight();const current=c.sortie;d.resolve(true);assert.equal(await pending,null);assert.equal(c.sortie,current);assert.equal(c.kind,'plane');
 }
});
await test('FPS projectile clear retires active bolts, charged bursts and their scene objects',()=>{
 const scene=new THREE.Scene();let damage=0;const p=createEnemyProjectiles(scene,[],()=>damage++,()=>{}),origin=new THREE.Vector3(0,2,0),target=new THREE.Vector3(0,2,10),player=new THREE.Vector3(100,2,100);
 assert.equal(p.queue(origin,target,false,null,{charge:0,bursts:3,showAim:true}),true);p.update(.01,player);assert.equal(p.count,1);assert.equal(p.charging,1);assert.ok(scene.children.length);
 p.clear();p.clear();assert.equal(p.count,0);assert.equal(p.charging,0);assert.equal(scene.children.length,0);p.update(10,origin);assert.equal(damage,0);assert.equal(scene.children.length,0);
 assert.equal(p.queue(origin,target,false,null,{charge:0}),true);p.update(.01,player);assert.equal(p.count,1);p.clear();
});
await test('FPS look reset discards old drag and the first pointer-lock transition sample',()=>{
 const look=createLookInput();look.begin(10,10);assert.ok(look.sample({buttons:1,clientX:15,clientY:15},false));look.reset();assert.equal(look.sample({buttons:1,clientX:30,clientY:30},false),null);assert.equal(look.sample({buttons:1,clientX:40,clientY:40},false),null);
 assert.equal(look.sample({movementX:120,movementY:100},true),null);assert.deepEqual(look.sample({movementX:2,movementY:-3},true),{x:2,y:-3});
});
await test('a cancelled checkpoint begin preserves old run ownership and expected revision',async()=>{
 const names=['document','window','BroadcastChannel','confirm'],prior=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),elements=new Map(),writes=[];
 let read=async()=>({ok:true,revision:0,checkpoint:null});
 const store={read:()=>read(),async write(job,revision){writes.push({job,revision});return {ok:true,revision:revision+1};}};
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 try{
  globalThis.document={querySelector(s){if(!elements.has(s))elements.set(s,{dataset:{},addEventListener(){}});return elements.get(s);},addEventListener(){}};
  globalThis.window={addEventListener(){}};globalThis.BroadcastChannel=class{constructor(){throw Error('No native channels in isolated test');}};globalThis.confirm=()=>true;
  const panel=bindCheckpointUI({store,prefix:'test',fromMission:m=>({...m,savedAt:0,elapsedMs:0}),label:c=>c.stage,channelName:'isolated',onRestore:()=>null});
  assert.equal(await panel.begin('old'),true);panel.save({runId:'old',stage:'dock'});await settle();assert.equal(writes.length,1);
  const d=defer();read=()=>d.promise;let current=true;const pending=panel.begin('new',()=>current);await settle();current=false;
  d.resolve({ok:true,revision:99,checkpoint:null});assert.equal(await pending,false,'cancelled begin must not adopt a new run');
  panel.save({runId:'old',stage:'air'});await settle();assert.equal(writes.length,2);assert.equal(writes[1].revision,1,'cancelled read must not silently adopt another revision');assert.equal(writes[1].job.runId,'old');
  await panel.complete({runId:'old'});assert.equal(writes.at(-1).job.checkpoint,null,'old owned run can still retire its checkpoint');
 }finally{for(const k of names){if(prior[k])Object.defineProperty(globalThis,k,prior[k]);else delete globalThis[k];}}
});
console.log(`session lifecycle: ${passed}/${passed+failed} passed; entry VM and headless rules only`);
if(failed)process.exitCode=1;

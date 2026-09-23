import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {createElevatorWorld} from '../src/elevator-world.js';
import {ELEVATOR_SOLIDS} from '../src/elevator-data.js';
import {TOWER_STAGES,TOWER_ENTRIES,TOWER_SUPPLIES,towerObstacles} from '../src/tower-data.js';
import {createPlayerMotion} from '../src/player-motion.js';
globalThis.location={search:'?map=tower'};
const {createMission,chooseEncounterSpawns}=await import('../src/mission.js');
const {validCheckpoint,createCampaignStore}=await import('../src/campaign.js');
const {WEAPONS}=await import('../src/combat.js');
const elements=[];globalThis.document={createElement:()=>{const el={style:{},dataset:{},append(){},remove(){this.removed=true;}};elements.push(el);return el;},body:{append(){}}};
const terminals=TOWER_STAGES.filter(s=>s.id!=='extract').map(s=>({x:s.x,z:s.z,w:1.8,d:1,bottom:s.feetY,top:s.feetY+1.4}));
for(let i=0;i<5;i++){
 const obstacles=towerObstacles(i).concat(terminals,ELEVATOR_SOLIDS),motion=createPlayerMotion(obstacles,[],{x:29,z:23}),e=TOWER_ENTRIES[i],s=TOWER_STAGES[i];assert(motion.canOccupy(e.x,e.z,e.feetY));
 const spawns=chooseEncounterSpawns(s,{...e,y:e.feetY+1.7},obstacles);assert.equal(spawns.length,s.count);for(const p of spawns)assert(motion.canOccupy(p.x,p.z,p.y));
 for(const p of TOWER_SUPPLIES)assert(motion.canOccupy(p.x,p.z,p.feetY),'supply '+p.id);
}
const scene=new T.Scene(),obstacles=towerObstacles(3).concat(terminals);
for(const o of obstacles){o.mesh=new T.Mesh(new T.BoxGeometry(o.w,o.top-o.bottom,o.d),new T.MeshBasicMaterial());o.mesh.position.set(o.x,(o.top+o.bottom)/2,o.z);scene.add(o.mesh);}
const original=obstacles.length,w=createElevatorWorld(scene,obstacles),motion=createPlayerMotion(obstacles,[],{x:29,z:23}),p=new T.Vector3(23.5,1.7,1.45);
globalThis.innerWidth=1100;globalThis.innerHeight=760;w.updateMarkers(new T.PerspectiveCamera(),false);scene.updateMatrixWorld(true);w.setStage(3);assert(!w.blocking);assert(w.canAdvance({index:3,defending:false}));assert(!w.canAdvance({index:3,defending:true}));
const mission=createMission();mission.reset(3);let event=mission.tick(2,{player:{x:7,z:-4.6,feetY:6},held:true,clear:true});assert.equal(event.type,'defense');assert.equal(mission.tick(18,{player:{x:7,z:-7,feetY:6},clear:w.canAdvance(mission.state)}),null);assert(w.prepareMission(mission.state,true));assert(!w.prepareMission(mission.state,true));
motion.reset(p,0);w.update(.3,p,0,true);w.update(10,p,0,false);assert.equal(w.arena.charge,0);w.update(.61,p,0,true);assert.equal(w.state.phase,'exposed');
const core=w.targets.find(o=>o.userData.overseer==='core');
function validateCoreRay(){scene.updateMatrixWorld(true);const target=core.getWorldPosition(new T.Vector3()),ray=new T.Raycaster(p,target.clone().sub(p).normalize(),0,3.5);assert.equal(ray.intersectObjects(obstacles.map(o=>o.mesh).concat(w.targets),false)[0]?.object,core,'real knife-distance core LOS');assert.deepEqual(w.objective.toArray(),target.toArray(),'exposed objective must be actual core, not the pad');assert(w.objectiveLabel.includes('胸核'));}
validateCoreRay();assert.equal(w.hit(core,9999).damage,500);assert.equal(w.state.hp,1000);assert.equal(w.arena.mode,'boarding');assert.equal(w.hit(core,9999).damage,0);
function step(dt,dx=0,dz=0,jump=false){w.beforeMotion(dt,p,motion,[]);motion.step(dt,p,dx,dz,jump);return w.update(dt,p,motion.state.y,true,motion.state.grounded);}
function boardAndAscend(goal){p.set(23.5,w.lift.y+1.7,6);motion.reset(p,w.lift.y);for(let i=0;i<600&&w.lift.y!==goal;i++)step(.02);assert.equal(w.lift.y,goal);assert.equal(motion.state.y,goal);assert.equal(w.arena.mode,'dock');}
function jumpToPad(goal){
 // Walk on the platform, then use the real jump and collision controller across the 1.4m gap.
 for(let i=0;i<18;i++)step(.02,0,-.1);
 assert(p.z<4.3&&p.z>4.1);
 for(let i=0;i<90;i++)step(.02,0,p.z>1.45?-.1:0,i===0);
 assert(Math.abs(motion.state.y-goal)<.01,`landed at ${goal}m, actual ${motion.state.y}`);assert(p.z>=.6&&p.z<=1.7,'on marked pad');
 for(let i=0;i<40;i++)step(.02);assert.equal(w.state.phase,'exposed');
}
boardAndAscend(3);const frozen=w.lift.y;w.update(10,p,motion.state.y,false);assert.equal(w.lift.y,frozen);jumpToPad(3);validateCoreRay();
w.hit(core,10,{halo:true});w.hit(core,10,{halo:true});assert(w.hit(core,10,{halo:true}).marked);assert.equal(w.hit(core,100).damage,120);assert.equal(w.hit(core,99999).damage,350);assert.equal(w.state.hp,500);assert.equal(w.arena.index,2);
boardAndAscend(6);
// Fall recovery: native same-floor call ray at the ground pillar, return to zero, then auto ascend to the outstanding lock.
p.set(23.5,1.7,12);motion.reset(p,0);w.update(.01,p,0,true);const camera=new T.PerspectiveCamera();camera.position.copy(p);camera.lookAt(23.5,1.05,10.2);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
w.interact(.61,{camera,held:true,feetY:3});assert(!w.lift.moving,'wrong floor cannot call');w.interact(.61,{camera,held:true,feetY:0});assert(w.lift.moving);assert.equal(w.lift.target,0);
for(let i=0;i<600&&w.lift.y!==0;i++)step(.02);assert.equal(w.lift.y,0);assert.equal(w.arena.index,2);assert.equal(w.state.hp,500,'fall/recall does not restore boss health');
boardAndAscend(6);jumpToPad(6);validateCoreRay();
const result=w.hit(core,99999);assert.equal(result.damage,500);assert(result.killed);assert(!w.hit(core,9999).killed);assert(w.blocking);w.update(.8,p,6,true);assert(!w.blocking);assert(w.canAdvance(mission.state));
event=mission.tick(.02,{player:p,clear:w.canAdvance(mission.state)});assert.equal(event.next.id,'extract');w.setStage(4);assert.equal(w.lift.y,6,'safe deterministic post-boss exit');assert(!w.blocking);
// Real motion: jump back to the lift, walk over the bridge to the old upper lift boundary.
p.set(23.5,7.7,1.45);motion.reset(p,6);
for(let i=0;i<80;i++){motion.step(.02,p,0,p.z<5.4?.1:0,i===0);}assert.equal(motion.state.y,6);assert(p.z>5.3);
for(let i=0;i<79;i++)motion.step(.02,p,-.1,0);assert(p.x<16&&motion.state.y===6,'bridge reaches old lift side without falling');
const data=new Map(),store=createCampaignStore({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});
for(const stageIndex of [3,4]){const e=TOWER_ENTRIES[stageIndex],cp={stageIndex,health:100,selected:0,rounds:WEAPONS.slice(0,3).map(w=>w.cap),reserves:WEAPONS.slice(0,3).map(w=>w.reserve),x:e.x,z:e.z,feetY:e.feetY,yaw:0,pitch:0,kills:12,time:200,collected:[],towerLiftTime:9};assert(validCheckpoint(cp));assert(store.save(cp));assert.equal(store.checkpoint.towerLiftTime,9);}
w.clear();w.setStage(3);assert.equal(w.lift.y,0);assert.equal(w.state.hp,1500);assert.equal(w.state.phase,'inactive');assert.equal(w.battle.summary.status,'idle');w.dispose();assert.equal(obstacles.length,original);assert(elements.some(e=>e.className==='boss-mechanic elevator-panel'&&e.removed));
console.log('PASS: tower entries/spawns/supplies, actual defense gate, physical 0/3/6 rides and two gap jumps, core LOS/HALO, floor-checked recall after falling, defeat/exit bridge, old checkpoints/reset/dispose');

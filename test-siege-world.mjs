import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as T from './node_modules/three/build/three.module.js';
import {SKYHOOK,LEVIATHAN,siegeSolids} from './siege-data.js';
import {createSiegeWorld} from './siege-world.js';
import {createPlayerMotion} from './player-motion.js';
import {TRAIN_STAGES,TRAIN_ENTRIES,TRAIN_SUPPLIES,trainObstacles} from './train-data.js';
import {HARBOR_STAGES,HARBOR_ENTRIES,HARBOR_SUPPLIES,harborObstacles} from './harbor-data.js';
const map=process.argv[2];
if(!map){for(const m of ['train','harbor']){const r=spawnSync(process.execPath,[new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/,''),m],{stdio:'inherit'});assert.equal(r.status,0);}process.exit(0);}
globalThis.location={search:'?map='+map};globalThis.innerWidth=1100;globalThis.innerHeight=760;
const {createMission,chooseEncounterSpawns}=await import('./mission.js'),{validCheckpoint}=await import('./campaign.js'),{WEAPONS}=await import('./combat.js');
const c=map==='train'?SKYHOOK:LEVIATHAN,stages=map==='train'?TRAIN_STAGES:HARBOR_STAGES,entries=map==='train'?TRAIN_ENTRIES:HARBOR_ENTRIES,supplies=map==='train'?TRAIN_SUPPLIES:HARBOR_SUPPLIES,makeObs=map==='train'?trainObstacles:harborObstacles;
const terminals=stages.filter(s=>s.id!=='extract').map(s=>({x:s.x,z:s.z,w:1.8,d:1,bottom:s.feetY,top:s.feetY+1.4}));
for(let i=0;i<5;i++){
 const obs=makeObs(i).concat(terminals,siegeSolids(c)),m=createPlayerMotion(obs),e=entries[i],s=stages[i];assert(m.canOccupy(e.x,e.z,e.feetY),'entry '+i);assert.equal(chooseEncounterSpawns(s,{...e,y:e.feetY+1.7},obs).length,s.count,'spawns '+i);
 for(const p of supplies)assert(m.canOccupy(p.x,p.z,p.feetY??0),'supply '+p.id);
 if(s.defenseCount)for(const wave of [{count:s.defenseCount,spawns:s.defenseSpawns},...(s.defenseWaves||[])])assert.equal(chooseEncounterSpawns({...s,...wave},{x:s.x,z:s.z,y:s.feetY+1.7},obs).length,wave.count,'defense waves');
}
const elements=[];globalThis.document={createElement:()=>{const e={style:{},dataset:{},append(){},remove(){this.removed=true;}};elements.push(e);return e;},body:{append(){}}};
const scene=new T.Scene(),obs=makeObs(3).concat(terminals);for(const o of obs){o.mesh=new T.Mesh(new T.BoxGeometry(o.w,o.top-o.bottom,o.d),new T.MeshBasicMaterial());o.mesh.position.set(o.x,(o.bottom+o.top)/2,o.z);scene.add(o.mesh);}
let feetReady=false;
const initial=obs.length,w=createSiegeWorld(scene,obs,c,{getPlayerFeet:()=>{assert(feetReady,'constructor must not read player motion before initialization');return m.state.y;}}),m=createPlayerMotion(obs),p=new T.Vector3(),camera=new T.PerspectiveCamera();feetReady=true;
const mission=createMission();mission.reset(3);mission.state.defending=true;mission.state.progress=c.defense-.05;mission.state.wave=stages[3].defenseWaves?.length||0;w.setStage(3);w.updateMarkers(camera,false);
assert.equal(mission.tick(.05,{player:stages[3],clear:w.canAdvance(mission.state)}),null);assert(w.prepareMission(mission.state,true));assert(!w.prepareMission(mission.state,true));
function place(x,z,y,tx=x,ty=y+1.06,tz=z-2){p.set(x,y+1.7,z);m.reset(p,y);camera.position.copy(p);camera.lookAt(tx,ty,tz);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);w.update(.01,p,y,true);}
function control(id){const a=c.controls[id];if(c.id==='leviathan'&&id>0)place(a.x-2,a.z,a.feetY,a.x,a.feetY+1.06,a.z);else place(a.x,a.z+1.9,a.feetY,a.x,a.feetY+1.06,a.z);}
for(let i=0;i<c.units;i++){
 if(i&&c.transition)w.update(c.transition,p,m.state.y,true);
 control(i);assert(m.canOccupy(p.x,p.z,m.state.y),'control clearance');
 w.interact(.6,{camera,held:true,feetY:m.state.y+3});assert.equal(w.arena.mode,'ready','wrong floor');
 w.interact(.3,{camera,held:true,feetY:m.state.y});w.update(4,p,m.state.y,false);assert.equal(w.arena.hold,0);
 w.interact(.61,{camera,held:true,feetY:m.state.y});assert.equal(w.arena.mode,'operation','actual E ray / '+c.id+' control '+i);assert.equal(w.objective.x,c.core.x);assert.equal(w.objective.z,c.core.z);assert(w.objectiveLabel.includes('核心'));w.updateMarkers(camera,true);assert(elements.slice(5).every(e=>e.hidden),'no E marker during operation');w.update(c.operation,p,m.state.y,true);assert.equal(w.state.phase,'exposed');
 if(c.id==='skyhook'&&i===0){const summons=w.takeSummons(p);assert.equal(summons.length,2);assert.equal(w.takeSummons(p).length,0);const spec={...stages[3],count:2,roles:['hound'],spawns:summons.map(a=>({x:a.x,z:a.z,feetY:a.y}))};assert.equal(chooseEncounterSpawns(spec,p,obs).length,2,'safe roof hound spawns');}
 place(c.core.x,c.core.z+c.core.front+2.3,w.floor);const core=w.targets.find(o=>o.userData.overseer==='core'),target=core.getWorldPosition(new T.Vector3()),ray=new T.Raycaster(p,target.clone().sub(p).normalize(),0,3.5);assert(m.canOccupy(p.x,p.z,m.state.y),'knife stance');assert.equal(ray.intersectObjects(obs.map(o=>o.mesh).concat(w.targets),false)[0]?.object,core,'unobstructed core melee ray');
 let spent=0;if(i===0){for(let n=0;n<3;n++){const h=w.hit(core,10,{halo:true});assert.equal(h.marked,n===2);spent+=h.damage;}const timer=w.state.timer;w.update(5,p,m.state.y,false);assert.equal(w.state.timer,timer);w.update(.01,p,m.state.y,true);const h=w.hit(core,100);assert.equal(h.damage,120);spent+=h.damage;}else{assert.equal(w.hit(core,10).damage,10,'HALO cleared across phases');spent=10;}
 const hit=w.hit(core,99999);assert.equal(hit.damage,c.unitHp-spent);assert.equal(hit.killed,i===c.units-1);assert.equal(w.hit(core,99999).damage,0);
 if(map==='train'&&i===0){
  function walk(x,z){for(let n=0;n<2000;n++){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.03)return;m.step(.02,p,dx/d*Math.min(.1,d),dz/d*Math.min(.1,d));}assert.fail('train stairs blocked');}
  walk(-1.5,-12.3);walk(-1.5,-18.5);walk(-3.5,-18.5);walk(-3.5,-9.5);for(let n=0;n<60;n++)m.step(.02,p,0,0);assert.equal(m.state.y,1.5,'physical roof to cabin route');
 }

}
w.update(.8,p,m.state.y,true);assert(!w.blocking);assert(w.canAdvance(mission.state));assert.equal(mission.tick(.01,{player:p,clear:true}).next.id,'extract');w.setStage(4);assert(!w.blocking);
// The new harbor path is traversed with real physical movement, not teleported over the gap.
if(map==='harbor'){
 place(-20,-16,0);
 function walk(x,z,jump=false){for(let i=0;i<1800;i++){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.03)return;m.step(.02,p,dx/d*Math.min(.1,d),dz/d*Math.min(.1,d),jump&&i===0);}assert.fail('blocked '+JSON.stringify(p));}
 walk(-10,-16);assert.equal(m.state.y,3);walk(-10,-19.8);walk(4.8,-19.8);walk(8,-19.8,true);for(let i=0;i<60;i++)m.step(.02,p,0,0);assert.equal(m.state.y,3,'catwalk jump');walk(15,-19.8);walk(20,-19.8);assert.equal(m.state.y,3);walk(22,-19.8);for(let i=0;i<100;i++)m.step(.02,p,0,0);assert.equal(m.state.y,0,'dry land recovery');walk(22,-22);walk(-20,-22);walk(-20,-16);walk(-10,-16);assert.equal(m.state.y,3,'return stairs');
}
// First crane: a real sprint/jump route still leaves a melee-sized damage window.
if(map==='harbor'){
 w.clear();w.setStage(3);w.prepareMission({index:3,defending:true,progress:c.defense},true);control(0);w.interact(.61,{camera,held:true,feetY:3});
 function sprint(x,z,jump=false){for(let n=0;n<800;n++){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.03)return;m.step(.02,p,dx/d*Math.min(.16,d),dz/d*Math.min(.16,d),jump&&n===0);w.update(.02,p,m.state.y,true);}assert.fail('crane timed route blocked');}
 sprint(-4,-16.6);sprint(-4,-19.8);sprint(4.8,-19.8);sprint(8,-19.8,true);sprint(16.8,-19.8);sprint(18,-19.1);assert.equal(m.state.y,3);assert.equal(w.state.phase,'exposed');assert(w.state.timer>3.4,'first crane leaves seven blade strike intervals: '+w.state.timer);
}
for(const stageIndex of [3,4]){const e=entries[stageIndex],cp={stageIndex,health:100,selected:0,rounds:WEAPONS.slice(0,3).map(w=>w.cap),reserves:WEAPONS.slice(0,3).map(w=>w.reserve),x:e.x,z:e.z,feetY:e.feetY,yaw:0,pitch:0,kills:1,time:100,collected:[],...(map==='train'?{trainTime:42}:{})};assert(validCheckpoint(cp));}
w.clear();w.setStage(3);assert.equal(w.state.phase,'inactive');assert.equal(w.state.hp,c.hp);assert.equal(w.battle.summary.status,'idle');w.dispose();assert.equal(obs.length,initial);assert(elements.some(e=>e.removed));console.log('PASS',c.id,'all original spawns/waves/supplies, gate, physical controls/core LOS, summons, full phases, old checkpoints/reset/dispose and harbor traversal');

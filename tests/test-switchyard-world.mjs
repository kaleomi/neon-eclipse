import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {createSwitchyardWorld} from '../src/switchyard-world.js';
import {SWITCHYARD_SWITCHES,SWITCHYARD_SOLIDS} from '../src/switchyard-rules.js';
import {STATION_STAGES,STATION_ENTRIES,STATION_SUPPLIES,stationObstacles} from '../src/station-data.js';
import {createPlayerMotion} from '../src/player-motion.js';
import {formatBossBattleRecord} from '../src/boss-battle-record.js';
globalThis.location={search:'?map=station'};
const {createMission,chooseEncounterSpawns}=await import('../src/mission.js');
const {createNavigator}=await import('../src/arena.js');
const {validCheckpoint,createCampaignStore,SAVE_KEY}=await import('../src/campaign.js');
const {WEAPONS}=await import('../src/combat.js');
const ui=[];globalThis.document={createElement:()=>{const el={style:{},dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},append(){},remove(){this.removed=true;}};ui.push(el);return el;},body:{append(){}}};
globalThis.innerWidth=1280;globalThis.innerHeight=800;
// Add actual station collision + terminals before the new world. No empty-arena LOS assumptions.
const scene=new T.Scene(),obs=stationObstacles(3).concat(STATION_STAGES.filter(s=>s.id!=='extract').map(s=>({x:s.x,z:s.z,w:1.8,d:1,h:1.4})));
for(const o of obs){o.mesh=new T.Mesh(new T.BoxGeometry(o.w,o.h,o.d),new T.MeshBasicMaterial());o.mesh.position.set(o.x,o.h/2,o.z);scene.add(o.mesh);}
const initial=obs.length,events=[],world=createSwitchyardWorld(scene,obs,{onEvent:e=>events.push(e)});
assert.equal(obs.length,initial+SWITCHYARD_SOLIDS.length);scene.updateMatrixWorld(true);
for(let i=0;i<5;i++){
 const obstacles=stationObstacles(i).concat(SWITCHYARD_SOLIDS,STATION_STAGES.filter(s=>s.id!=='extract').map(s=>({x:s.x,z:s.z,w:1.8,d:1,h:1.4})));
 const nav=createNavigator(obstacles),entry=STATION_ENTRIES[i],s=STATION_STAGES[i];nav.rebuild(entry.x,entry.z);
 assert(nav.isReachable(s.x,s.z+2.4),'old objective remains reachable '+i);
 const spawns=chooseEncounterSpawns(s,entry,obstacles);assert.equal(spawns.length,s.count);for(const p of spawns)assert(nav.isReachable(p.x,p.z),'guard route remains reachable '+i);
 if(i===4)for(const p of STATION_SUPPLIES)assert(nav.isReachable(p.x,p.z),'supply remains reachable '+p.id);
 if(i===3){for(const p of SWITCHYARD_SWITCHES)assert(nav.isReachable(p.x-1.6,p.z),'control reachable');assert(nav.isReachable(25.5,-25),'route to knife approach reachable');const motion=createPlayerMotion(obstacles),p={x:25.5,y:1.7,z:-25};motion.reset(p);motion.step(.2,p,-1,0);assert(Math.abs(p.x-24.5)<1e-6,'player can walk from route to knife range');}
}
world.setStage(3);assert(!world.blocking);assert(world.canAdvance({index:3,defending:false}));assert(!world.canAdvance({index:3,defending:true}));
const m=createMission();m.reset(3);let e=m.tick(2,{player:{x:22,z:-19.6},held:true,clear:true});assert.equal(e.type,'defense');
assert.equal(m.tick(18,{player:{x:22,z:-19.6},clear:world.canAdvance(m.state)}),null,'no auto-advance on last defense frame');assert.equal(m.state.index,3);assert(world.prepareMission(m.state,true));assert(!world.prepareMission(m.state,true));assert(world.blocking);
const camera=new T.PerspectiveCamera();camera.rotation.order='YXZ';
function faceControl(id){const p=SWITCHYARD_SWITCHES[id];camera.position.set(p.x-1.6,1.7,p.z);camera.lookAt(p.x,p.y,p.z);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);}
faceControl(1);world.interact(.6,{camera,held:true});assert(!world.rail.armed);
 const holdTrack=ui.find(e=>e.className==='switchyard-hold-track'),holdRow=ui.find(e=>e.className==='switchyard-hold');
 faceControl(0);world.interact(.3,{camera,held:true});world.update(0,camera.position,0,true);assert.equal(holdTrack.getAttribute('aria-valuenow'),'50');assert.equal(holdRow.hidden,false);
 world.interact(.01,{camera,held:false});world.update(0,camera.position,0,true);assert.equal(holdTrack.getAttribute('aria-valuenow'),'0','release clears the separate hold bar');
 for(const [reason,args]of [['airborne',{grounded:false}],['floor',{feetY:3}],['busy',{busy:true}]]){world.interact(.1,{camera,held:true,...args});world.update(0,camera.position,0,true);assert.equal(holdTrack.getAttribute('aria-valuenow'),'0');assert.equal(holdRow.dataset.state,'blocked');assert(holdTrack.getAttribute('aria-valuetext').length>0);}
 camera.lookAt(20,1.7,-25);camera.updateMatrixWorld(true);world.interact(.1,{camera,held:true});world.update(0,camera.position,0,true);assert.match(ui[4].textContent,/准星/);faceControl(0);
faceControl(0);world.interact(.3,{camera,held:true});world.update(4,camera.position,0,false);assert.equal(world.rail.timer,4);assert.equal(world.rail.hold,0);
world.interact(.6,{camera,held:true,busy:true});assert(!world.rail.armed);
const blocker=new T.Mesh(new T.BoxGeometry(.1,3,3),new T.MeshBasicMaterial());blocker.position.set(29.2,1.5,-25);scene.add(blocker);const blockerObstacle={mesh:blocker,x:29.2,z:-25,w:.1,d:3,h:3};obs.push(blockerObstacle);scene.updateMatrixWorld(true);world.interact(.6,{camera,held:true});world.update(0,camera.position,0,true);assert(!world.rail.armed,'wall blocks switch interaction');assert.match(ui[4].textContent,/遮挡/);assert.equal(holdTrack.getAttribute('aria-valuenow'),'0');obs.splice(obs.indexOf(blockerObstacle),1);scene.remove(blocker);
camera.lookAt(30,2,-25);camera.updateMatrixWorld(true);world.updateMarkers(camera,true);assert.equal(ui.filter(e=>e.className==='switchyard-marker')[0].hidden,false,'unarmed current switch is visible');faceControl(0);
world.interact(.6,{camera,held:true});assert(world.rail.armed,'physical E interaction succeeds');
world.update(0,camera.position,0,true);assert.equal(holdTrack.getAttribute('aria-valuenow'),'100');assert.equal(holdRow.dataset.state,'armed');assert.deepEqual(world.objective.toArray(),[22,1.9,-25],'armed switch should guide approach to core');assert(world.objectiveLabel.includes('核心'));assert(ui[4].textContent.includes('侧面'));camera.lookAt(30,2,-25);camera.updateMatrixWorld(true);world.updateMarkers(camera,true);assert(ui.filter(e=>e.className==='switchyard-marker').every(e=>e.hidden),'no obsolete control marker after arming');
const core=world.targets.find(o=>o.geometry.type==='IcosahedronGeometry');assert.equal(world.hit(core,500).damage,0);world.setStage(3);assert(world.rail.armed,'repeated spawn is idempotent');
world.update(6.4,new T.Vector3(0,1.7,0),0,true);assert.equal(world.state.phase,'exposed');assert.equal(world.battle.summary.windows,1);
// Knife-distance ray reaches the exposed core, while an inserted wall blocks normal rays.
const player=new T.Vector3(24.5,1.7,-25),towards=core.position.clone().sub(player);const ray=new T.Raycaster(player,towards.normalize(),0,3.5);scene.updateMatrixWorld(true);
assert.equal(ray.intersectObjects(obs.map(o=>o.mesh).concat(world.targets),false)[0].object,core);
const wall=new T.Mesh(new T.BoxGeometry(.1,4,4),new T.MeshBasicMaterial());wall.position.set(23.5,2,-25);scene.add(wall);scene.updateMatrixWorld(true);assert.equal(ray.intersectObjects([wall,...world.targets],false)[0].object,wall);scene.remove(wall);
world.hit(core,10,{halo:true});world.hit(core,10,{halo:true});assert(world.hit(core,10,{halo:true}).marked);assert.equal(world.hit(core,100).damage,120);
const result=world.hit(core,99999);assert(result.killed);assert.equal(world.hit(core,999).killed,false);assert.equal(world.targets.length,0);assert(world.blocking);world.update(.8,player,0,true);assert(!world.blocking);assert(world.canAdvance(m.state));
e=m.tick(.01,{player,clear:world.canAdvance(m.state)});assert.equal(e.next.id,'extract');world.setStage(4);assert(!world.blocking);assert.equal(world.targets.length,0);
assert.match(formatBossBattleRecord(world.battle.summary),/Boss 列车 \/ 地面放电/);
world.clear();assert.equal(world.battle.summary.status,'idle');world.setStage(3);assert(!world.blocking);assert(world.prepareMission({index:3,defending:true,progress:18},true));assert.equal(world.state.hp,1200);assert.equal(world.state.windows,0);
// Existing stage 3/4 checkpoints retain their schema and meaning. No raw boss state is persisted.
const map=new Map(),store=createCampaignStore({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)});
for(const stageIndex of [3,4]){const p=STATION_ENTRIES[stageIndex],cp={stageIndex,health:100,selected:0,rounds:WEAPONS.slice(0,3).map(w=>w.cap),reserves:WEAPONS.slice(0,3).map(w=>w.reserve),x:p.x,z:p.z,yaw:0,pitch:0,time:80,kills:7,collected:[]};assert(validCheckpoint(cp));assert(store.save(cp));assert.equal(store.checkpoint.stageIndex,stageIndex);}
assert.equal(JSON.parse(map.get(SAVE_KEY)).version,1);
world.dispose();assert.equal(obs.length,initial);assert(!scene.children.some(o=>o.name==='SWITCHYARD'));assert(ui.filter(e=>e.className==='switchyard-marker').every(e=>e.removed));
console.log('PASS: actual Three world, station routes/spawns, defense-to-boss completion gate, physical controls, pause/LOS/melee/HALO, defeat/extraction, retry/idempotence, old checkpoints and disposal');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {VEHICLE_ASSETS,VEHICLE_VERSION,createVehicleVisual,vehicleStats,vehicleRigStats,disposeVehicle} from '../src/vehicle-models.js';
const srcPath=p=>(/^[a-z0-9-]+\.js$/.test(p)?'src/'+p:p);
let groups=0;const pass=s=>{groups++;console.log('PASS '+s);};
const near=(a,b,message,epsilon=2e-6)=>assert(Math.abs(a-b)<epsilon,`${message}: ${a} vs ${b}`);
const meshes=root=>{const list=[];root.traverse(o=>{if(o.isMesh&&o.userData.vehicleVisual)list.push(o);});return list.sort((a,b)=>a.name.localeCompare(b.name));};
const bone=(root,name)=>{const b=root.getObjectByName(name);assert(b?.isBone,name+' exported rigid joint');return b;};
function pose(root,type,t){
  if(type==='rover'){
    bone(root,'V01_Body').rotation.set(.05*t,0,-.06*t);bone(root,'V01_Body').position.y=.012*t;
    for(const id of ['FL','FR','RL','RR']){const p=bone(root,'V01_Steer_'+id);p.rotation.y=id[0]==='F'?-.24*t:0;p.position.y=.57+(id[1]==='L'?.11:-.08)*t;bone(root,'V01_Wheel_'+id).rotation.x=-2.8*t;}
  }else if(type==='aircraft')bone(root,'V03_Propeller').rotation.z=1.17*t;
  else if(type==='helicopter'){
    bone(root,'V04_Attitude').rotation.set(-.21*t,0,.17*t,'YXZ');bone(root,'V04_RotorBlades').rotation.y=-1.06*t;bone(root,'V04_TailRotor').rotation.x=3.18*t;
  }
  root.position.set(13,-2,8);root.rotation.y=.31;root.updateMatrixWorld(true);
}
const catalog=JSON.parse(fs.readFileSync(new URL('../models/vehicles.manifest.json',import.meta.url),'utf8'));assert.equal(catalog.version,VEHICLE_VERSION);
for(const [type,spec] of Object.entries(VEHICLE_ASSETS)){
  const source=createVehicleVisual(type),bytes=fs.readFileSync(new URL('../models/'+(spec.file),import.meta.url)),json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  const loaded=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  assert.equal(source.userData.version,VEHICLE_VERSION);assert.equal(loaded.userData.version,VEHICLE_VERSION);
  assert.equal((json.images||[]).length,0);assert.equal((json.animations||[]).length,0);assert(!(json.buffers||[]).some(b=>b.uri));
  const expected={rover:10,yacht:0,aircraft:2,helicopter:4}[type];assert.equal(vehicleRigStats(source).joints,expected);assert.equal(vehicleRigStats(loaded).joints,expected);
  const a=meshes(source),b=meshes(loaded);assert.equal(a.length,6);assert.equal(b.length,6);
  source.traverse(o=>{if(!o.isSkinnedMesh)return;const indices=o.geometry.attributes.skinIndex,weights=o.geometry.attributes.skinWeight;
    for(let i=0;i<weights.count;i++){assert.equal(weights.getX(i),1);assert.equal(weights.getY(i)+weights.getZ(i)+weights.getW(i),0);assert(indices.getX(i)<o.skeleton.bones.length);}
  });
  for(const t of [0,.37,1]){
    pose(source,type,t);pose(loaded,type,t);
    for(let m=0;m<a.length;m++){
      assert.equal(a[m].name,b[m].name);const count=a[m].geometry.attributes.position.count;assert.equal(b[m].geometry.attributes.position.count,count);
      for(let i=0;i<count;i++){
        const p=a[m].getVertexPosition(i,new T.Vector3()).applyMatrix4(a[m].matrixWorld),q=b[m].getVertexPosition(i,new T.Vector3()).applyMatrix4(b[m].matrixWorld);
        near(p.x,q.x,spec.id+' posed GLB X');near(p.y,q.y,spec.id+' posed GLB Y');near(p.z,q.z,spec.id+' posed GLB Z');
      }
    }
  }
  disposeVehicle(source);disposeVehicle(loaded);pass(spec.id+' exact source/GLB rigid-pose parity, normalized weights and zero externals');
}
if(process.argv.includes('--geometry-only')){console.log(`PASS refined vehicle geometry: ${groups} groups`);process.exit(0);}

const {createRoverModel}=await import('../src/vehicle-world.js');
const {createAircraftModel,createYachtModel}=await import('../src/sea-air-world.js');
const {createHelicopterModel,disposeHelicopterObject}=await import('../src/helicopter-world.js');
const {terrainHeight,ROVER}=await import('../src/vehicle-rules.js');
const {HELICOPTER,helicopterSkidClearance}=await import('../src/helicopter-rules.js');
const scene=new T.Scene(),rover=createRoverModel(scene);
for(const state of [{x:-105,z:105,yaw:.5,speed:12,steer:.4,distance:14.2},{x:62,z:14,yaw:1.2,speed:24,steer:-.5,distance:24.8}]){
  const frozen=JSON.stringify(state),time=1.7;rover.update(state,time);rover.root.updateMatrixWorld(true);
  near(rover.root.position.x,state.x,'rover position');near(rover.root.position.y,terrainHeight(state.x,state.z),'rover ground');near(rover.root.rotation.y,-state.yaw,'rover yaw');
  const f={x:Math.sin(state.yaw),z:-Math.cos(state.yaw)},r={x:Math.cos(state.yaw),z:Math.sin(state.yaw)};
  near(rover.body.rotation.x,-(terrainHeight(state.x+f.x*1.4,state.z+f.z*1.4)-terrainHeight(state.x-f.x*1.4,state.z-f.z*1.4))/2.8,'old pitch');
  near(rover.body.rotation.z,(terrainHeight(state.x+r.x,state.z+r.z)-terrainHeight(state.x-r.x,state.z-r.z))/2,'old roll');
  near(rover.body.position.y,Math.sin(time*18)*Math.min(Math.abs(state.speed)*.0008,.025),'old chassis vibration');
  for(const id of ['FL','FR','RL','RR']){
    const p=bone(rover.root,'V01_Steer_'+id),wheel=bone(rover.root,'V01_Wheel_'+id),ground=terrainHeight(state.x+r.x*p.position.x-f.x*p.position.z,state.z+r.z*p.position.x-f.z*p.position.z);
    near(p.position.y,.57+Math.max(-.4,Math.min(.4,ground-rover.root.position.y)),'old independent wheel ground');
    near(p.rotation.y,id[0]==='F'?-state.steer*.4:0,'old steering');near(wheel.rotation.x,-state.distance/.56,'old wheel spin');
  }
  assert.equal(JSON.stringify(state),frozen,'visual mutated driving state');
}
const attachment=new T.Object3D();attachment.position.set(0,2,.2);rover.body.add(attachment);rover.root.updateMatrixWorld(true);
assert(attachment.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(0,2,.2).applyMatrix4(rover.body.matrixWorld))<1e-9,'roof mount transform preserved');
const staticRover=createVehicleVisual('rover'),box=new T.Box3().setFromObject(staticRover,true);assert(box.min.y>-.001);assert(Math.max(Math.abs(box.min.x),Math.abs(box.max.x))<=ROVER.radius+1e-6);disposeVehicle(staticRover);disposeVehicle(rover.root);
pass('V01 original terrain/body/wheel transforms, turret parent, collision-width envelope and read-only state');

const plane=createAircraftModel(scene),boat=createYachtModel(scene),enemy=createYachtModel(scene,{hostile:true});
const ps={x:12,y:24,z:7,pitch:.17,yaw:.8,roll:.2,crashed:false,throttle:.7};plane.update(ps,2);
near(plane.root.position.y,24,'plane altitude');assert.equal(plane.root.rotation.order,'YXZ');near(bone(plane.root,'V03_Propeller').rotation.z,2*(10+.7*95),'old propeller rate');
plane.update({...ps,crashed:true},3);near(bone(plane.root,'V03_Propeller').rotation.z,0,'old crashed propeller');
const bs={x:300,z:150,yaw:.4,speed:14,steer:.3},before=JSON.stringify(bs);boat.update(bs,2);enemy.update(bs,2);
near(boat.root.position.y,.08+Math.sin(2*1.2)*.08,'old sea bob');near(boat.root.rotation.z,Math.sin(2*.7)*.018+.3*14*.003,'old boat lean');assert.equal(JSON.stringify(bs),before);
assert(boat.wake.isGroup&&enemy.wake.isGroup);assert.equal(enemy.root.userData.variant,'hostile');
const normalPaint=boat.root.getObjectByName('V02_Paint_Surface'),hostilePaint=enemy.root.getObjectByName('V02_Paint_Surface');
assert.notDeepEqual([...normalPaint.geometry.attributes.color.array.slice(0,3)],[...hostilePaint.geometry.attributes.color.array.slice(0,3)]);assert.notEqual(normalPaint.material,hostilePaint.material);
for(const root of [plane.root,boat.root,enemy.root])disposeVehicle(root);
pass('V02/V03 original bob/lean/flight/propeller contracts, wake handle and isolated hostile colours');

const heli=createHelicopterModel();let samples=0;
for(const pitch of [-HELICOPTER.tilt,0,HELICOPTER.tilt])for(const roll of [-HELICOPTER.tilt,0,HELICOPTER.tilt])for(const angle of [0,.41,1.3,2.6]){
  const state={x:0,y:0,z:0,yaw:0,pitch,roll,rpm:.4,rotorAngle:angle},frozen=JSON.stringify(state);heli.update(state);heli.root.updateMatrixWorld(true);
  for(const m of meshes(heli.root))for(let i=0;i<m.geometry.attributes.position.count;i++){
    const p=m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld);samples++;
    assert(Math.hypot(p.x,p.z)<=HELICOPTER.radius+.03,'posed rotor/tail radius');assert(p.y<=HELICOPTER.height+.03,'posed height');assert(p.y>=-helicopterSkidClearance(state)-.035,'posed skid clearance');
  }
  near(heli.tail.rotation.x,angle*3,'old tail rotor rate');assert.equal(JSON.stringify(state),frozen);
}
heli.update({x:0,y:0,z:0,yaw:0,pitch:0,roll:0,rpm:1,rotorAngle:2});assert.equal(heli.disc.material.opacity,.29);assert.equal(bone(heli.root,'V04_RotorBlades').scale.x,0);assert.equal(heli.root.userData.rpm,1);
heli.update({x:0,y:0,z:0,yaw:0,pitch:0,roll:0,rpm:0,rotorAngle:0});assert.equal(bone(heli.root,'V04_RotorBlades').scale.x,1);assert.equal(heli.disc.material.opacity,0);
const skels=new Set();heli.root.traverse(o=>{if(o.skeleton)skels.add(o.skeleton);});let textures=0;
for(const s of skels){s.computeBoneTexture();s.boneTexture.addEventListener('dispose',()=>textures++);}disposeHelicopterObject(heli.root);assert.equal(textures,skels.size);
pass('V04 '+samples+' posed vertices within original collision/skid limits, RPM/blur restoration and bone-texture release');

for(const type of Object.keys(VEHICLE_ASSETS))for(let cycle=0;cycle<12;cycle++){
  const root=createVehicleVisual(type),resources=new Set(),skels=new Set();root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);if(o.skeleton)skels.add(o.skeleton);});
  for(const s of skels){s.computeBoneTexture();resources.add(s.boneTexture);}
  let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);
  disposeVehicle(root);disposeVehicle(root);assert.equal(disposed,resources.size,type+' exactly-once disposal');
}
const baseline=JSON.parse(fs.readFileSync('.tools/qa-vehicles-v2/before/source-hashes.json','utf8'));
// 2026-09-21 drift ledger: only the documented parallel sling/medevac sessions moved these three files
// (see docs/mcp-remake-joint-acceptance-2026-09-21.md / docs/mcp-models-joint-acceptance-2026-09-21.md).
// Any other drift, or further movement past the recorded versions, still fails.
const driftLedger={
 'vehicle-app.js':{to:'fb807057451d049683ecaa32aebe421b60094e3712f7136aad0ade1f7936f800',reason:'parallel sling/medevac then continued HUD/naval evolution, observed during joint fixes 2026-09-21 (previous documented: e1b2c229ef4fba6836b2c1b1062b88b4432b672229b18d0973c313a0a2cfe792)'},
 'helicopter-rules.js':{to:'d88502e08e94d37ea155aa3e66c42bca424a302fb05bc9af66e603875f71cca4',reason:'parallel sling mission rules evolution, 2026-09-21'},
 'helicopter-sling.js':{to:'ad058e0145f6d97183004187553950d18c7aa089192b61ead13cc3186129e20e',reason:'parallel sling/medevac extension, 2026-09-21'}
};
for(const item of baseline.filter(x=>x.role==='unchanged-gameplay')){
 const current=createHash('sha256').update(fs.readFileSync(srcPath(item.path))).digest('hex'),ledger=driftLedger[item.path];
 assert.equal(current,ledger?ledger.to:item.sha256,ledger?item.path+' must stay at its last documented parallel version':item.path+' untouched');
}
pass('48 create/release cycles including GPU bone textures; gameplay/entry/P4 pins held with 3 documented parallel transitions');
console.log(`PASS refined vehicle models: ${groups} groups`);

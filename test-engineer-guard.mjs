// E02 integration: real Three.js, original engineer directors, no browser/profile writes.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from './node_modules/three/build/three.module.js';
import {GLTFLoader} from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {createEnemyModel,animateEnemy} from './enemy-model.js';
import {ENEMY_TYPES} from './enemy-rules.js';
import {createEngineerDirector} from './engineer-director.js';
import {createEngineerRepair} from './engineer-repair.js';
import {ENGINEER_ASSET,ENGINEER_CLIPS,createEngineerVisual,bindEngineerRig,poseEngineer,
  makeEngineerClips,engineerStats,cloneEngineerVisual,disposeEngineerVisual} from './characters/engineer-guard.js';
let passed=0,rayCount=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS:',name);};
function dispose(g){const geos=new Set();g.traverse(o=>{if(o.geometry)geos.add(o.geometry);});geos.forEach(x=>x.dispose());new Set(g.userData.ownedMaterials||[]).forEach(m=>m.dispose());g.removeFromParent();}
const signature=g=>g.children.filter(o=>o.isMesh).map(o=>({zone:o.userData.hitZone,pos:o.position.toArray(),rotation:o.rotation.toArray(),vertices:[...o.geometry.attributes.position.array]}));
const before=createEnemyModel('engineer',{engineerSample:false}),after=createEnemyModel('engineer',{loadEngineerAsset:false});
test('engineer keeps FIELD_ENGINEER name, exact hit meshes and unchanged role parameters',()=>{
 assert.equal(after.name,before.name);assert.equal(after.name,'FIELD_ENGINEER');assert.deepEqual(signature(after),signature(before));
 assert(after.children.filter(o=>o.isMesh).every(o=>!o.visible&&o.userData.engineerProxy));
 assert.equal(ENEMY_TYPES.engineer.hp,90);assert.equal(ENEMY_TYPES.engineer.radius,.65);assert.equal(ENEMY_TYPES.engineer.attack.charge,1);
});
test('17,400 rays preserve distance, hit zone and root ownership across six poses',()=>{
 for(const spec of [{time:0},{time:.2,walking:true},{time:.7,charge:1},{time:1,engineerRepairing:true},{time:1.3,engineerBuilding:true},{time:1.9,walking:true}]){
  for(const g of [before,after]){animateEnemy({group:g,type:'engineer',hp:90,seed:.3,charge:0,...spec},spec.time,!!spec.walking);
   if(spec.engineerRepairing||spec.engineerBuilding)g.userData.parts.arms.forEach(a=>a.rotation.x=-.75);
   g.updateMatrixWorld(true);}
  for(let yi=0;yi<=28;yi++)for(let xi=-12;xi<=12;xi++)for(const [origin,direction]of [
   [[xi*.1,yi*.1,5],[0,0,-1]],[[xi*.1,yi*.1,-5],[0,0,1]],[[5,yi*.1,xi*.1],[-1,0,0]],[[-5,yi*.1,xi*.1],[1,0,0]]]){
   const ray=new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction));
   const a=ray.intersectObjects(before.children,false)[0],b=ray.intersectObjects(after.children,false)[0];
   assert.equal(!!a,!!b);if(a){assert(Math.abs(a.distance-b.distance)<1e-8);assert.equal(a.object.userData.hitZone,b.object.userData.hitZone);assert.equal(b.object.parent,after);}rayCount++;
  }
 }
 assert.equal(rayCount,17400);
});
test('R07/A03/H12 and every other role keep their current adapters and geometry',()=>{
 for(const type of Object.keys(ENEMY_TYPES).filter(t=>t!=='engineer')){
  const a=createEnemyModel(type,{loadRangedAsset:false,loadGuardAsset:false}),b=createEnemyModel(type,{engineerSample:false,loadRangedAsset:false,loadGuardAsset:false});
  assert.deepEqual(signature(a),signature(b),type);assert(!a.userData.parts?.engineerModel,type);
  if(type==='ranged')assert(a.userData.parts.guard);if(type==='assault'||type==='heavy')assert(a.userData.parts.variantModel);
  dispose(a);dispose(b);
 }
});
test('new visible subtrees cannot absorb recursively cast combat rays',()=>{
 const root=after.userData.parts.engineerModel.visual.root;root.updateWorldMatrix(true,true);
 assert.equal(new T.Raycaster(new T.Vector3(0,1.94,5),new T.Vector3(0,0,-1)).intersectObject(root,true).length,0);
});
test('existing repair channel drives Repair pose, heals 24 and cancels on damage',()=>{
 const scene=new T.Scene(),g=createEnemyModel('engineer',{loadEngineerAsset:false}),tg=createEnemyModel('sentry');scene.add(g,tg);tg.position.set(4,0,0);
 const e={type:'engineer',group:g,hp:90,maxHp:90,charge:0,seed:0,attack:99},turret={type:'sentry',group:tg,hp:60,maxHp:150,charge:0};
 const repair=createEngineerRepair({scene,enemies:[e,turret],obstacles:[],projectiles:{hasPending:()=>false}});
 repair.update(.01);assert(e.engineerRepairing);animateEnemy(e,1,false);assert.equal(g.userData.parts.engineerModel.pose.mode,'Repair');
 assert(g.userData.parts.engineerModel.visual.rig.nodes.AuxElbow.rotation.x<0);
 repair.update(1.6);animateEnemy(e,2,false);assert.equal(turret.hp,84);assert.equal(e.engineerRepairUsed,1);assert.equal(g.userData.parts.engineerModel.pose.mode,'Idle');
 repair.update(6.01);assert(e.engineerRepairing);e.hp-=1;repair.update(0);animateEnemy(e,3,false);
 assert(!e.engineerRepairing);assert.equal(turret.hp,84);assert.equal(g.userData.parts.engineerModel.pose.mode,'Idle');assert.equal(e.engineerRepairUsed,1);
 repair.clear();dispose(g);dispose(tg);
});
test('original deployment director drives Deploy pose and retains its one-deployment quota',()=>{
 const scene=new T.Scene(),g=createEnemyModel('engineer',{loadEngineerAsset:false});scene.add(g);
 const e={type:'engineer',group:g,hp:90,maxHp:90,charge:0,seed:0,radius:.65,attack:99,engineerCooldown:0};let deployments=0;
 const director=createEngineerDirector({scene,enemies:[e],player:{position:new T.Vector3(0,1.7,20)},obstacles:[],projectiles:{hasPending:()=>false},deploy:()=>{deployments++;return true;}});
 director.update(.01);assert(e.engineerBuilding);animateEnemy(e,1,false);assert.equal(g.userData.parts.engineerModel.pose.mode,'Deploy');
 director.update(2.5);animateEnemy(e,2,false);assert.equal(deployments,1);assert(e.engineerSpent);assert.equal(g.userData.parts.engineerModel.pose.mode,'Idle');
 director.update(30);assert.equal(deployments,1);director.clear();dispose(g);
});
test('repair and deployment take priority over locomotion; damage gets visual-only feedback',()=>{
 const e={type:'engineer',group:after,hp:90,charge:0,seed:0};animateEnemy(e,10,true);
 e.engineerBuilding=true;animateEnemy(e,10.1,true);assert.equal(after.userData.parts.engineerModel.pose.mode,'Deploy');
 e.engineerRepairing=true;animateEnemy(e,10.2,true);assert.equal(after.userData.parts.engineerModel.pose.mode,'Repair');
 e.engineerRepairing=e.engineerBuilding=false;e.hp=80;animateEnemy(e,10.3,false);animateEnemy(e,10.4,false);assert(after.userData.parts.engineerModel.pose.hit>0);
});
const v=createEngineerVisual(),clips=makeEngineerClips(v.root),metrics=engineerStats(v.root);
test('distinct support rig: 18 joints, six clips, finite geometry, <=12k triangles/90 mesh batches',()=>{
 assert.equal(Object.keys(v.rig.nodes).length,18);assert.deepEqual(clips.map(c=>c.name),ENGINEER_CLIPS);assert.equal(metrics.materials,7);assert(metrics.triangles<=12000&&metrics.triangles>7000);assert(metrics.meshes<=90);
 v.root.traverse(o=>{if(o.isMesh){assert([...o.geometry.attributes.position.array].every(Number.isFinite));assert(!o.geometry.attributes.uv);}});
});
const file=await readFile(new URL('./models/'+ENGINEER_ASSET.file,import.meta.url));
const manifest=JSON.parse(await readFile(new URL('./models/engineer-guard-e02.manifest.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('GLB2 integrity, no images/external buffers/skins, real six-node-animation clips',()=>{
 assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);assert.equal(sha(file),manifest.sha256);
 const data=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());assert.equal(data.animations.length,6);assert.equal((data.images||[]).length,0);assert.equal((data.skins||[]).length,0);assert(data.buffers.every(b=>!b.uri));
 assert.equal(manifest.version,ENGINEER_ASSET.version);assert(file.length<1600000);
});
for(const [p,h]of Object.entries(manifest.sourceHashes))assert.equal(sha(await readFile(new URL('./'+p,import.meta.url))),h,p+' provenance');
globalThis.ProgressEvent ||= class ProgressEvent{constructor(type,init){this.type=type;Object.assign(this,init);}};
const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
const template=gltf.scene.getObjectByName('E02_Visual');
test('GLB reload preserves articulated manipulator and Repair/Deploy animation tracks',()=>{
 const rig=bindEngineerRig(template);assert.deepEqual(engineerStats(template),metrics);assert.deepEqual(gltf.animations.map(c=>c.name),ENGINEER_CLIPS);
 const mixer=new T.AnimationMixer(template);mixer.clipAction(gltf.animations.find(c=>c.name==='Repair')).play();mixer.update(.2);assert(rig.nodes.AuxElbow.rotation.x<0);mixer.stopAllAction();mixer.uncacheRoot(template);
});
test('independent clones: disposing one preserves another and the existing role material',()=>{
 const roleA=new T.MeshStandardMaterial(),roleB=new T.MeshStandardMaterial(),a=cloneEngineerVisual(template,roleA),b=cloneEngineerVisual(template,roleB);
 let disposedB=0,disposedRole=0;b.root.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposedB++));b.materials.forEach(m=>m.addEventListener('dispose',()=>disposedB++));roleA.addEventListener('dispose',()=>disposedRole++);
 disposeEngineerVisual(a);assert.equal(disposedB,0);assert.equal(disposedRole,0);disposeEngineerVisual(b);roleA.dispose();roleB.dispose();
});
test('twenty spawn/dispose cycles keep owned-material lists unique and complete',()=>{
 for(let i=0;i<20;i++){const g=createEnemyModel('engineer',{loadEngineerAsset:false}),ms=g.userData.ownedMaterials;assert.equal(new Set(ms).size,ms.length);let disposed=0;ms.forEach(m=>m.addEventListener('dispose',()=>disposed++));dispose(g);assert.equal(disposed,ms.length);}
});
dispose(before);dispose(after);disposeEngineerVisual(v);console.log(JSON.stringify({passed,rayCount,metrics},null,2));

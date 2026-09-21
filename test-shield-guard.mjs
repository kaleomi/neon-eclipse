// B04-specific tests: real Three.js, real combat/EMP directors, isolated deterministic fixtures.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from './node_modules/three/build/three.module.js';
import {GLTFLoader} from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {createEnemyModel,animateEnemy} from './enemy-model.js';
import {ENEMY_TYPES,resolveEnemyDamage} from './enemy-rules.js';
import {EMP} from './emp-rules.js';
import {applyEmp,empVisual} from './emp-world.js';
import {createEmpSystem} from './emp-system.js';
import {createEnemyDirector} from './enemy-ai.js';
import {createEnemyProjectiles} from './projectiles.js';
import {SHIELD_ASSET,SHIELD_CLIPS,SHIELD_ANCHOR,SHIELD_CORE,createShieldVisual,bindShieldRig,
  poseShield,makeShieldClips,shieldStats,cloneShieldVisual,disposeShieldVisual} from './characters/shield-guard.js';
import {loadShieldAsset} from './characters/shield-guard-runtime.js';
let passed=0,rayCount=0;const test=(name,fn)=>{fn();passed++;console.log('PASS:',name);};
function dispose(g){const gs=new Set();g.traverse(o=>{if(o.geometry)gs.add(o.geometry);});gs.forEach(x=>x.dispose());new Set(g.userData.ownedMaterials||[]).forEach(m=>m.dispose());g.removeFromParent();}
const signature=g=>g.children.filter(o=>o.isMesh).map(o=>({zone:o.userData.hitZone,pos:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),visible:o.visible,vertices:[...o.geometry.attributes.position.array]}));
const displayed=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
const legacy=createEnemyModel('shield',{shieldSample:false}),current=createEnemyModel('shield',{loadShieldAsset:false});
test('same direct hit meshes, ownership, transform, visibility and original shield profile',()=>{
 assert.equal(current.name,legacy.name);assert.deepEqual(signature(current),signature(legacy));const p=current.userData.parts;
 assert.equal(p.shield,current.userData.partsShield);assert.equal(p.shield[0].parent,current);assert.equal(p.shieldModel.visual.rig.nodes.Shield.parent,p.shield[0]);
 assert.equal(Object.getOwnPropertyDescriptor(p.shield[0],'visible').get,undefined,'native visibility data property retained');
 assert.deepEqual([ENEMY_TYPES.shield.hp,ENEMY_TYPES.shield.hpPerLevel,ENEMY_TYPES.shield.speed,ENEMY_TYPES.shield.scale,ENEMY_TYPES.shield.radius,ENEMY_TYPES.shield.cooldown],[120,10,1.9,1.1,.8,2.8]);
 assert.deepEqual(ENEMY_TYPES.shield.attack,{color:'amber',charge:.8,speed:14,damage:8,angles:[-.08,.08],bursts:1});
 assert(current.children.filter(o=>o.isMesh).every(o=>o.visible&&!o.material.visible));assert(legacy.children.filter(o=>o.isMesh).every(o=>o.material.visible));
});
test('34,800 shield-on/off rays at 1.1 scale match legacy distances, zones and direct ownership',()=>{
 const cases=[{time:0},{time:.21,walking:true},{time:.48,charge:.8},{time:1.15,charge:.3},{time:1.4,walking:true},{time:2,hp:95}];
 for(const broken of [false,true])for(const spec of cases){
  for(const g of [legacy,current]){g.scale.setScalar(1.1);g.rotation.y=.19;const e={group:g,type:'shield',hp:130,seed:.3,charge:0,shieldDownRemaining:broken?6:0,...spec};empVisual(e,broken);animateEnemy(e,spec.time,!!spec.walking);if(spec.hp)animateEnemy(e,spec.time+.15,false);g.updateMatrixWorld(true);}
  for(let yi=0;yi<=28;yi++)for(let xi=-12;xi<=12;xi++)for(const [o,d]of [[[xi*.1,yi*.1,5],[0,0,-1]],[[xi*.1,yi*.1,-5],[0,0,1]],[[5,yi*.1,xi*.1],[-1,0,0]],[[-5,yi*.1,xi*.1],[1,0,0]]]){
   const ray=new T.Raycaster(new T.Vector3(...o),new T.Vector3(...d)),a=ray.intersectObjects(legacy.children,false)[0],b=ray.intersectObjects(current.children,false)[0];
   assert.equal(!!a,!!b);if(a){assert(Math.abs(a.distance-b.distance)<1e-8);assert.equal(a.object.userData.hitZone,b.object.userData.hitZone);assert.equal(b.object.parent,current);}rayCount++;
  }
 }
 assert.equal(rayCount,34800);
});
test('600 pose samples keep the rear core and projection at the exact original world anchors',()=>{
 const p=current.userData.parts,s=p.shieldModel,e={group:current,type:'shield',hp:130,charge:0,seed:.8};
 assert.deepEqual(s.visual.rig.core.position.toArray(),SHIELD_CORE);assert.deepEqual(p.shield[0].position.toArray(),SHIELD_ANCHOR);
 assert(s.visual.rig.core.children.some(o=>o.material===p.coreMaterial),'original pulsing weak-core material is bound');
 for(let i=0;i<600;i++){e.charge=i%3===1?.8:0;e.shieldDownRemaining=i%2?6:0;empVisual(e,!!e.shieldDownRemaining);animateEnemy(e,i/30,i%3===2);current.updateMatrixWorld(true);
  assert(s.visual.rig.core.getWorldPosition(new T.Vector3()).distanceTo(p.core.getWorldPosition(new T.Vector3()))<1e-10);
  assert(s.visual.rig.nodes.Shield.getWorldPosition(new T.Vector3()).distanceTo(p.shield[0].getWorldPosition(new T.Vector3()))<1e-10);
  assert.deepEqual(s.visual.rig.nodes.Shield.scale.toArray(),[1,1,1]);assert.equal(displayed(s.visual.rig.nodes.Shield),p.shield[0].visible);
 }
});
test('both split visual branches are decorative and cannot absorb recursive combat rays',()=>{
 const s=current.userData.parts.shieldModel,ray=new T.Raycaster(new T.Vector3(0,1.5,5),new T.Vector3(0,0,-1));
 assert.equal(ray.intersectObject(s.visual.root,true).length,0);assert.equal(ray.intersectObject(s.visual.rig.nodes.Shield,true).length,0);
});
test('all six previous upgrades and all remaining types keep their existing adapters and direct meshes',()=>{
 for(const type of Object.keys(ENEMY_TYPES).filter(t=>t!=='shield')){
  const flags={loadRangedAsset:false,loadGuardAsset:false,loadEngineerAsset:false,loadCommanderAsset:false,loadSniperAsset:false};const a=createEnemyModel(type,flags),b=createEnemyModel(type,{...flags,shieldSample:false});
  assert.deepEqual(signature(a),signature(b),type);assert(!a.userData.parts?.shieldModel);
  if(type==='ranged')assert(a.userData.parts.guard);if(['assault','heavy'].includes(type))assert(a.userData.parts.variantModel);if(type==='engineer')assert(a.userData.parts.engineerModel);if(type==='commander')assert(a.userData.parts.commanderModel);if(type==='sniper')assert(a.userData.parts.sniperModel);dispose(a);dispose(b);
 }
});
test('native frontal block, flank/rear body x1 and fixed rear core x2 survive shield break/recovery',()=>{
 const e={group:current,type:'shield',hp:130};current.rotation.y=0;const front={x:0,y:1.7,z:8},rear={x:0,y:1.7,z:-8},side={x:8,y:1.7,z:0};
 for(const broken of [false,true]){e.shieldDownRemaining=broken?6:0;assert.equal(resolveEnemyDamage(e,10,'armor',front).damage,broken?10:0);
  for(const attacker of [front,rear,side])assert.equal(resolveEnemyDamage(e,10,'core',attacker).damage,20);
  for(const attacker of [rear,side])assert.equal(resolveEnemyDamage(e,10,'body',attacker).damage,10);
 }
});
test('real EMP keeps pending amber attack, hides projection instantly, restores at 6s and never freezes carrier',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.position.set(0,1.7,15);const g=createEnemyModel('shield',{loadShieldAsset:false});g.scale.setScalar(1.1);scene.add(g);
 const e={group:g,type:'shield',hp:130,maxHp:130,speed:1.9,radius:.8,attack:0,charge:0,seed:0,boss:false},s=g.userData.parts.shieldModel;let emitted=0;
 const bolts=createEnemyProjectiles(scene,[],()=>{},()=>{},{onEmit:()=>emitted++});
 const ai=createEnemyDirector({enemies:[e],player:camera,obstacles:[],projectiles:bolts,navigation:{direction:()=>({x:0,z:1})},move:(p,x,z)=>{p.x+=x;p.z+=z;},onBossEvent:()=>{},squadEnabled:false});
 const emp=createEmpSystem({scene,camera,enemies:[e],obstacles:[],projectiles:bolts});scene.updateMatrixWorld(true);ai.update(0,0,0);assert.equal(bolts.charging,1);assert(Math.abs(e.charge-.85)<1e-9);
 assert.deepEqual(applyEmp(new T.Vector3(0,1.3,0),[e],[],bolts),[e]);assert.equal(e.shieldDownRemaining,6);assert.equal(e.hp,130);assert.equal(e.empRemaining,undefined);assert.equal(e.empBlocked,undefined);assert.equal(bolts.charging,1,'shield branch does not cancel pending warning');
 empVisual(e,true);assert(!displayed(s.visual.rig.nodes.Shield),'no animation tick needed to hide');assert(displayed(s.visual.root));
 let time=0;const tick=dt=>{time+=dt;emp.update(dt);ai.update(dt,time,999);bolts.update(dt,camera.position);};
 tick(.799);assert.equal(bolts.count,0);assert.equal(s.pose.mode,'Aim');tick(.002);assert.equal(bolts.count,2);assert.equal(emitted,1,'one volley emits two bolts');assert.equal(bolts.charging,0);
 const start=g.position.clone();tick(.051);assert(g.position.distanceTo(start)>0,'carrier resumes movement after ordinary attack pose ends while shield is still broken');assert.equal(s.pose.mode,'Patrol');assert(!displayed(s.visual.rig.nodes.Shield));assert(!e.empBlocked);
 emp.update(6-time-.001);assert(Math.abs(e.shieldDownRemaining-.001)<1e-8);assert(!displayed(s.visual.rig.nodes.Shield));emp.update(.002);
 assert.equal(e.shieldDownRemaining,0);assert(displayed(s.visual.rig.nodes.Shield),'no animation tick needed to recover');assert.deepEqual(s.visual.rig.nodes.Shield.scale.toArray(),[1,1,1]);assert(!g.userData.parts.shield[0].material.visible,'logical plate never draws over new shield');
 applyEmp(g.position.clone().add(new T.Vector3(0,1.3,0)),[e],[],bolts);empVisual(e,true);emp.clear();assert.equal(e.shieldDownRemaining,undefined);assert(displayed(s.visual.rig.nodes.Shield));ai.clear();bolts.clear();dispose(g);
});
test('real orange-bolt reflection still reaches logical proxies with shield on and off',()=>{
 for(const broken of [false,true]){
  const scene=new T.Scene(),g=createEnemyModel('shield',{loadShieldAsset:false});scene.add(g);const e={group:g,type:'shield',hp:130,shieldDownRemaining:broken?6:0};empVisual(e,broken);scene.updateMatrixWorld(true);let hits=0;
  const p=createEnemyProjectiles(scene,[],()=>{},()=>{},{tryParry:()=>true,getReflectTargets:()=>g.children,onReflectHit:h=>{assert.equal(h.object.parent,g);assert.equal(resolveEnemyDamage(e,10,h.object.userData.hitZone,{x:0,y:1.7,z:6}).damage,broken?10:0);hits++;}});
  const player=new T.Vector3(0,1.7,6);assert(p.queue(new T.Vector3(0,1.35,1),new T.Vector3(0,1.35,6),false,null,{color:'orange',charge:0,speed:10,damage:5,angles:[0],bursts:1}));p.update(0,player);p.update(.55,player);assert.equal(p.reflectedCount,1);p.update(.6,player);assert.equal(hits,1);assert.equal(p.reflectedCount,0);p.clear();dispose(g);
 }
});
test('charge, moving broken-shield and stationary exposed poses preserve native visibility authority',()=>{
 const e={group:current,type:'shield',hp:130,charge:.8,seed:0,shieldDownRemaining:6},s=current.userData.parts.shieldModel;empVisual(e,true);
 animateEnemy(e,10,true);assert.equal(s.pose.mode,'Aim');e.charge=0;animateEnemy(e,10.2,true);assert.equal(s.pose.mode,'Patrol');animateEnemy(e,10.4,false);assert.equal(s.pose.mode,'Exposed');assert.equal(s.visual.rig.nodes.Shield.scale.x,1);
 e.hp=120;animateEnemy(e,10.5,false);animateEnemy(e,10.65,false);assert(s.pose.hit>0);e.shieldDownRemaining=0;empVisual(e,false);animateEnemy(e,11,false);assert.equal(s.pose.mode,'Idle');
});
const v=createShieldVisual(),clips=makeShieldClips(v.root),metrics=shieldStats(v.root);
test('14 control nodes, five clips, finite geometry, <=10k triangles / 80 batches / eight PBR materials',()=>{
 assert.equal(Object.keys(v.rig.nodes).length,14);assert.deepEqual(clips.map(c=>c.name),SHIELD_CLIPS);assert.equal(metrics.materials,8);assert(metrics.triangles<=10000&&metrics.meshes<=80);
 v.root.traverse(o=>{if(o.isMesh){assert([...o.geometry.attributes.position.array].every(Number.isFinite));assert(!o.geometry.attributes.uv);}});
});
const file=await readFile(new URL('./models/'+SHIELD_ASSET.file,import.meta.url)),manifest=JSON.parse(await readFile(new URL('./models/shield-guard-b04.manifest.json',import.meta.url))),sha=b=>createHash('sha256').update(b).digest('hex');
test('GLB2 integrity/provenance: five clips, no skins, images, external buffers or image textures',()=>{
 assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);assert.equal(sha(file),manifest.sha256);
 const d=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());assert.equal(d.animations.length,5);assert.equal((d.images||[]).length,0);assert.equal((d.skins||[]).length,0);assert(d.buffers.every(b=>!b.uri));assert(file.length<1200000);
});
for(const [p,h]of Object.entries(manifest.sourceHashes))assert.equal(sha(await readFile(new URL('./'+p,import.meta.url))),h,p+' provenance');
globalThis.ProgressEvent ||= class ProgressEvent{constructor(type,init){this.type=type;Object.assign(this,init);}};
const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');const template=gltf.scene.getObjectByName('B04_Visual');
test('GLB roundtrip Exposed clip hides field; Idle restores it without moving fixed green core',()=>{
 const rig=bindShieldRig(template);assert.deepEqual(shieldStats(template),metrics);assert.deepEqual(gltf.animations.map(c=>c.name),SHIELD_CLIPS);
 const mixer=new T.AnimationMixer(template),a=mixer.clipAction(gltf.animations.find(c=>c.name==='Exposed'));a.play();mixer.update(.35);assert.equal(rig.nodes.Shield.scale.x,0);assert(rig.core.position.distanceTo(new T.Vector3(...SHIELD_CORE))<1e-6);
 a.stop();mixer.clipAction(gltf.animations.find(c=>c.name==='Idle')).play();mixer.update(.35);assert.equal(rig.nodes.Shield.scale.x,1);mixer.stopAllAction();mixer.uncacheRoot(template);
});
test('clone disposal preserves cached template, other clone and both bound role/core materials',()=>{
 const role=new T.MeshStandardMaterial(),core=new T.MeshStandardMaterial(),a=cloneShieldVisual(template,{accentMaterial:role,coreMaterial:core}),b=cloneShieldVisual(template);let invalid=0;
 for(const root of [template,b.root])root.traverse(o=>{o.geometry?.addEventListener('dispose',()=>invalid++);o.material?.addEventListener('dispose',()=>invalid++);});for(const m of [role,core])m.addEventListener('dispose',()=>invalid++);
 disposeShieldVisual(a);assert.equal(invalid,0);disposeShieldVisual(b);role.dispose();core.dispose();
});
test('20 native spawn/dispose cycles free both split geometry branches and each owned material exactly once',()=>{
 const reference=createEnemyModel('shield',{shieldSample:false});
 for(let i=0;i<20;i++){const g=createEnemyModel('shield',{loadShieldAsset:false}),ms=g.userData.ownedMaterials,gs=new Set();g.traverse(o=>{if(o.geometry)gs.add(o.geometry);});assert.equal(new Set(ms).size,ms.length);
  let mats=0,geos=0;ms.forEach(m=>m.addEventListener('dispose',()=>mats++));gs.forEach(x=>x.addEventListener('dispose',()=>geos++));dispose(g);assert.equal(mats,ms.length);assert.equal(geos,gs.size);assert(reference.children.filter(o=>o.isMesh).every(o=>o.material.visible));
 }dispose(reference);
});
// Exercise real asynchronous adapter with an in-memory fetch transport; no production code stubs.
{
 const nativeFetch=globalThis.fetch;let release,requests=0;const gate=new Promise(resolve=>release=resolve),scene=new T.Scene();
 globalThis.fetch=async request=>{assert(String(request.url||request).endsWith('/models/shield-guard-b04.glb'));requests++;await gate;return new Response(file,{status:200,headers:{'content-type':'model/gltf-binary','content-length':String(file.length)}});};
 try{
  const a=createEnemyModel('shield',{loadShieldAsset:true}),b=createEnemyModel('shield',{loadShieldAsset:true}),doomed=createEnemyModel('shield',{loadShieldAsset:true});scene.add(a,b,doomed);
  const e={group:a,type:'shield',hp:130,charge:0,seed:0,shieldDownRemaining:6};empVisual(e,true);animateEnemy(e,1,false);const s=a.userData.parts.shieldModel,old=s.visual,gs=new Set();for(const root of [old.root,old.rig.nodes.Shield])root.traverse(o=>{if(o.geometry)gs.add(o.geometry);});
  let released=0,owned=0,bound=0;gs.forEach(g=>g.addEventListener('dispose',()=>released++));old.materials.forEach(m=>m.addEventListener('dispose',()=>owned++));a.userData.parts.accent.addEventListener('dispose',()=>bound++);a.userData.parts.coreMaterial.addEventListener('dispose',()=>bound++);
  dispose(doomed);release();await loadShieldAsset();await new Promise(resolve=>setImmediate(resolve));
  test('async GLB replacement during EMP frees entire split fallback and shares one load, not instance resources',()=>{
   assert.equal(requests,1);assert.equal(a.userData.shieldModelSource,'glb');assert.equal(b.userData.shieldModelSource,'glb');assert.equal(released,gs.size);assert.equal(owned,old.materials.length);assert.equal(bound,0);assert.equal(old.root.parent,null);
   assert.equal(s.visual.rig.nodes.Shield.parent,a.userData.parts.shield[0]);assert(!displayed(s.visual.rig.nodes.Shield));assert.equal(s.visual.rig.nodes.Shield.scale.x,1);empVisual(e,false);assert(displayed(s.visual.rig.nodes.Shield));
   assert.equal(doomed.parent,null);assert.equal(doomed.userData.shieldModelSource,'procedural');assert.equal(new Set(a.userData.ownedMaterials).size,a.userData.ownedMaterials.length);
  });
  test('cached next spawn receives a GLB clone; removing sibling cannot dispose its geometry',()=>{
   const c=createEnemyModel('shield',{loadShieldAsset:true});scene.add(c);assert.equal(c.userData.shieldModelSource,'glb');let releasedSibling=0;c.traverse(o=>o.geometry?.addEventListener('dispose',()=>releasedSibling++));dispose(b);assert.equal(releasedSibling,0);assert.equal(requests,1);dispose(c);
  });dispose(a);
 }finally{globalThis.fetch=nativeFetch;}
}
dispose(legacy);dispose(current);disposeShieldVisual(v);console.log(JSON.stringify({passed,rayCount,anchorSamples:600,metrics},null,2));

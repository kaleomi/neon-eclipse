// S09 model + unchanged combat contracts; real Three.js and projectile implementation.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from './node_modules/three/build/three.module.js';
import {GLTFLoader} from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {createEnemyModel,animateEnemy} from './enemy-model.js';
import {ENEMY_TYPES} from './enemy-rules.js';
import {createEnemyDirector} from './enemy-ai.js';
import {createEnemyProjectiles} from './projectiles.js';
import {SNIPER_ASSET,SNIPER_CLIPS,SNIPER_ARM,SNIPER_GRIPS,createSniperVisual,bindSniperRig,
  poseSniper,makeSniperClips,sniperStats,cloneSniperVisual,disposeSniperVisual} from './characters/sniper-guard.js';
let passed=0,rayCount=0;const test=(name,fn)=>{fn();passed++;console.log('PASS:',name);};
function dispose(g){const gs=new Set();g.traverse(o=>{if(o.geometry)gs.add(o.geometry);});gs.forEach(x=>x.dispose());new Set(g.userData.ownedMaterials||[]).forEach(m=>m.dispose());g.removeFromParent();}
const signature=g=>g.children.filter(o=>o.isMesh).map(o=>({zone:o.userData.hitZone,pos:o.position.toArray(),rotation:o.rotation.toArray(),visible:o.visible,vertices:[...o.geometry.attributes.position.array]}));
const legacy=createEnemyModel('sniper',{sniperSample:false}),current=createEnemyModel('sniper',{loadSniperAsset:false});
test('same legacy meshes, transforms, zones, visibility and 58HP/1.6s/62m sniper profile',()=>{
 assert.equal(current.name,legacy.name);assert.deepEqual(signature(current),signature(legacy));assert.equal(ENEMY_TYPES.sniper.hp,58);assert.equal(ENEMY_TYPES.sniper.attack.charge,1.6);assert.equal(ENEMY_TYPES.sniper.range,62);
 assert(current.children.filter(o=>o.isMesh).every(o=>o.userData.sniperProxy&&o.visible&&!o.material.visible));
});
test('17,400 rays at real 1.02 scale preserve root ownership, distances and head/body zones',()=>{
 const cases=[{time:0},{time:.21,walking:true},{time:.48,charge:1.6},{time:1.15,charge:.5},{time:1.4,walking:true},{time:2,hp:40}];
 for(const spec of cases){
  for(const g of [legacy,current]){g.scale.setScalar(1.02);g.rotation.y=.19;const e={group:g,type:'sniper',hp:64,seed:.3,charge:0,...spec};animateEnemy(e,spec.time,!!spec.walking);if(spec.hp)animateEnemy(e,spec.time+.15,false);g.updateMatrixWorld(true);}
  for(let yi=0;yi<=28;yi++)for(let xi=-12;xi<=12;xi++)for(const [o,d]of [[[xi*.1,yi*.1,5],[0,0,-1]],[[xi*.1,yi*.1,-5],[0,0,1]],[[5,yi*.1,xi*.1],[-1,0,0]],[[-5,yi*.1,xi*.1],[1,0,0]]]){
   const ray=new T.Raycaster(new T.Vector3(...o),new T.Vector3(...d)),a=ray.intersectObjects(legacy.children,false)[0],b=ray.intersectObjects(current.children,false)[0];
   assert.equal(!!a,!!b);if(a){assert(Math.abs(a.distance-b.distance)<1e-8);assert.equal(a.object.userData.hitZone,b.object.userData.hitZone);assert.equal(b.object.parent,current);}rayCount++;
  }
 }
 assert.equal(rayCount,17400);assert(current.userData.parts.sniperModel.pose.hit>0);
});
test('decorative long rifle, scope and armor cannot intercept combat rays',()=>{
 const root=current.userData.parts.sniperModel.visual.root;root.updateWorldMatrix(true,true);
 assert.equal(new T.Raycaster(new T.Vector3(0,1.94,5),new T.Vector3(0,0,-1)).intersectObject(root,true).length,0);
});
test('other five upgraded roles and all remaining types keep their existing adapters',()=>{
 for(const type of Object.keys(ENEMY_TYPES).filter(t=>t!=='sniper')){
  const flags={loadRangedAsset:false,loadGuardAsset:false,loadEngineerAsset:false,loadCommanderAsset:false};const a=createEnemyModel(type,flags),b=createEnemyModel(type,{...flags,sniperSample:false});
  assert.deepEqual(signature(a),signature(b),type);assert(!a.userData.parts?.sniperModel);
  if(type==='ranged')assert(a.userData.parts.guard);if(['assault','heavy'].includes(type))assert(a.userData.parts.variantModel);if(type==='engineer')assert(a.userData.parts.engineerModel);if(type==='commander')assert(a.userData.parts.commanderModel);dispose(a);dispose(b);
 }
});
test('real orange-bolt parry can still hit S09 logical proxies despite invisible draw materials',()=>{
 const scene=new T.Scene(),g=createEnemyModel('sniper',{loadSniperAsset:false});scene.add(g);scene.updateMatrixWorld(true);let hits=0;
 const p=createEnemyProjectiles(scene,[],()=>{},()=>{},{tryParry:()=>true,getReflectTargets:()=>g.children,onReflectHit:h=>{assert.equal(h.object.parent,g);hits++;}});
 const player=new T.Vector3(0,1.7,6);assert(p.queue(new T.Vector3(0,1.35,1),new T.Vector3(0,1.35,6),false,null,{color:'orange',charge:0,speed:10,damage:5,angles:[0],bursts:1}));
 p.update(0,player);p.update(.55,player);assert.equal(p.reflectedCount,1);p.update(.6,player);assert.equal(hits,1);assert.equal(p.reflectedCount,0);p.clear();dispose(g);
});
test('actual sniper AI/projectiles retain full 1.6s purple warning and captured old aim point',()=>{
 const scene=new T.Scene(),player=new T.PerspectiveCamera();player.position.set(0,1.7,28);
 const g=createEnemyModel('sniper',{loadSniperAsset:false});scene.add(g);g.scale.setScalar(1.02);
 const e={type:'sniper',group:g,hp:64,maxHp:64,speed:0,radius:.65,attack:0,charge:0,seed:0,boss:false};const obstacles=[];let emitted=0;
 const p=createEnemyProjectiles(scene,obstacles,()=>{},()=>{},{onEmit:()=>emitted++});
 const director=createEnemyDirector({enemies:[e],player,obstacles,projectiles:p,navigation:{direction:()=>({x:0,z:1})},move(){},onBossEvent(){},squadEnabled:false});
 scene.updateMatrixWorld(true);director.update(0,0,0);assert(Math.abs(e.charge-1.65)<1e-9);assert.equal(p.charging,1);assert.equal(g.userData.parts.sniperModel.pose.mode,'Aim');
 const target=p.aimTarget(g);assert.equal(target.z,28);const line=scene.children.find(o=>o.isLine&&!o.isLineLoop);assert(line);assert.equal(line.material.color.getHex(),0xbc7cff);
 player.position.x=5;director.update(.8,.8,999);p.update(.8,player.position);assert(Math.abs(e.charge-.85)<1e-9);assert.equal(p.count,0);assert(p.aimTarget(g).equals(target));assert.equal(line.geometry.attributes.position.getX(1),0);
 director.update(.799,1.599,999);p.update(.799,player.position);assert.equal(p.count,0);assert.equal(emitted,0);
 director.update(.002,1.601,999);p.update(.002,player.position);assert.equal(emitted,1);assert.equal(p.count,1);assert.equal(p.charging,0);assert(!line.parent);assert.equal(g.userData.parts.sniperModel.pose.mode,'Aim');
 director.update(.051,1.652,999);p.update(.051,player.position);assert.equal(g.userData.parts.sniperModel.pose.mode,'Idle');
 p.clear();e.charge=0;e.attack=0;player.position.x=0;
 const wall=new T.Mesh(new T.BoxGeometry(6,4,.3),new T.MeshBasicMaterial());wall.position.set(0,2,14);scene.add(wall);wall.updateWorldMatrix(true,false);obstacles.push({mesh:wall,x:0,z:14,w:6,h:4,d:.3});
 director.update(0,2,0);assert.equal(p.charging,0,'true wall blocks starting another warning');
 obstacles.length=0;director.update(0,2,0);assert.equal(p.charging,1);scene.remove(g);p.update(.1,player.position);assert.equal(p.charging,0,'removed owner cancels its warning');
 director.clear();p.clear();wall.geometry.dispose();wall.material.dispose();dispose(g);
});
const v=createSniperVisual(),clips=makeSniperClips(v.root),metrics=sniperStats(v.root);
function gripError(rig){rig.root.updateMatrixWorld(true);let result=0;for(const q of ['R','L']){const a=rig.nodes['Forearm_'+q].localToWorld(new T.Vector3(0,-SNIPER_ARM.lower,0)),b=rig.nodes.Weapon.localToWorld(new T.Vector3(...SNIPER_GRIPS[q]));result=Math.max(result,a.distanceTo(b));}return result;}
test('both hands remain on rifle grips across 720 idle/patrol/aim and hit-overlay samples',()=>{
 let max=0;for(const mode of ['Idle','Patrol','Aim'])for(let i=0;i<240;i++){poseSniper(v.rig,{time:i/30,mode,hit:i<20?Math.sin(i/20*Math.PI)*.45:0});max=Math.max(max,gripError(v.rig));}assert(max<1e-6,String(max));
});
test('charge overrides walking without touching logical hit-proxy transforms',()=>{
 const e={type:'sniper',group:current,hp:64,charge:1,seed:0};animateEnemy(e,4,true);assert.equal(current.userData.parts.sniperModel.pose.mode,'Aim');
 e.charge=0;animateEnemy(e,4.2,true);assert.equal(current.userData.parts.sniperModel.pose.mode,'Patrol');animateEnemy(e,4.4,false);assert.equal(current.userData.parts.sniperModel.pose.mode,'Idle');
});
test('15 joints, four clips, finite geometry, <=10k triangles / 75 batches / six materials',()=>{
 assert.equal(Object.keys(v.rig.nodes).length,15);assert.deepEqual(clips.map(c=>c.name),SNIPER_CLIPS);assert.equal(metrics.materials,6);assert(metrics.triangles<=10000&&metrics.meshes<=75);
 v.root.traverse(o=>{if(o.isMesh){assert([...o.geometry.attributes.position.array].every(Number.isFinite));assert(!o.geometry.attributes.uv);}});
});
const file=await readFile(new URL('./models/'+SNIPER_ASSET.file,import.meta.url)),manifest=JSON.parse(await readFile(new URL('./models/sniper-guard-s09.manifest.json',import.meta.url))),sha=b=>createHash('sha256').update(b).digest('hex');
test('GLB2 byte integrity, four animation clips, no image/skin/external buffer dependencies',()=>{
 assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);assert.equal(sha(file),manifest.sha256);
 const d=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());assert.equal(d.animations.length,4);assert.equal((d.images||[]).length,0);assert.equal((d.skins||[]).length,0);assert(d.buffers.every(b=>!b.uri));assert(file.length<1200000);
});
for(const [p,h]of Object.entries(manifest.sourceHashes))assert.equal(sha(await readFile(new URL('./'+p,import.meta.url))),h,p+' provenance');
globalThis.ProgressEvent ||= class ProgressEvent{constructor(type,init){this.type=type;Object.assign(this,init);}};
const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');const template=gltf.scene.getObjectByName('S09_Visual');
test('reloaded Aim clip retains head/weapon translations and both hand contacts',()=>{
 const rig=bindSniperRig(template);assert.deepEqual(sniperStats(template),metrics);assert.deepEqual(gltf.animations.map(c=>c.name),SNIPER_CLIPS);
 const mixer=new T.AnimationMixer(template);mixer.clipAction(gltf.animations.find(c=>c.name==='Aim')).play();mixer.update(.3);assert(Math.abs(rig.nodes.Weapon.position.y-.455)<1e-6);assert(gripError(rig)<.002);mixer.stopAllAction();mixer.uncacheRoot(template);
});
test('clone disposal cannot release another instance, cached template or role material',()=>{
 const role=new T.MeshStandardMaterial(),a=cloneSniperVisual(template,role),b=cloneSniperVisual(template);let invalid=0;
 for(const g of [template,b.root])g.traverse(o=>{o.geometry?.addEventListener('dispose',()=>invalid++);o.material?.addEventListener('dispose',()=>invalid++);});role.addEventListener('dispose',()=>invalid++);
 disposeSniperVisual(a);assert.equal(invalid,0);disposeSniperVisual(b);role.dispose();
});
test('20 spawn/dispose cycles own invisible proxy materials exactly once; shared legacy materials untouched',()=>{
 const reference=createEnemyModel('sniper',{sniperSample:false});
 for(let i=0;i<20;i++){const g=createEnemyModel('sniper',{loadSniperAsset:false}),ms=g.userData.ownedMaterials;assert.equal(new Set(ms).size,ms.length);let count=0;ms.forEach(m=>m.addEventListener('dispose',()=>count++));dispose(g);assert.equal(count,ms.length);assert(reference.children.filter(o=>o.isMesh).every(o=>o.material.visible));}dispose(reference);
});
dispose(legacy);dispose(current);disposeSniperVisual(v);console.log(JSON.stringify({passed,rayCount,metrics},null,2));

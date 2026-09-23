// C01 visual/command contract acceptance. Real Three.js, no browser or player saves.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {createEnemyModel,animateEnemy} from '../src/enemy-model.js';
import {ENEMY_TYPES} from '../src/enemy-rules.js';
import {createEnemyDirector} from '../src/enemy-ai.js';
import {createEnemyProjectiles} from '../src/projectiles.js';
import {COMMANDER,refreshCommanderSupport,commandedCooldownRate,clearCommanderSupport} from '../src/commander-rules.js';
import {COMMANDER_ASSET,COMMANDER_CLIPS,createCommanderVisual,bindCommanderRig,makeCommanderClips,
  commanderStats,cloneCommanderVisual,disposeCommanderVisual} from '../characters/commander-guard.js';
let passed=0,rayCount=0;const test=(name,fn)=>{fn();passed++;console.log('PASS:',name);};
function dispose(g){const geos=new Set();g.traverse(o=>{if(o.geometry)geos.add(o.geometry);});geos.forEach(x=>x.dispose());new Set(g.userData.ownedMaterials||[]).forEach(m=>m.dispose());g.removeFromParent();}
const signature=g=>g.children.filter(o=>o.isMesh).map(o=>({zone:o.userData.hitZone,pos:o.position.toArray(),rotation:o.rotation.toArray(),vertices:[...o.geometry.attributes.position.array]}));
const legacy=createEnemyModel('commander',{commanderSample:false}),current=createEnemyModel('commander',{loadCommanderAsset:false});
test('same TACTICAL_COMMANDER identity, legacy direct hit proxies and 110HP profile',()=>{
 assert.equal(current.name,'TACTICAL_COMMANDER');assert.deepEqual(signature(current),signature(legacy));assert.equal(ENEMY_TYPES.commander.hp,110);
 assert(current.children.filter(o=>o.isMesh).every(o=>o.visible&&!o.material.visible&&o.userData.commanderProxy));
});
test('original 12m non-hittable world-space command ring remains outside visual rig',()=>{
 const a=current.userData.commandRing,b=legacy.userData.commandRing;assert.equal(a.parent,current);assert(a.visible);
 assert.deepEqual([...a.geometry.attributes.position.array],[...b.geometry.attributes.position.array]);assert.equal(COMMANDER.radius,12);
 const hits=[];a.raycast(null,hits);assert.equal(hits.length,0);assert(!current.userData.parts.commanderModel.visual.root.getObjectById(a.id));
});
test('17,400 front/rear/side rays retain zone, distance and direct ownership in six animation cases',()=>{
 const cases=[{time:0},{time:.23,walking:true},{time:.51,charge:1},{time:.72,commanderRecipients:3},{time:1.2,walking:true,commanderRecipients:2},{time:2,hp:90}];
 for(const spec of cases){
  for(const g of [legacy,current]){const e={group:g,type:'commander',hp:110,charge:0,seed:.2,commanderRecipients:0,...spec};animateEnemy(e,spec.time,!!spec.walking);if(spec.hp)animateEnemy(e,spec.time+.15,false);g.updateMatrixWorld(true);}
  for(let yi=0;yi<=28;yi++)for(let xi=-12;xi<=12;xi++)for(const [o,d]of [
   [[xi*.1,yi*.1,5],[0,0,-1]],[[xi*.1,yi*.1,-5],[0,0,1]],[[5,yi*.1,xi*.1],[-1,0,0]],[[-5,yi*.1,xi*.1],[1,0,0]]]){
   const ray=new T.Raycaster(new T.Vector3(...o),new T.Vector3(...d));
   const a=ray.intersectObjects(legacy.children,false)[0],b=ray.intersectObjects(current.children,false)[0];
   assert.equal(!!a,!!b);if(a){assert(Math.abs(a.distance-b.distance)<1e-8);assert.equal(a.object.userData.hitZone,b.object.userData.hitZone);assert.equal(b.object.parent,current);}rayCount++;
  }
 }
 assert.equal(rayCount,17400);assert(current.userData.parts.commanderModel.pose.hit>0);
});
test('visible armor, terminal and mantle do not intercept recursive combat rays',()=>{
 const v=current.userData.parts.commanderModel.visual.root;v.updateWorldMatrix(true,true);
 assert.equal(new T.Raycaster(new T.Vector3(0,1.94,5),new T.Vector3(0,0,-1)).intersectObject(v,true).length,0);
});
test('R07/A03/H12/E02 and all other roles retain their existing geometry and adapters',()=>{
 for(const type of Object.keys(ENEMY_TYPES).filter(t=>t!=='commander')){
  const flags={loadRangedAsset:false,loadGuardAsset:false,loadEngineerAsset:false};
  const a=createEnemyModel(type,flags),b=createEnemyModel(type,{...flags,commanderSample:false});assert.deepEqual(signature(a),signature(b),type);assert(!a.userData.parts?.commanderModel);
  if(type==='ranged')assert(a.userData.parts.guard);if(['assault','heavy'].includes(type))assert(a.userData.parts.variantModel);if(type==='engineer')assert(a.userData.parts.engineerModel);dispose(a);dispose(b);
 }
});
test('real AI keeps cooldown-only 1.25x support, original warning timing, real wall and death cancellation',()=>{
 const scene=new T.Scene(),player=new T.PerspectiveCamera();player.position.set(0,1.7,20);
 const make=(type,z)=>{const group=createEnemyModel(type,{loadCommanderAsset:false,loadGuardAsset:false});group.position.z=z;scene.add(group);return {type,group,hp:110,maxHp:110,boss:false,speed:0,radius:.65,attack:10,charge:type==='commander'?0:.8,seed:0};};
 const leader=make('commander',0),ally=make('assault',-5),enemies=[leader,ally],obstacles=[];
 const projectiles=createEnemyProjectiles(scene,obstacles,()=>{},()=>{},{maxAttackers:3});
 const director=createEnemyDirector({enemies,player,obstacles,projectiles,navigation:{direction:()=>({x:0,z:0})},move(){},onBossEvent(){}});
 scene.updateMatrixWorld(true);director.update(.4,.4,999);assert.equal(ally.commanderSource,leader);assert.equal(ally.attack,9.5);assert.equal(ally.charge,.4);
 assert.equal(commandedCooldownRate(ally),1.25);assert.equal(leader.group.userData.parts.commanderModel.pose.mode,'Command');
 const wall=new T.Mesh(new T.BoxGeometry(6,4,.2),new T.MeshBasicMaterial());wall.position.set(0,2,-2);scene.add(wall);wall.updateWorldMatrix(true,false);obstacles.push({mesh:wall});
 director.update(0,1,999);assert.equal(ally.commanderSource,null);assert.equal(leader.group.userData.parts.commanderModel.pose.mode,'Idle');assert.equal(leader.group.userData.commandRing.material.opacity,.06);
 obstacles.length=0;director.update(0,1.1,999);assert.equal(ally.commanderSource,leader);leader.hp=0;director.update(0,1.2,999);assert.equal(ally.commanderSource,null);
 director.clear();projectiles.clear();wall.geometry.dispose();wall.material.dispose();dispose(leader.group);dispose(ally.group);
});
test('range/layer/EMP/nearest-source/non-stacking semantics do not derive from visual dimensions',()=>{
 const a={type:'commander',group:current,hp:110},b={type:'commander',group:legacy,hp:110},target={type:'assault',group:new T.Group(),hp:90};
 current.position.set(0,0,0);legacy.position.set(5,0,0);target.group.position.set(1,0,0);const list=[a,b,target];
 refreshCommanderSupport(list,()=>true);assert.equal(target.commanderSource,a);assert.equal(commandedCooldownRate(target),1.25);
 target.group.position.y=1.21;refreshCommanderSupport(list,()=>true);assert.equal(target.commanderSource,null);
 target.group.position.set(30,0,0);refreshCommanderSupport(list,()=>true);assert.equal(target.commanderSource,null);
 target.group.position.set(1,0,0);a.empBlocked=true;refreshCommanderSupport(list,()=>true);assert.equal(target.commanderSource,b);
 clearCommanderSupport(list);assert.equal(target.commanderSource,null);current.position.set(0,0,0);legacy.position.set(0,0,0);
});
test('charge overrides command gesture; moving support keeps gait; leaving support folds terminal',()=>{
 const e={type:'commander',group:current,hp:110,charge:0,seed:0,commanderRecipients:3},s=current.userData.parts.commanderModel;
 animateEnemy(e,10,false);assert.equal(s.pose.mode,'Command');assert.equal(s.visual.rig.nodes.Terminal.rotation.x,.42);
 animateEnemy(e,10.2,true);assert.equal(s.pose.mode,'Patrol');assert(s.pose.broadcast);
 e.charge=1;animateEnemy(e,10.3,true);assert.equal(s.pose.mode,'Aim');assert.equal(s.visual.rig.nodes.Terminal.rotation.x,0);
 e.charge=0;e.commanderRecipients=0;animateEnemy(e,10.4,false);assert.equal(s.pose.mode,'Idle');
});
const v=createCommanderVisual(),clips=makeCommanderClips(v.root),metrics=commanderStats(v.root);
test('18 joints including four rigid mantle leaves and terminal; five clips, <=10k triangles/80 meshes',()=>{
 assert.equal(Object.keys(v.rig.nodes).length,18);assert.deepEqual(clips.map(c=>c.name),COMMANDER_CLIPS);assert.equal(metrics.materials,7);assert(metrics.triangles<=10000&&metrics.meshes<=80);
 v.root.traverse(o=>{if(o.isMesh){assert([...o.geometry.attributes.position.array].every(Number.isFinite));assert(!o.geometry.attributes.uv);}});
});
const file=await readFile(new URL('../models/'+COMMANDER_ASSET.file,import.meta.url)),manifest=JSON.parse(await readFile(new URL('../models/commander-guard-c01.manifest.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('GLB2 integrity, five clips, no skins/images/external resources',()=>{
 assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);assert.equal(sha(file),manifest.sha256);
 const data=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());assert.equal(data.animations.length,5);assert.equal((data.images||[]).length,0);assert.equal((data.skins||[]).length,0);assert(data.buffers.every(b=>!b.uri));assert(file.length<1300000);
});
for(const [p,h]of Object.entries(manifest.sourceHashes))assert.equal(sha(await readFile(new URL('../'+p,import.meta.url))),h,p+' provenance');
globalThis.ProgressEvent ||= class ProgressEvent{constructor(type,init){this.type=type;Object.assign(this,init);}};
const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');const template=gltf.scene.getObjectByName('C01_Visual');
test('GLB round trip and embedded Command clip open the actual hinged terminal',()=>{
 const rig=bindCommanderRig(template);assert.deepEqual(commanderStats(template),metrics);assert.deepEqual(gltf.animations.map(c=>c.name),COMMANDER_CLIPS);
 const mixer=new T.AnimationMixer(template);mixer.clipAction(gltf.animations.find(c=>c.name==='Command')).play();mixer.update(.3);assert(Math.abs(rig.nodes.Terminal.rotation.x-.42)<1e-6);mixer.stopAllAction();mixer.uncacheRoot(template);
});
test('clone disposal preserves other instances, cached template and bound role material',()=>{
 const role=new T.MeshStandardMaterial(),a=cloneCommanderVisual(template,role),b=cloneCommanderVisual(template);let wrong=0;
 for(const g of [template,b.root])g.traverse(o=>{o.geometry?.addEventListener('dispose',()=>wrong++);o.material?.addEventListener('dispose',()=>wrong++);});role.addEventListener('dispose',()=>wrong++);
 disposeCommanderVisual(a);assert.equal(wrong,0);disposeCommanderVisual(b);role.dispose();
});
test('20 spawn/dispose cycles own each material once, including original ring material',()=>{
 for(let i=0;i<20;i++){const g=createEnemyModel('commander',{loadCommanderAsset:false}),ms=g.userData.ownedMaterials;assert.equal(new Set(ms).size,ms.length);assert(ms.includes(g.userData.commandRing.material));let count=0;ms.forEach(m=>m.addEventListener('dispose',()=>count++));dispose(g);assert.equal(count,ms.length);}
});
dispose(legacy);dispose(current);disposeCommanderVisual(v);console.log(JSON.stringify({passed,rayCount,metrics},null,2));

import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {createEnemyModel,animateEnemy} from '../src/enemy-model.js';
import {ENEMY_TYPES,createBossState,resolveEnemyDamage} from '../src/enemy-rules.js';
import {createEnemyProjectiles} from '../src/projectiles.js';
import {updateSentryFan} from '../src/sentry-model.js';
import {ROSTER_UNITS,createRosterUnit,poseRosterUnit} from '../characters/roster-units.js';
import {ARENA_BOSS_ASSETS,createArenaBossVisual,poseArenaBoss} from '../characters/arena-boss-models.js';
import {stats,bindArt,cloneArt,disposeArt} from '../characters/art-kit.js';
let passed=0,rays=0;const checks=[];const test=(name,fn)=>{fn();checks.push(name);passed++;console.log('PASS',name);};
const off={rangedSample:false,guardBatch:false,engineerSample:false,commanderSample:false,sniperSample:false,shieldSample:false,rosterSample:false};
const offline={loadRangedAsset:false,loadGuardAsset:false,loadEngineerAsset:false,loadCommanderAsset:false,loadSniperAsset:false,loadShieldAsset:false,loadRosterAsset:false};
function dispose(g){const gs=new Set();g.traverse(o=>{if(o.geometry)gs.add(o.geometry);});gs.forEach(x=>x.dispose());new Set(g.userData.ownedMaterials||[]).forEach(m=>m.dispose());g.removeFromParent();}
const sig=g=>g.children.filter(o=>o.isMesh&&!o.userData.combatDecoration).map(o=>({zone:o.userData.hitZone,p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray(),visible:o.visible,positions:[...o.geometry.attributes.position.array],index:o.geometry.index?[...o.geometry.index.array]:null}));
const actor=(type,g,extra={})=>({type,group:g,hp:110,maxHp:110,seed:.4,charge:0,boss:type==='warden',bossState:{...createBossState(),openRemaining:0},eliteState:{ventRemaining:0},artillery:{exposed:0},...extra});
for(const type of Object.keys(ENEMY_TYPES)){
 const old=createEnemyModel(type,off),now=createEnemyModel(type,offline);
 test(type+': same direct hit geometry, original visibility and all authoritative parts',()=>{assert.deepEqual(sig(now),sig(old));if(ROSTER_UNITS[type])assert(now.userData.parts.rosterModel);});
 test(type+': full front/back/side ray parity at native scale across four combat states',()=>{
  for(const [i,p]of [{t:0},{t:.23,walk:true},{t:.74,charge:1},{t:1.1,open:true}].entries()){
   for(const g of [old,now]){g.scale.setScalar(ENEMY_TYPES[type].scale);const e=actor(type,g,{charge:p.charge||0,rusherBlink:p.open?1:0,shieldDownRemaining:p.open?1:0});e.bossState.openRemaining=p.open?1:0;e.eliteState.ventRemaining=p.open?1:0;e.artillery.exposed=p.open?1:0;
    g.userData.parts.shield?.forEach(m=>m.visible=!p.open);animateEnemy(e,p.t,!!p.walk, i===3?30:5);if(type==='sentry')updateSentryFan(e,[]);g.updateMatrixWorld(true);}
   assert.deepEqual(sig(now),sig(old));
   for(let y=0;y<=28;y++)for(let x=-10;x<=10;x++)for(const [o,d]of [[[x*.13,y*.16,6],[0,0,-1]],[[x*.13,y*.16,-6],[0,0,1]],[[6,y*.16,x*.13],[-1,0,0]],[[-6,y*.16,x*.13],[1,0,0]]]){
    const r=new T.Raycaster(new T.Vector3(...o),new T.Vector3(...d)),a=r.intersectObjects(old.children,false)[0],b=r.intersectObjects(now.children,false)[0];assert.equal(!!a,!!b,type);if(a){assert(Math.abs(a.distance-b.distance)<1e-7,type);assert.equal(a.object.userData.hitZone,b.object.userData.hitZone);assert.equal(b.object.parent,now);}rays++;
   }
  }
 });dispose(old);dispose(now);
}
for(const type of Object.keys(ENEMY_TYPES))test(type+': real orange reflected projectile still contacts native target geometry',()=>{
 const scene=new T.Scene(),g=createEnemyModel(type,offline);scene.add(g);if(type==='swarmDrone')g.position.y=1.3;g.updateMatrixWorld(true);
 const body=g.children.find(o=>o.isMesh&&o.userData.hitZone==='body'&&!o.userData.combatDecoration);assert(body,type);const center=body.getWorldPosition(new T.Vector3());let contacts=0;
 const p=createEnemyProjectiles(scene,[],()=>{},()=>{},{tryParry:()=>true,getReflectTargets:()=>g.children,onReflectHit:h=>{assert.equal(h.object.parent,g);assert(h.object.isMesh&&!h.object.userData.combatDecoration&&Number.isFinite(h.distance));contacts++;}});
 const player=new T.Vector3(center.x,center.y+.35,7);assert(p.queue(new T.Vector3(center.x,center.y,2),new T.Vector3(center.x,center.y,7),false,null,{color:'orange',charge:0,speed:10,angles:[0],bursts:1}));
 p.update(0,player);p.update(.55,player);assert.equal(p.reflectedCount,1,type);p.update(.75,player);assert.equal(contacts,1,type);p.clear();dispose(g);
});
test('new weak cores retain native visible objects; artillery hatch follows native visibility; stalker fade and rusher warning remain driven by old state',()=>{
 for(const type of ['harborElite','artilleryMech','warden','sentry']){const g=createEnemyModel(type,offline),p=g.userData.parts,v=p.rosterModel.visual;assert(p.core.visible&&p.core.material.visible);assert(!v.rig.nodes.Core.visible);
  const e=actor(type,g,{charge:0});e.eliteState.ventRemaining=1;e.artillery.exposed=1;e.bossState.openRemaining=1;animateEnemy(e,1,false,10);
  if(type==='artilleryMech'){assert.equal(g.userData.artilleryHatch.visible,false);assert.equal(v.rig.nodes.Hatch.parent,g.userData.artilleryHatch);assert.deepEqual(v.rig.nodes.Hatch.position.toArray(),[0,0,0]);}
  dispose(g);
 }
 const s=createEnemyModel('stalker',offline),e=actor('stalker',s);animateEnemy(e,0,false,30);for(const m of Object.values(s.userData.parts.rosterModel.visual.rig.materials))assert.equal(m.opacity,.08);e.charge=1;animateEnemy(e,.1,false,30);for(const m of Object.values(s.userData.parts.rosterModel.visual.rig.materials))assert.equal(m.opacity,1);dispose(s);
 const r=createEnemyModel('rusher',offline);animateEnemy(actor('rusher',r,{rusherBlink:.9}),.13,true);assert.equal(r.userData.parts.rosterModel.visual.rig.materials.Signal.emissiveIntensity,r.userData.rusherDome.material.emissiveIntensity);dispose(r);
});
test('no new collision or weakpoint multipliers: native harbor/warden/sentry rules remain authoritative',()=>{
 for(const type of ['harborElite','warden','sentry']){const a=createEnemyModel(type,off),b=createEnemyModel(type,offline),ea=actor(type,a),eb=actor(type,b);for(const open of [false,true]){ea.bossState.openRemaining=eb.bossState.openRemaining=open?1:0;ea.eliteState.ventRemaining=eb.eliteState.ventRemaining=open?1:0;for(const zone of ['head','body','core','armor'])assert.deepEqual(resolveEnemyDamage(ea,10,zone,new T.Vector3(0,1,5)),resolveEnemyDamage(eb,10,zone,new T.Vector3(0,1,5)));}dispose(a);dispose(b);}
});
const registry=JSON.parse(await readFile(new URL('../models/enemy-roster.manifest.json',import.meta.url)));assert.equal(registry.total,24);assert.equal(new Set(registry.assets.map(a=>a.role)).size,24);assert.equal(registry.assets.filter(a=>a.category==='boss').length,9);
globalThis.ProgressEvent ||= class ProgressEvent{constructor(type,init){this.type=type;Object.assign(this,init);}};
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const entry of registry.assets){const binary=await readFile(new URL('../models/'+entry.asset,import.meta.url));assert.equal(sha(binary),entry.sha256,entry.role);assert.equal(binary.readUInt32LE(8),binary.length);
 const data=JSON.parse(binary.subarray(20,20+binary.readUInt32LE(12)).toString());assert(!data.buffers.some(b=>b.uri));assert.equal((data.images||[]).length,0);
 const gltf=await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.length),'');const template=gltf.scene.getObjectByName(entry.id+'_Visual');assert(template,entry.role);assert.equal(gltf.animations.length,entry.animations.length);
 test(entry.role+': exact GLB integrity, complete rig, self-contained resources and real animation tracks',()=>{
  assert.equal(stats(template).triangles,entry.triangles);assert(entry.triangles<16000&&entry.meshes<130);template.traverse(o=>{if(o.isMesh)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});
  if(entry.newInBatch){const rig=bindArt(template);assert.equal(Object.keys(rig.nodes).length,entry.articulatedNodes);const mixer=new T.AnimationMixer(template);for(const clip of gltf.animations){mixer.stopAllAction();mixer.clipAction(clip).reset().play();mixer.update(.25);for(const n of Object.values(rig.nodes))assert([...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray()].every(Number.isFinite));}mixer.stopAllAction();mixer.uncacheRoot(template);
   const a=cloneArt(template),b=cloneArt(template);let invalid=0;b.root.traverse(o=>o.geometry?.addEventListener('dispose',()=>invalid++));b.materials.forEach(m=>m.addEventListener('dispose',()=>invalid++));disposeArt(a);assert.equal(invalid,0);disposeArt(b);
  }
 });
 for(const [p,h]of Object.entries(entry.sourceHashes||{}))assert.equal(sha(await readFile(new URL('../'+p,import.meta.url))),h,entry.role+' source '+p);
}
test('new types: repeated native disposal releases split hatch and every owned material exactly once',()=>{
 for(const type of Object.keys(ROSTER_UNITS))for(let i=0;i<8;i++){const g=createEnemyModel(type,offline),ms=g.userData.ownedMaterials;assert.equal(ms.length,new Set(ms).size);let count=0;ms.forEach(m=>m.addEventListener('dispose',()=>count++));dispose(g);assert.equal(count,ms.length);}
});
await mkdir('.tools/qa-enemy-roster',{recursive:true});await writeFile('.tools/qa-enemy-roster/node-results.json',JSON.stringify({passed,rays,assets:registry.total,checks},null,2)+'\n');console.log(JSON.stringify({passed,rays,assets:registry.total},null,2));
